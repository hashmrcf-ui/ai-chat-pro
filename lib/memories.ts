import { supabase as defaultSupabase } from './supabase';

/**
 * Saves a new memory for a user.
 * Now accepts an optional supabase client to support RLS/Server-side sessions.
 */
export async function saveMemory(userId: string, content: string, importance: number = 1, supabaseClient: any = defaultSupabase): Promise<boolean> {
    try {
        console.log(`[Memory] Attempting to save memory for user ${userId}: "${content.substring(0, 30)}..."`);
        const { error } = await supabaseClient
            .from('user_memories')
            .insert({
                user_id: userId,
                content,
                importance
            });

        if (error) {
            console.error('[Memory] Save Error:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[Memory] Unexpected Error:', err);
        return false;
    }
}

/**
 * Fetches the most important memories for a user.
 */
export async function getTopMemories(userId: string, limit: number = 15, supabaseClient: any = defaultSupabase): Promise<string[]> {
    try {
        const { data, error } = await supabaseClient
            .from('user_memories')
            .select('content')
            .eq('user_id', userId)
            .order('importance', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error || !data) {
            console.error('[Memory] Fetch Error:', error);
            return [];
        }

        console.log(`[Memory] Successfully fetched ${data.length} memories for user ${userId}`);
        return data.map((m: any) => m.content);
    } catch (err) {
        console.error('[Memory] Unexpected Fetch Error:', err);
        return [];
    }
}
