import { createClient } from '../supabase-server'; // Correct path
import { embed, generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { UserMemoryProfile, MemoryContext, ConversationSummary, MemoryItem } from './types';

// Initialize AI Provider
const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
// Use a standard embedding model compatible with pgvector (1536 dims)
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';

export class MemoryManager {
    private supabase: any; // Allow any client type (admin or regular)

    constructor(supabaseClient?: any) {
        // If client is provided, use it. Otherwise, create a new server client.
        this.supabase = supabaseClient;
    }

    // Ensure client is initialized before use (Async Factory Pattern)
    private async getClient() {
        if (!this.supabase) {
            this.supabase = await createClient();
        }
        return this.supabase;
    }

    // --- 1. CORE: RETRIEVAL ---
    /**
     * Main entry point: Get ALL relevant context for a user message
     */
    async retrieveContext(userId: string, currentMessage: string): Promise<MemoryContext> {
        const client = await this.getClient();
        console.time('MemoryRetrieval');

        // A. Embed Current Message (Once)
        // In a real high-throughput system, this would be cached or done by a worker
        const { embedding } = await embed({
            model: openrouter.embedding(EMBEDDING_MODEL),
            value: currentMessage,
        });

        // P1: Fetch Quick Profile (Fastest)
        const profilePromise = this.getProfile(userId);

        // P2: Semantic Search - Summaries
        // We use a safe try-catch to not break the chat if RPC fails
        const summariesPromise = client.rpc('match_conversation_summaries', {
            query_embedding: embedding,
            match_threshold: 0.65,
            match_count: 3,
            filter_conversation_id: null
        }).then((res: any) => res.data || []).catch((e: any) => {
            console.warn('RPC match_conversation_summaries failed', e);
            return [];
        });

        // P3: Semantic Search - Items
        const itemsPromise = client.rpc('match_memory_items', {
            query_embedding: embedding,
            match_threshold: 0.70,
            match_count: 5,
            p_user_id: userId
        }).then((res: any) => res.data || []).catch((e: any) => {
            console.warn('RPC match_memory_items failed', e);
            return [];
        });

        // Execute Parallel
        const [profile, summaries, items] = await Promise.all([
            profilePromise,
            summariesPromise,
            itemsPromise
        ]);

        console.timeEnd('MemoryRetrieval');

        return {
            profile,
            relevantSummaries: summaries,
            relevantItems: items,
            recentMessages: []
        };
    }

    // --- 2. MANAGER: PROFILE ---
    /**
     * Get User Profile with Fallback using Upsert logic to ensure a profile always exists
     */
    async getProfile(userId: string): Promise<UserMemoryProfile> {
        const client = await this.getClient();

        const { data, error } = await client
            .from('user_memory')
            .select('profile_json')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            // Return Empty Default
            return { facts: [], preferences: {}, constraints: [], decisions: [] };
        }
        return data.profile_json;
    }

    async updateProfile(userId: string, updates: Partial<UserMemoryProfile>) {
        const client = await this.getClient();
        const current = await this.getProfile(userId);

        // Merge logic
        const newProfile = {
            ...current,
            // Append unique items only
            facts: Array.from(new Set([...(current.facts || []), ...(updates.facts || [])])),
            constraints: Array.from(new Set([...(current.constraints || []), ...(updates.constraints || [])])),
            decisions: Array.from(new Set([...(current.decisions || []), ...(updates.decisions || [])])),
            // Merge preferences (new overwrites old)
            preferences: { ...current.preferences, ...updates.preferences }
        };

        const { error } = await client
            .from('user_memory')
            .upsert({ user_id: userId, profile_json: newProfile, last_updated: new Date().toISOString() }, { onConflict: 'user_id' });

        if (error) console.error('Profile Update Failed:', error);
    }

    // --- 3. WRITER: MEMORY CREATION (BACKGROUND) ---
    /**
     * Analyzes an interaction and updates long-term memory.
     * Should be called AFTER sending response (Fire & Forget).
     */
    // --- 3. WRITER: MEMORY CREATION (ROBUST & RICH RAW DATA) ---
    async processInteraction(userId: string, userMsg: string, aiMsg: string) {
        console.log('[Memory] Starting extraction process...');

        const ExtractionSchema = z.object({
            intent: z.string().describe("User's immediate goal (e.g., 'asking for help', 'teaching AI', 'chit-chat')"),
            sentiment: z.enum(['positive', 'neutral', 'negative', 'frustrated']).describe("User's emotional state"),
            entities: z.array(z.string()).describe("Important proper nouns mentioned (Names, Places, Tech stacks)"),
            facts: z.array(z.string()).describe("Long-term facts about the user"),
            preferences: z.record(z.string(), z.string()).describe("User preferences (language, style, forbidden topics)"),
            constraints: z.array(z.string()).optional(),
            decisions: z.array(z.string()).describe("Decisions agreed upon in this conversation"),
        });

        try {
            // 1. Generate Extraction
            const result = await generateObject({
                model: openrouter('google/gemini-2.0-flash-001'),
                schema: ExtractionSchema,
                prompt: `Analyze this interaction. Provide a RAW, deep breakdown.
        User: ${userMsg}
        AI: ${aiMsg}
        
        CRITICAL RULES:
        1. Capture the INTENT and SENTIMENT accurately.
        2. Extract ENTITIES (People, Companies, Tools).
        3. If the user explicitly states their name (e.g., "I am X"), extract it as a FACT.
        4. Be aggressive in capturing preferences.`
            });

            const object = result.object;
            console.log('[Memory] Extracted Raw:', object);

            // 2. Normalize and Check
            const hasUpdates =
                (object.facts && object.facts.length > 0) ||
                (object.constraints && object.constraints.length > 0) ||
                (object.decisions && object.decisions.length > 0) ||
                (object.preferences && Object.keys(object.preferences).length > 0);

            if (hasUpdates) {
                console.log('[Memory] Updates found, writing to DB...');

                // 3. Update Profile (Await this to ensure persistence)
                await this.updateProfile(userId, {
                    facts: object.facts || [],
                    preferences: object.preferences || {},
                    constraints: object.constraints || [],
                    decisions: object.decisions || []
                });
                console.log('[Memory] ✅ DB Write Complete.');
            } else {
                console.log('[Memory] No durable info found to save.');
            }

        } catch (e) {
            console.error('[Memory] ❌ Extraction Failed:', e);
        }
    }
}
