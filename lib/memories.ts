
import { supabase as defaultSupabase } from './supabase';
import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const MEMORY_MODEL = 'gemini-2.0-flash-001';

// Schema for Memory Extraction
const MemoryExtractionSchema = z.object({
    facts: z.array(z.string()).describe("Single sentence facts about user preferences, life, or work."),
    importance: z.array(z.number()).describe("Importance score 1-10 for each fact.")
});

/**
 * Intelligent Memory Extraction
 * Uses an LLM to analyze the latest conversation turn and extract purely factual/preferential info.
 */
export async function extractAndSaveMemories(userId: string, lastUserMessage: string, lastAssistantMessage: string, supabaseClient: any = defaultSupabase) {
    if (!lastUserMessage || lastUserMessage.length < 5) return;

    try {
        const result = await generateObject({
            model: openrouter(MEMORY_MODEL),
            schema: MemoryExtractionSchema,
            system: `You are a Memory Manager. Extract permanent facts about the user from the conversation.
            Ignore short transactional queries like "hi", "thanks".
            Focus on: 
            - Personal details (Name, Job, Location).
            - Preferences (Likes dark mode, coding style, specific tools).
            - Projects (Working on X app).
            
            Return empty arrays if nothing worth remembering.`,
            prompt: `User: ${lastUserMessage}\nAI: ${lastAssistantMessage}`
        });

        const { facts, importance } = result.object;

        if (facts.length > 0) {
            console.log(`[Memory Agent] Extracting ${facts.length} new memories...`);
            // Batch insert
            const rows = facts.map((fact, i) => ({
                user_id: userId,
                content: fact,
                importance: importance[i] || 1
            }));

            const { error } = await supabaseClient.from('user_memories').insert(rows);
            if (error) console.error('[Memory Agent] Insert Error:', error);
        }

    } catch (e) {
        console.error('[Memory Agent] Extraction Failed:', e);
    }
}

/**
 * Semantic Memory Retrieval (RAG-lite)
 * In a real app, this would use vector embeddings. 
 * For now, we stick to "Recent + Important" heuristic which is effective for simple context.
 */
export async function getContextualMemories(userId: string, query: string, supabaseClient: any = defaultSupabase): Promise<string[]> {
    // Current simple implementation: Get standard top memories
    // Future upgrade: Add embedding search here
    return getTopMemories(userId, 10, supabaseClient);
}

export async function saveMemory(userId: string, content: string, importance: number = 1, supabaseClient: any = defaultSupabase): Promise<boolean> {
    // Legacy wrapper, but better to use extractAndSaveMemories for automatic handling
    try {
        const { error } = await supabaseClient.from('user_memories').insert({ user_id: userId, content, importance });
        return !error;
    } catch (e) { return false; }
}

export async function getTopMemories(userId: string, limit: number = 15, supabaseClient: any = defaultSupabase): Promise<string[]> {
    try {
        const { data } = await supabaseClient
            .from('user_memories')
            .select('content')
            .eq('user_id', userId)
            .order('importance', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit);
        return data?.map((m: any) => m.content) || [];
    } catch (e) { return []; }
}
