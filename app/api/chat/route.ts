import { streamText, tool } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { features, getModel } from '../../../lib/features';

// Allow streaming responses up to 30 seconds
// Allow streaming responses up to 5 minutes for complex reasoning/coding tasks
export const maxDuration = 3000;

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
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
    const logFile = path.join(process.cwd(), 'server-debug.log');
    const time = new Date().toISOString();

    try {
        fs.appendFileSync(logFile, `\n[${time}] POST /api/chat called (Fallback Logic)\n`);
        const { messages, model } = await req.json();
        const lastMessage = messages[messages.length - 1]?.content || 'unknown';
        fs.appendFileSync(logFile, `[${time}] Received ${messages.length} messages. Model: ${model}. Last: ${lastMessage}\n`);

        // Use requested model or default to the first one
        const targetModel = model || features.ai.models[0];

        // Create a priority list: [RequestedModel, ...Others]
        const modelQueue = [targetModel, ...features.ai.models.filter(m => m !== targetModel)];

        let lastError = null;

        for (const modelName of modelQueue) {
            try {
                fs.appendFileSync(logFile, `[${time}] Attempting model: ${modelName}\n`);

                const result = streamText({
                    model: customModel(modelName),
                    messages,
                    maxSteps: 10, // Enable multi-step agent behavior (Research -> Build)
                    // Dynamic tools loading based on features config
                    tools: (await import('../../../lib/tools')).getTools(),
                    onChunk(event) {
                        if (event.chunk.type === 'text-delta') {
                            const text = event.chunk.text || '';
                            const preview = text.replace(/\n/g, '\\n').substring(0, 50);
                            fs.appendFileSync(logFile, `[${time}] [${modelName}] Chunk: "${preview}"\n`);
                        }
                    },
                    onFinish(event) {
                        const tokens = event.usage?.completionTokens ?? event.usage?.outputTokens ?? 'N/A';
                        fs.appendFileSync(logFile, `[${time}] [${modelName}] Stream finished. Tokens: ${tokens}. Reason: ${event.finishReason}\n`);
                    },
                    onError(error) {
                        const errorObj = error instanceof Error ? { message: error.message, stack: error.stack, name: error.name } : error;
                        fs.appendFileSync(logFile, `[${time}] [${modelName}] Stream ERROR: ${JSON.stringify(errorObj, null, 2)}\n`);
                    },
                });

                fs.appendFileSync(logFile, `[${time}] Model ${modelName} initialized successfully. Returning stream.\n`);
                return result.toTextStreamResponse();

            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                fs.appendFileSync(logFile, `[${time}] Model ${modelName} FAILED to initialize: ${errorMsg}\n`);
                lastError = error;
                // Continue to next model in loop
                continue;
            }
        }

        // If loop finishes, all models failed
        throw lastError || new Error("All configured models failed to initialize.");

    } catch (error) {
        fs.appendFileSync(logFile, `[${time}] FATAL ERROR (All models failed): ${error}\n`);
        return new Response(JSON.stringify({ error: 'System Overload: All AI models are currently unavailable. Please try again later.' }), { status: 503 });
    }
}
