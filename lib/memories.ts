
import { supabase } from './supabase';

export interface Memory {
    id: string;
    content: string;
    importance: number;
    created_at: string;
}

/**
 * Saves a new memory for a user.
 */
export async function saveMemory(userId: string, content: string, importance: number = 1): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('user_memories')
            .insert({
                user_id: userId,
                content,
                importance
            });

        if (error) {
            console.error('Error saving memory:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Unexpected error saving memory:', err);
        return false;
    }
}

/**
 * Fetches the most important memories for a user.
 */
export async function getTopMemories(userId: string, limit: number = 10): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('user_memories')
            .select('content')
            .eq('user_id', userId)
            .order('importance', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error || !data) {
            console.error('Error fetching memories:', error);
            return [];
        }

        return data.map(m => m.content);
    } catch (err) {
        console.error('Unexpected error fetching memories:', err);
        return [];
    }
}
