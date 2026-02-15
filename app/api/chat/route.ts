import { streamText, tool } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { features, getModel } from '../../../lib/features';
import { getTools } from '../../../lib/tools';
import { getSystemPrompt } from '../../../lib/config';
import { getTopMemories } from '../../../lib/memories';
import { createClient } from '../../../lib/supabase-server';
import { checkContent, logSecurityEvent, resolveSafetyError } from '../../../lib/security';

// Allow streaming responses up to 5 minutes for complex reasoning/coding tasks
export const maxDuration = 300;

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    headers: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Vibe AI Pro',
    }
});

const ollama = createOpenAI({
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama',
});

const customModel = (modelName: string) => {
    // If model has :free suffix or contains '/', use OpenRouter (default for cloud models)
    if (modelName.includes(':free') || modelName.includes('/') || !modelName.includes('llama')) {
        return openrouter(modelName);
    }
    // Fallback for purely local models if configured
    return ollama(modelName);
};

export async function POST(req: Request) {
    const time = new Date().toISOString();

    try {
        const { messages, model, userId, activeMode } = await req.json();
        const lastMessage = messages[messages.length - 1]?.content || '';

        console.log(`[${time}] Request: ${activeMode} | Model: ${model || 'Default'} | MsgLen: ${lastMessage.length}`);

        // 1. Security Check
        const securityResult = checkContent(lastMessage);
        if (securityResult.flagged) {
            console.warn(`[SECURITY] Flagged: ${securityResult.violationType}`);
            logSecurityEvent(userId, lastMessage, securityResult);
            // We can choose to block or just log. For now, we proceed but log it.
        }

        // 2. Context & Memories
        const supabaseClient = await createClient();
        let basePrompt = await getSystemPrompt();

        // Add User Memories
        if (userId) {
            const memories = await getTopMemories(userId, 10, supabaseClient);
            if (memories?.length > 0) {
                basePrompt += `\n[Context from Memory]:\n${memories.map(m => `- ${m}`).join('\n')}`;
            }
        }

        // Mode-Specific Instructions
        if (activeMode === 'search') {
            basePrompt += `\n[Instruction]: You have access to real-time web search. Use 'searchWeb' tool when the user asks for current events, news, or specific information not in your training data. IMPORTANT: After using the search tool, you MUST generate a comprehensive response to the user based on the search results. Do NOT stop after the tool call.`;
        }

        // 3. Model Selection
        // Use requested model, or fall back to the first available high-quality model
        const selectedModel = model || features.ai.models[0];

        // 4. Tools Setup
        const tools = getTools(userId);

        // 5. Execution
        const result = streamText({
            model: customModel(selectedModel),
            system: basePrompt,
            messages,
            // @ts-ignore
            maxSteps: 10, // Allow multi-step reasoning (Search -> Read -> Answer)
            tools,
            toolChoice: 'auto',
            temperature: 0.7, // Balanced creativity
            onStepFinish({ toolCalls, toolResults }) {
                if (toolCalls && toolCalls.length > 0) {
                    console.log(`[${time}] Tool Executed: ${toolCalls.map(t => t.toolName).join(', ')}`);
                }
            },
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error(`[${time}] Server Error:`, error);

        // Handle specific errors
        if (error.message?.includes('Safety')) {
            return new Response(JSON.stringify({ error: resolveSafetyError(error.message) }), { status: 400 });
        }

        return new Response(JSON.stringify({
            error: 'System is currently busy or experiencing high traffic. Please try again in a moment.'
        }), { status: 503 });
    }
}
