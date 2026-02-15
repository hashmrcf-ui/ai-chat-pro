import { streamText, tool } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { features, getModel } from '../../../lib/features';

// Allow streaming responses up to 30 seconds
// Allow streaming responses up to 5 minutes for complex reasoning/coding tasks
export const maxDuration = 60;

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    headers: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Chat Pro',
    }
});

const ollama = createOpenAI({
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama',
});

const customModel = (modelName: string) => {
    // If model has :free suffix or contains '/', use OpenRouter
    if (modelName.includes(':free') || modelName.includes('/')) {
        return openrouter(modelName);
    }
    // Fallback for local models (llama3, etc.)
    return ollama(modelName);
};

export async function POST(req: Request) {
    const time = new Date().toISOString();
    const logFile = path.join(process.cwd(), 'debug-memory.log');
    const log = (msg: string) => {
        try {
            const entry = `[${new Date().toISOString()}] ${msg}\n`;
            fs.appendFileSync(logFile, entry);
            console.log(msg);
        } catch (e) {
            console.error('Logging failed', e);
        }
    };

    try {
        log(`POST /api/chat called`);
        log(`API Key Present: ${!!process.env.OPENROUTER_API_KEY}`);
        const { messages, model, userId, activeMode } = await req.json(); // Cleaned: extracted userId if sent
        const lastMessage = messages[messages.length - 1]?.content || '';

        console.log(`[${time}] Received ${messages.length} messages. Model: ${model}. Mode: ${activeMode}. Last: ${lastMessage.substring(0, 50)}...`);

        // ... existing security check ...
        const { checkContent, logSecurityEvent } = await import('../../../lib/security');
        const securityResult = checkContent(lastMessage);

        if (securityResult.flagged) {
            console.warn(`[SECURITY ALERT] Flagged content: ${securityResult.violationType}. Logging to admin.`);
            logSecurityEvent(userId, lastMessage, securityResult);
        }

        // --- INTELLIGENCE-AWARE ROUTING ---
        const lastMessageContent = lastMessage;
        const isComplexTask = /code|برمج|صمم|خطط|تحليل|build|design|create|plan|architecture/i.test(lastMessageContent);

        let targetModel = model || features.ai.models[0];

        if (isComplexTask && !model) {
            log(`Detected complex task. Prioritizing premium models.`);
            targetModel = 'anthropic/claude-3.5-sonnet';
        }

        const modelQueue = [targetModel, ...features.ai.models.filter(m => m !== targetModel)];
        // ------------------------------------

        // 1. GET CONTEXT (System Prompt & Memories)
        const { getSystemPrompt } = await import('../../../lib/config');
        const { getTopMemories } = await import('../../../lib/memories');
        const { createClient } = await import('../../../lib/supabase-server');

        const supabaseClient = await createClient();
        let basePrompt = await getSystemPrompt();

        // Mode-Specific Force Instructions
        if (activeMode === 'search') {
            basePrompt += `\n[CRITICAL]: أنت الآن في وضع "البحث المباشر".
1. يمنع منعاً باتاً كتابة أي نص مقدمة (مثل: سأبحث لك، أو جارٍ البحث).
2. يجب أن تبدأ استجابتك فوراً باستدعاء أداة 'searchWeb'.
3. لا تجب من ذاكرتك أبداً.
إذا كتبت نصاً قبل الأداة، فإنك تفشل في المهمة.`;
        } else if (activeMode === 'shopping') {
            basePrompt += `\n[CRITICAL]: أنت الآن في وضع "مساعد المشتريات". ابدأ فوراً باستدعاء أداة 'processOrder' دون أي نص تمهيدي.`;
        }

        // Fetch long-term memories if user is logged in
        if (userId) {
            const memories = await getTopMemories(userId, 15, supabaseClient);
            if (memories.length > 0) {
                const memoryContext = `\n[ذاكرة المستخدم طويلة الأمد]:\n${memories.map((m, i) => `${i + 1}. ${m}`).join('\n')}`;
                basePrompt += memoryContext;
            }
        }

        let lastError = null;

        for (const modelName of modelQueue) {
            try {
                const { getTools } = await import('@/lib/tools');
                const allTools = getTools(userId);

                // --- Tool Filtering & Selection ---
                // We provide only the relevant tool to maximize stability and prevent model confusion
                let tools: any = {};
                let toolChoice: any = 'auto';

                if (activeMode === 'search') {
                    tools = { searchWeb: allTools.searchWeb };
                    toolChoice = { type: 'tool', toolName: 'searchWeb' };
                } else if (activeMode === 'shopping') {
                    tools = { processOrder: allTools.processOrder };
                    toolChoice = { type: 'tool', toolName: 'processOrder' };
                } else {
                    tools = allTools; // Full intelligence in normal chat
                }

                console.log(`[${time}] Model: ${modelName} | Mode: ${activeMode} | ToolChoice: ${JSON.stringify(toolChoice)}`);

                const result = streamText({
                    model: customModel(modelName),
                    system: basePrompt,
                    messages,
                    maxSteps: 5,
                    tools,
                    toolChoice,
                    temperature: (activeMode === 'search' || activeMode === 'shopping') ? 0 : 0.7,
                    onStepFinish(event: any) {
                        console.log(`[${time}] [${modelName}] Step Finish. Tools: ${event.toolCalls?.length || 0}`);
                    },
                    onFinish(event: any) {
                        const called = event.toolCalls?.map((tc: any) => tc.toolName).join(', ');
                        if (called) console.log(`[${modelName}] FINAL TOOL CALLS: ${called}`);
                    },
                } as any);

                return (result as any).toDataStreamResponse();

            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                log(`Model ${modelName} FAILED: ${errorMsg}`);
                lastError = error;
                // Continue to next model in loop
                continue;
            }
        }

        // If loop finishes, all models failed
        throw lastError || new Error("All configured models failed to initialize.");

    } catch (error) {
        console.error(`[${time}]FATAL ERROR(All models failed): ${error}`);

        const { resolveSafetyError } = await import('../../../lib/security');
        const rawErrorMessage = error instanceof Error ? error.message : String(error);
        const politeMessage = resolveSafetyError(rawErrorMessage);

        if (politeMessage !== rawErrorMessage) {
            // It was a safety block
            return new Response(JSON.stringify({ error: politeMessage }), { status: 400 });
        }

        return new Response(JSON.stringify({ error: 'System Overload: All AI models are currently unavailable. Please try again later.' }), { status: 503 });
    }
}
"// force update" 
