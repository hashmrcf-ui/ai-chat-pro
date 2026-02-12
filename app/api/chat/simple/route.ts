import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { features } from '@/lib/features';

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
        const { messages, model } = await req.json();
        const targetModel = model || features.ai.models[0];

        const result = await generateText({
            model: customModel(targetModel),
            messages,
        });

        return Response.json({
            content: result.text,
            model: targetModel,
        });

    } catch (error) {
        console.error('Chat error:', error);
        return Response.json({
            content: 'عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.',
            error: true,
        }, { status: 500 });
    }
}
