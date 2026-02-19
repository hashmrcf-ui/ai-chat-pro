
import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { features } from '../../../lib/features';
import { getTools } from '../../../lib/tools';
import { getSystemPrompt } from '../../../lib/config';
import { getTopMemories } from '../../../lib/memories';
import { createClient } from '../../../lib/supabase-server';
import { checkContent, logSecurityEvent, resolveSafetyError } from '../../../lib/security';

export const maxDuration = 300;

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY });

function getModelProvider(modelName: string) {
    return openrouter(modelName);
}

export async function POST(req: Request) {
    try {
        const { messages, model, userId, activeMode } = await req.json();
        const lastMessage = messages[messages.length - 1]?.content || '';

        // 1. Auth & Client Init
        const supabase = await createClient();
        const { MemorySystemBridge } = await import('../../../lib/memory/bridge');
        const memorySystem = new MemorySystemBridge(supabase);

        // 2. Pre-LLM Raw Logging (Archive everything)
        if (userId && lastMessage) {
            await memorySystem.logRawMessage(userId, 'user', lastMessage);
        }

        let basePrompt = await getSystemPrompt();
        let contextBlock = '';

        // 3. Retrieval Pipeline (Conditional on opt-in)
        if (userId) {
            try {
                const profile = await memorySystem.getProfile(userId);

                if (profile.memory_opt_in) {
                    // 1. Semantic Search (Vector)
                    const relevantMemories = await memorySystem.searchMemories(userId, lastMessage, 8);

                    // 2. Recent Raw Transcript (Short-term Archive)
                    const transcript = await memorySystem.getRecentTranscript(userId, 10);

                    // 3. Context Injection (Using the smart helper)
                    contextBlock = await memorySystem.buildMemoryContext(profile, relevantMemories, transcript);
                }
            } catch (e) {
                console.warn("[Vibe Pipeline] Retrieval Error:", e);
            }
        }

        // 4. Prompt Composition
        const selectedModelInput = model || features.ai.models[0];
        let selectedModel = selectedModelInput;

        // Vibe Controller Logic
        if (selectedModel === 'vibe-ai-007') {
            selectedModel = 'google/gemini-2.0-flash-001';
            basePrompt += `\n\n### MODE: VIBE AI CONTROLLER ###\n`;
            basePrompt += `You are Vibe AI, the Central Intelligence Orchestrator.\n`;
            basePrompt += `IMPORTANT: Read the [USER IDENTITY] section below. If the Primary Name is "Guest", it means you don't know the user's name yet—ASK for it politely. Do NOT call the user "Manager" as a name.\n`;
            basePrompt += `Use the [RECENT ARCHIVE TRANSCRIPT] to maintain absolute continuity.\n`;
        }

        const fullSystemPrompt = `${basePrompt}\n\n${contextBlock}\n\n### DYNAMIC CONTEXT ###\nYou are an intelligent Agent. Be proactive, helpful, and respect the user's identity and preferences stored above.`;

        // 5. LLM Call & Streaming
        const result = await streamText({
            model: getModelProvider(selectedModel),
            system: fullSystemPrompt,
            messages,
            maxSteps: 5,
            tools: getTools(),
            toolChoice: 'auto',
            temperature: 0.5,
            onFinish: async (c) => {
                if (userId && c.text) {
                    // 6. Post-LLM Pipeline (Async)

                    // a) Log Assistant Response
                    await memorySystem.logRawMessage(userId, 'assistant', c.text);

                    // b) Memory Gate (Extract facts/prefs)
                    await memorySystem.extractAndSave(userId, lastMessage, c.text);

                    // c) Periodic Summary Trigger (Approx every 10 messages)
                    if (messages.length > 0 && messages.length % 10 === 0) {
                        console.log(`[Vibe Pipeline] Triggering periodic summary for user ${userId}`);
                        await memorySystem.saveConversationSummary(userId, messages.concat([{ role: 'assistant', content: c.text }]));
                    }
                }
            }
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Error' }), { status: 500 });
    }
}
