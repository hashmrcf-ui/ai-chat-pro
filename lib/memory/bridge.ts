
import { MemoryManager } from './manager';

// Old Interface Compatibility
export interface OldUserProfile {
    user_id: string;
    display_name: string;
    language: string;
    tone: string;
    memory_opt_in: boolean;
}

/**
 * Bridge Class: Adapts the new Scalable MemoryManager to the old MemorySystem API.
 * This ensures the app doesn't crash while switching architectures.
 */
export class MemorySystemBridge {
    private manager: MemoryManager;
    private supabase: any;

    constructor(supabaseClient: any) {
        this.supabase = supabaseClient;
        this.manager = new MemoryManager(supabaseClient);
    }

    // --- 1. Hybrid Profile Adapter (Nuclear Robustness ☢️) ---
    async getProfile(userId: string): Promise<OldUserProfile> {
        // A. Fetch from NEW system
        const newProfile = await this.manager.getProfile(userId);
        let resolvedName = newProfile.preferences['display_name'] || 'Guest';

        // B. Fetch from OLD system (Fallback)
        // We ALWAYS check the old DB just in case the new one is empty
        const { data: oldData } = await this.supabase
            .from('user_profile')
            .select('*')
            .eq('user_id', userId)
            .single();

        // Logic: If new system says "Guest" but old system has a real name, USE THE OLD NAME
        // and immediately heal the new system.
        if (resolvedName === 'Guest' && oldData?.display_name && oldData.display_name !== 'Guest') {
            console.warn(`[MemoryBridge] Found name "${oldData.display_name}" in OLD DB. Migrating to NEW DB...`);
            resolvedName = oldData.display_name;

            // Auto-Heal: Port it to the new system permanently
            await this.manager.updateProfile(userId, {
                preferences: { ...newProfile.preferences, display_name: resolvedName },
                facts: [`User's name is ${resolvedName}`]
            });
        }

        // C. Extra Name Extraction Heuristics (if still Guest)
        if (resolvedName === 'Guest') {
            const nameFact = newProfile.facts.find(f => f.toLowerCase().includes('name is') || f.includes('اسمي'));
            if (nameFact) resolvedName = nameFact.split(/is|:/).pop()?.trim() || resolvedName;
        }

        return {
            user_id: userId,
            display_name: resolvedName,
            language: newProfile.preferences['language'] || (oldData?.language || 'ar'),
            tone: newProfile.preferences['tone'] || (oldData?.tone || 'helpful'),
            memory_opt_in: true
        };
    }

    // --- 2. Logging (Pass-through) ---
    async logRawMessage(userId: string, role: string, content: string, metadata: any = {}) {
        // We still use the old raw messages table for the transcript/history UI
        const { error } = await this.supabase.from('messages').insert({
            user_id: userId, role, content, metadata
        });
        if (error) console.error('[Bridge] Log Error:', error);
    }

    // --- 3. Transcript (Pass-through) ---
    async getRecentTranscript(userId: string, limit = 10) {
        const { data } = await this.supabase
            .from('messages')
            .select('role, content')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        return data ? data.reverse().map((m: any) => `${m.role === 'user' ? 'USER' : 'AI'}: ${m.content}`).join('\n') : '';
    }

    // --- 4. Search Adapter (The Heavy Lifter) ---
    async searchMemories(userId: string, query: string, limit = 5) {
        // We use the manager's context retrieval but only return the ITEMS part to match old signature
        // Note: usage of 'retrieveContext' here is slightly inefficient (fetches profile again) 
        // but safe for avoiding race conditions.
        const ctx = await this.manager.retrieveContext(userId, query);

        // Map to old 'MemoryItemRow' shape if needed, or just a compatible object
        return [
            ...ctx.relevantItems.map(item => ({
                type: item.type,
                text: item.text,
                importance: item.weight
            })),
            ...ctx.relevantSummaries.map(s => ({
                type: 'summary',
                text: s.summary_text,
                importance: 1.0
            }))
        ];
    }

    // --- 5. Context Builder (The Stringifier - Golden Anchor Edition ⚓) ---
    async buildMemoryContext(profile: OldUserProfile, memories: any[], transcript: string) {
        // Re-construct the prompt block expected by the prompt engineering in route.ts
        const memBlock = memories.length > 0
            ? memories.map((m: any) => `- [${m.type.toUpperCase()}] ${m.text}`).join('\n')
            : '- (No relevant long-term memories found)';

        // ⚓ The Golden Anchor: Explicit Instruction for Identity
        let rangeInstruction = '';
        if (profile.display_name && profile.display_name !== 'Guest') {
            rangeInstruction = `\n\n!!! CRITICAL IDENTITY INSTRUCTION !!!\nUser's Name: "${profile.display_name}"\nStart the conversation by welcoming them by name. If their title is known (e.g. Engineer), use "Bashmohandes ${profile.display_name}".`;
        }

        return `[USER PROFILE]\nName: ${profile.display_name}\nLanguage: ${profile.language}\nPreferences: ${profile.tone}\n${rangeInstruction}\n\n[RELEVANT LONG-TERM MEMORY]\n${memBlock}\n\n[RECENT CONVERSATION TRANSCRIPT]\n${transcript}`;
    }

    // --- 6. Extraction (The Update Loop) ---
    async extractAndSave(userId: string, userMessage: string, aiResponse: string) {
        // This is the key switch: We use the NEW background processor
        // It creates "User Memory" and "Facts" in the new tables
        await this.manager.processInteraction(userId, userMessage, aiResponse);
    }

    // --- 7. Summaries Stub ---
    async saveConversationSummary(userId: string, messages: any[]) {
        // The new architecture handles this differently (via background jobs or periodic workers).
        // For MVP, we can rely on 'processInteraction' to catch major facts.
        // We leave this empty to disable the OLD summary system.
    }
}
