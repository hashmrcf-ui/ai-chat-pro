
import { supabase } from './supabase';

export interface AppConfig {
    key: string;
    value: string;
    description?: string;
}

// Cache the system prompt to reduce DB hits (optional, simple in-memory for now)
let cachedSystemPrompt: string | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getSystemPrompt(): Promise<string> {
    const now = Date.now();
    if (cachedSystemPrompt && (now - lastFetchTime < CACHE_TTL)) {
        return cachedSystemPrompt;
    }

    try {
        const { data, error } = await supabase
            .from('app_config')
            .select('value')
            .eq('key', 'system_prompt')
            .single();

        if (error || !data) {
            console.warn('Failed to fetch system prompt, using default.', error);
            // Default system prompt
            return 'أنت مساعد ذكي وتسمى Vibe AI. تتحدث العربية بطلاقة. هدفك مساعدة المستخدم بأفضل شكل ممكن.';
        }

        cachedSystemPrompt = data.value;
        lastFetchTime = now;
        return data.value;
    } catch (err) {
        console.error('Unexpected error fetching system prompt:', err);
        return 'أنت مساعد ذكي وتسمى Vibe AI. تتحدث العربية بطلاقة.';
    }
}

export async function updateSystemPrompt(newPrompt: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('app_config')
            .upsert({
                key: 'system_prompt',
                value: newPrompt,
                description: 'The system prompt for the AI assistant.'
            });

        if (error) {
            console.error('Error updating system prompt:', error);
            return false;
        }

        cachedSystemPrompt = newPrompt; // Update cache immediately
        return true;
    } catch (err) {
        console.error('Unexpected error updating system prompt:', err);
        return false;
    }
}
