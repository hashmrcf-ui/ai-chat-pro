'use server';

import { createClient } from '@/lib/supabase-server';
import { MemorySystem } from '@/lib/memory-system';

/**
 * Server Action to fetch recent memories for the UI sidebar
 */
export async function getMemoriesAction(userId: string) {
    if (!userId) return [];

    const supabase = await createClient();
    const memorySystem = new MemorySystem(supabase);

    try {
        // Fetch all recent memories (Facts + Preferences + Summaries)
        const { data, error } = await supabase
            .from('memory_items')
            .select('text, type, importance')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        // Return structured strings for the simple sidebar
        return data.map((m: any) => m.text) || [];
    } catch (error) {
        console.error('Failed to fetch memories:', error);
        return [];
    }
}

/**
 * Server Action to manually add a memory
 */
export async function addMemoryAction(userId: string, content: string) {
    if (!userId || !content) return false;

    const supabase = await createClient();
    const memorySystem = new MemorySystem(supabase);

    try {
        // We use the new extraction logic even for manual entries to ensure embedding and hash-dedup
        await memorySystem.extractAndSave(userId, `Manual Entry: ${content}`, "Confirmed.");
        return true;
    } catch (error) {
        console.error('Failed to save memory:', error);
        return false;
    }
}
