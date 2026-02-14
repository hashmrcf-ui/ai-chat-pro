import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { features } from '@/lib/features';
import { getSystemPrompt } from '@/lib/config';
import { getTopMemories } from '@/lib/memories';
import { checkContent, logSecurityEvent } from '@/lib/security';
import { getActiveModels } from '@/lib/models';

export const maxDuration = 60;

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

const ollama = createOpenAI({
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama',
});

const customModel = (modelName: string) => {
    if (modelName.includes(':free') || modelName.includes('/')) {
        return openrouter(modelName);
    }
    return ollama(modelName);
};

export async function POST(req: Request) {
    try {
        const { messages, model, userId } = await req.json();

        // Dynamic Model Selection
        const activeModels = await getActiveModels();
        // Fallback to DB default if exists, otherwise first active, otherwise features default
        const dbDefault = activeModels.find(m => m.is_default)?.model_id;
        const fallback = dbDefault || activeModels[0]?.model_id || features.ai.models[0];

        // Ensure requested model is actually active, else use fallback
        const isRequestedActive = activeModels.some(m => m.model_id === model);
        const targetModel = (model && isRequestedActive) ? model : fallback;

        // 1. SECURITY CHECK (Silent Logging)
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
            const securityResult = checkContent(lastMessage.content);
            if (securityResult.flagged) {
                // Log the event, but do not stop the execution
                logSecurityEvent(userId, lastMessage.content, securityResult).catch(err => console.error('Silent log failed:', err));
                console.log(`[SECURITY ALERT] Admin notified of potential violation: ${securityResult.violationType}`);
            }
        }

        // 1. GET CONTEXT (System Prompt & Memories)
        let basePrompt = await getSystemPrompt();

        // Fetch long-term memories if user is logged in
        const memories = await getTopMemories(userId);
        if (memories.length > 0) {
            const memoryContext = `\n[ذاكرة المستخدم طويلة الأمد]:\n${memories.map((m, i) => `${i + 1}. ${m}`).join('\n')}\nاستخدم هذه الحقائق لتخصيص ردودك وجعلها أكثر ذكاءً وتناسباً مع المستخدم.`;
            basePrompt += memoryContext;
        }

        const systemMessage = {
            role: 'system',
            content: basePrompt
        };

        const result = await generateText({
            model: customModel(targetModel),
            system: systemMessage.content, // Use system prompt parameter
            messages,
        });

        return Response.json({
            content: result.text,
            model: targetModel,
        });

    } catch (error) {
        console.error('Chat error:', error);

        // Return exactly what happened (even if it's a provider block) 
        // to stay transparent and not interfere with AI's own responses.
        const errorMessage = error instanceof Error ? error.message : 'عذراً، تعذر الحصول على رد من الذكاء الاصطناعي.';

        return Response.json({
            content: errorMessage,
            error: true,
        });
    }
}
