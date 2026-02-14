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
    const logFile = path.join(process.cwd(), 'server-debug.log');
    const log = (msg: string) => {
        // fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`); // Disabled for production
        console.log(msg);
    };

    try {
        log(`POST /api/chat called`);
        log(`API Key Present: ${!!process.env.OPENROUTER_API_KEY}`);
        const { messages, model, userId } = await req.json(); // Cleaned: extracted userId if sent
        const lastMessage = messages[messages.length - 1]?.content || '';

        console.log(`[${time}] Received ${messages.length} messages. Model: ${model}. Last: ${lastMessage.substring(0, 50)}...`);

        // --- SECURITY CHECK (Silent Logging) ---
        const { checkContent, logSecurityEvent } = await import('../../../lib/security');
        const securityResult = checkContent(lastMessage);

        if (securityResult.flagged) {
            console.warn(`[SECURITY ALERT] Flagged content: ${securityResult.violationType}. Logging to admin.`);
            // Log the event asynchronously
            logSecurityEvent(userId, lastMessage, securityResult);
            // We do NOT return a 400 error anymore, allowing the AI to handle it.
        }
        // ----------------------

        // --- INTELLIGENCE-AWARE ROUTING ---
        const lastMessageContent = lastMessage;
        const isComplexTask = /code|برمج|صمم|خطط|تحليل|build|design|create|plan|architecture/i.test(lastMessageContent);

        // Ensure requested model is used, but if it's a complex task and no specific model was requested, 
        // try to prioritize the strongest ones.
        let targetModel = model || features.ai.models[0];

        if (isComplexTask && !model) {
            log(`Detected complex task. Prioritizing premium models.`);
            targetModel = 'anthropic/claude-3.5-sonnet'; // Force elite model for complex tasks if not specified
        }

        // Create a priority list: [RequestedModel/Elite, ...Others]
        const modelQueue = [targetModel, ...features.ai.models.filter(m => m !== targetModel)];
        // ------------------------------------

        // 1. GET CONTEXT (System Prompt & Memories)
        const { getSystemPrompt } = await import('../../../lib/config');
        const { getTopMemories } = await import('../../../lib/memories');
        const { createClient } = await import('../../../lib/supabase-server');

        const supabaseClient = await createClient();
        let basePrompt = await getSystemPrompt();

        // Fetch long-term memories if user is logged in
        if (userId) {
            const memories = await getTopMemories(userId, 15, supabaseClient);
            if (memories.length > 0) {
                const memoryContext = `\n[ذاكرة المستخدم طويلة الأمد]:\n${memories.map((m, i) => `${i + 1}. ${m}`).join('\n')}\nاستخدم هذه الحقائق لتخصيص ردودك وجعلها أكثر ذكاءً وتناسباً مع المستخدم.`;
                basePrompt += memoryContext;
            }
        }

        let lastError = null;

        for (const modelName of modelQueue) {
            try {
                const { createClient } = await import('../../../lib/supabase-server');
                const supabaseClient = await createClient();

                const result = streamText({
                    model: customModel(modelName),
                    system: basePrompt,
                    messages,
                    maxSteps: 5, // Crucial for tools to work correctly
                    // Dynamic tools loading based on features config
                    tools: (await import('../../../lib/tools')).getTools(userId),
                    onChunk(event: any) {
                        if (event.chunk.type === 'text-delta') {
                            const text = (event.chunk as any).text || '';
                            const preview = text.replace(/\n/g, '\\n').substring(0, 50);
                            log(`[${modelName}] Chunk: "${preview}"`);
                        }
                    },
                    onFinish(event: any) {
                        const usage = event.usage as any;
                        const tokens = usage?.completionTokens ?? usage?.outputTokens ?? usage?.totalTokens ?? 'N/A';
                        console.log(`[${time}] [${modelName}] Stream finished. Tokens: ${tokens}. Reason: ${event.finishReason}`);
                    },
                    onError(error: any) {
                        const errorObj = error instanceof Error ? { message: error.message, stack: error.stack, name: error.name } : error;
                        log(`[${modelName}] Stream ERROR: ${JSON.stringify(errorObj)}`);
                    },
                } as any);

                console.log(`[${time}] Model ${modelName} initialized successfully. Returning stream.`);
                return result.toTextStreamResponse();

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
        console.error(`[${time}] FATAL ERROR (All models failed): ${error}`);

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
