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

        // --- SECURITY CHECK ---
        const { checkContent, logSecurityEvent } = await import('../../../lib/security');
        const securityResult = checkContent(lastMessage);

        if (securityResult.flagged) {
            console.warn(`[SECURITY] Blocked content: ${securityResult.violationType}`);
            // Log the event asynchronously (don't await to keep response fast, or do await if critical)
            await logSecurityEvent(userId, lastMessage, securityResult);
            
            return new Response(JSON.stringify({ 
                error: 'Security Alert: Your message contains prohibited content. This event has been logged.' 
            }), { status: 400 });
        }
        // ----------------------

        // Use requested model or default to the first one
        const targetModel = model || features.ai.models[0];

        // Create a priority list: [RequestedModel, ...Others]
        const modelQueue = [targetModel, ...features.ai.models.filter(m => m !== targetModel)];

        let lastError = null;

        for (const modelName of modelQueue) {
            try {
                log(`Attempting model: ${modelName}`);

                const result = streamText({
                    model: customModel(modelName),
                    messages,
                    // Dynamic tools loading based on features config
                    tools: (await import('../../../lib/tools')).getTools(),
                    onChunk(event) {
                        if (event.chunk.type === 'text-delta') {
                            const text = event.chunk.text || '';
                            const preview = text.replace(/\n/g, '\\n').substring(0, 50);
                            log(`[${modelName}] Chunk: "${preview}"`);
                        }
                    },
                    onFinish(event) {
                        const usage = event.usage as any;
                        const tokens = usage?.completionTokens ?? usage?.outputTokens ?? 'N/A';
                        console.log(`[${time}] [${modelName}] Stream finished. Tokens: ${tokens}. Reason: ${event.finishReason}`);
                    },
                    onError(error) {
                        const errorObj = error instanceof Error ? { message: error.message, stack: error.stack, name: error.name } : error;
                        log(`[${modelName}] Stream ERROR: ${JSON.stringify(errorObj)}`);
                    },
                });

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
        return new Response(JSON.stringify({ error: 'System Overload: All AI models are currently unavailable. Please try again later.' }), { status: 503 });
    }
}
"// force update" 
