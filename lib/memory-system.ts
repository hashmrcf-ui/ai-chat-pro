// @ts-nocheck
import crypto from 'crypto';
import { generateObject, embed, embedMany, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';



type MemoryType = 'fact' | 'preference' | 'decision' | 'summary';

interface MemoryItemRow {
    id: string;
    user_id: string;
    type: MemoryType;
    text: string;
    tags?: string[];
    importance: number;
    content_hash: string;
    created_at: string;
    last_used_at?: string | null;
    embedding?: number[];
}

interface UserProfile {
    user_id: string;
    display_name: string;
    language: string;
    tone: string;
    format_prefs: Record<string, any>;
    constraints: Record<string, any>;
    memory_opt_in: boolean;
}

const MemoryGateSchema = z.object({
    items: z.array(z.object({
        type: z.enum(['fact', 'preference', 'decision', 'summary']),
        text: z.string().min(2),
        importance: z.number().min(1).max(10).default(5),
        tags: z.array(z.string()).optional()
    })).default([]),
    profile_updates: z.object({
        display_name: z.string().optional(),
        language: z.string().optional(),
        tone: z.string().optional(),
    }).optional()
});

const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Fallback for embeddings if OpenAI key is missing (Using OpenRouter)
const openrouterOpenAI = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    name: 'openrouter-openai-compatible'
});

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

// Helper to get embedding model
function getEmbeddingModel() {
    if (process.env.OPENAI_API_KEY) {
        return openai.embedding('text-embedding-3-small');
    }
    // Use OpenRouter for embeddings
    return openrouterOpenAI.embedding('openai/text-embedding-3-small');
}

const hash = (s: string) =>
    crypto.createHash('sha256').update(s).digest('hex');

export class MemorySystem {
    private supabase: any;
    private embeddingModel = getEmbeddingModel();

    constructor(supabaseClient: any) {
        this.supabase = supabaseClient;
    }

    /**
     * Get/Init User Profile
     */
    async getProfile(userId: string): Promise<UserProfile> {
        const { data, error } = await this.supabase
            .from('user_profile')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            const defaults: UserProfile = {
                user_id: userId,
                display_name: 'Guest', // Using 'Guest' as a clear placeholder
                language: 'ar',
                tone: 'helpful',
                format_prefs: {},
                constraints: {},
                memory_opt_in: true
            };
            await this.supabase.from('user_profile').insert(defaults);
            return defaults;
        }
        return data;
    }

    /**
     * Log Raw Message (Archive)
     */
    async logRawMessage(userId: string, role: 'user' | 'assistant', content: string, metadata: any = {}) {
        if (!userId) return;
        const { error } = await this.supabase
            .from('messages')
            .insert({
                user_id: userId,
                role,
                content,
                metadata
            });
        if (error) console.error('[Memory] Raw Log Error:', error);
    }

    /**
     * Get Recent Summaries for Context
     */
    async getRecentSummaries(userId: string, limit = 2): Promise<string[]> {
        const { data, error } = await this.supabase
            .from('memory_items')
            .select('text')
            .eq('user_id', userId)
            .eq('type', 'summary')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error || !data) return [];
        return data.map((d: any) => d.text);
    }

    /**
     * Semantic Search (RAG) + Global Importance Fetch
     */
    async searchMemories(userId: string, query: string, limit = 8): Promise<MemoryItemRow[]> {
        const profile = await this.getProfile(userId);
        if (!profile.memory_opt_in) {
            return [];
        }

        // 1. Semantic Search (Vector)
        let vectorData: any[] = [];
        try {
            const { embedding } = await embed({
                model: this.embeddingModel,
                value: query,
            });

            const { data, error } = await this.supabase.rpc('match_memories', {
                p_user_id: userId,
                query_embedding: embedding,
                match_threshold: 0.4,
                match_count: limit,
            });

            if (error) console.error('[Memory] Vector Match Error:', error);
            if (data) vectorData = data;

        } catch (embedError) {
            console.error('[Memory] Embedding Generation Failed (Falling back to global fetch):', embedError);
            // Continue execution to at least return globalData
        }

        // 2. Global Importance Fetch (Always get the most important stuff)
        const { data: globalData, error: globalError } = await this.supabase
            .from('memory_items')
            .select('*')
            .eq('user_id', userId)
            .order('importance', { ascending: false })
            .limit(10); // Always fetch top 10 most important facts

        if (globalError) console.error('[Memory] Global Fetch Error:', globalError);

        // 3. Explicit Identity Fetch (Ensure we never forget the name)
        const { data: identityData } = await this.supabase
            .from('memory_items')
            .select('*')
            .eq('user_id', userId)
            .or('text.ilike.%name%,text.ilike.%اسم%,text.ilike.%identity%')
            .limit(3);

        // 4. Merge & Deduplicate
        const merged = [...vectorData, ...(globalData || []), ...(identityData || [])];
        const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());

        console.log(`[Memory] Context built: ${unique.length} items (${vectorData?.length || 0} semantic, ${globalData?.length || 0} global, ${identityData?.length || 0} identity).`);

        return unique;
    }

    /**
     * Get Recent Transcript (Raw Archive)
     */
    async getRecentTranscript(userId: string, limit = 10): Promise<string> {
        const { data, error } = await this.supabase
            .from('messages')
            .select('role, content')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error || !data) return '';
        return data
            .reverse()
            .map((m: any) => `${m.role === 'user' ? 'USER' : 'AI'}: ${m.content}`)
            .join('\n');
    }

    /**
     * Build Memory Context block to inject into prompt
     */
    async buildMemoryContext(profile: UserProfile, memories: MemoryItemRow[], transcript: string = '') {
        // Smart Identity: If name is generic, try to find it in memories
        let resolvedName = profile.display_name;
        if (resolvedName === 'Guest' || resolvedName === 'Manager' || resolvedName === 'User') {
            const nameMemory = memories.find(m =>
                m.text.includes('اسمي') ||
                m.text.includes('اسمي هو') ||
                m.text.toLowerCase().includes('my name is')
            );
            if (nameMemory) {
                // Heuristic to extract name from memory text
                const text = nameMemory.text;
                const nameMatch = text.match(/(اسمي|my name is)\s+([^\.]+)/i);
                if (nameMatch && nameMatch[2]) resolvedName = nameMatch[2].trim();
                else resolvedName = text.replace(/(اسمي|my name is)/i, '').trim();
            }
        }

        const profileBlock = [
            `[USER IDENTITY]`,
            `- Primary Name: ${resolvedName}`,
            `- Profile Setting: ${profile.display_name}`,
            `- Account UUID: ${profile.user_id}`,
            `- Preference: Language=${profile.language || 'ar'}, Tone=${profile.tone || 'helpful'}`,
        ].join('\n');

        const memBlock = memories.length
            ? `[SEMANTIC MEMORIES]\n${memories.map((m: any) => `- [${m.type}] ${m.text}`).join('\n')}`
            : `[SEMANTIC MEMORIES]\n- (Empty)`;

        const transcriptBlock = transcript
            ? `[RECENT ARCHIVE TRANSCRIPT]\n${transcript}`
            : `[RECENT ARCHIVE TRANSCRIPT]\n- (None)`;

        return `${profileBlock}\n\n${memBlock}\n\n${transcriptBlock}`;
    }

    /**
     * Memory Gate & Save (Write)
     * userMessage + aiResponse => extract stable memories => upsert into DB
     */
    async extractAndSave(userId: string, userMessage: string, aiResponse: string) {
        if (!userId) return;

        const profile = await this.getProfile(userId);
        if (!profile.memory_opt_in) return;

        try {
            const extraction = await generateObject({
                model: openrouter('google/gemini-2.0-flash-001'),
                schema: MemoryGateSchema,
                system: [
                    `You are the Memory Engine for Vibe AI.`,
                    `CRITICAL: CHECK FOR USER NAME.`,
                    `If the user says "I am X" or "My name is X" or "أنا محمد", you MUST return profile_updates: { display_name: "X" }.`,
                    `Extract long-term facts, user preferences, and KEY PROJECT DETAILS/DECISIONS.`,
                    `Ignore temporary context. Avoid guessing.`,
                ].join('\n'),
                prompt: `User: ${userMessage}\nAI: ${aiResponse}`
            });

            const { items, profile_updates } = extraction.object;

            // Update profile (structured)
            if (profile_updates && Object.keys(profile_updates).length > 0) {
                await this.supabase
                    .from('user_profile')
                    .update(profile_updates)
                    .eq('user_id', userId);
            }

            if (!items || items.length === 0) return;

            // Normalize + hash + embed
            const normalized = items
                .map((it: any) => ({
                    type: it.type as MemoryType,
                    text: String(it.text).trim(),
                    importance: Math.max(1, Math.min(10, Number(it.importance ?? 5))),
                    tags: Array.isArray(it.tags) ? it.tags.slice(0, 8) : [],
                }))
                .filter((it: any) => it.text.length >= 2);

            if (!normalized.length) return;

            const { embeddings } = await embedMany({
                model: this.embeddingModel,
                values: normalized.map((i: any) => i.text),
            });

            const rows = normalized.map((item: any, idx: number) => ({
                user_id: userId,
                type: item.type,
                text: item.text,
                importance: item.importance,
                tags: item.tags,
                embedding: embeddings[idx],
                content_hash: hash(`${item.type}|${item.text.toLowerCase()}`),
            }));

            // Upsert to avoid duplicates
            const { error } = await this.supabase
                .from('memory_items')
                .upsert(rows, { onConflict: 'user_id,content_hash' });

            if (error) {
                console.error('[Memory] Upsert Error:', error);
                // Fallback: try simple insert if upsert fails (though unique constraint should be there)
            } else {
                console.log(`[Memory] Successfully saved ${rows.length} memories.`);
            }

        } catch (e: any) {
            console.error('[Memory] Extraction/Saving Failed. Details:', e?.message || e);
        }
    }

    /**
     * Optional: Save periodic summary (call every N turns)
     */
    async saveConversationSummary(userId: string, lastMessages: { role: string; content: string }[]) {
        const profile = await this.getProfile(userId);
        if (!profile.memory_opt_in) return;

        const transcript = lastMessages
            .slice(-20)
            .map(m => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n');

        const summary = await generateText({
            model: openrouter('google/gemini-2.0-flash-001'),
            system: `Summarize the conversation into a compact memory for future retrieval. Focus on PROJECT MILESTONES, renaming details, and user goals. Keep it concise.`,
            prompt: transcript
        });

        const text = summary.text.trim();
        if (!text) return;

        const { embedding } = await embed({ model: this.embeddingModel, value: text });

        const row = {
            user_id: userId,
            type: 'summary' as const,
            text,
            importance: 6,
            tags: ['summary'],
            embedding,
            content_hash: hash(`summary|${text.toLowerCase()}`),
        };

        await this.supabase
            .from('memory_items')
            .upsert([row], { onConflict: 'user_id,content_hash' });
    }

    /**
     * Clear Memory
     */
    async clearMemory(userId: string) {
        await this.supabase.from('memory_items').delete().eq('user_id', userId);
        await this.supabase.from('user_profile').delete().eq('user_id', userId);
    }
}
