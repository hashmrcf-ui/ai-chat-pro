
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
            // Default system prompt - Expert Strategist Persona
            return `أنت Vibe AI، المساعد الاستراتيجي والذكي الأكثر تطوراً.
شخصيتك: تمزج بين دقة المهندس، إبداع المصمم، وبلاغة الأديب.
تعليمات العمل:
1. التحليل أولاً: قبل الرد على أي طلب معقد، قم بتحليل المتطلبات في "Chain of Thought" داخلية.
2. الجودة فوق كل شيء: قدم حلولاً مبتكرة، عميقة، ومكتملة. لا تكتفِ بالإجابات السطحية.
3. اللغة: العربية هي لغتك الرائدة. استخدم لغة عربية فصيحة، بيضاء، قوية، وجذابة.
4. التفرد: أنت لست مجرد واجهة برمجة، أنت شريك ذكي للمستخدم، تتوقع احتياجاته وتقترح عليه ما وراء الطلب الحالي.
5. الذاكرة الذكية: استخدم أداة "updateMemories" فوراً عندما يخبرك المستخدم بأمر هام عن تفضيلاته أو هويته لضمان تذكرها في المحادثات القادمة.
أنت الآن في وضع "الذكاء الفائق"، انطلب!`;
        }

        cachedSystemPrompt = data.value;
        lastFetchTime = now;
        return data.value;
    } catch (err) {
        console.error('Unexpected error fetching system prompt:', err);
        return 'أنت Vibe AI، المساعد الذكي والخبير الاستراتيجي. تتحدث العربية الفصيحة ببراعة تامة وتساعد المستخدمين بحلول مبتكرة وعميقة.';
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

export async function getAppConfig(key: string, defaultValue: string = ''): Promise<string> {
    const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', key)
        .single();

    if (error || !data) return defaultValue;
    return data.value;
}

export async function updateAppConfig(key: string, value: string): Promise<boolean> {
    const { error } = await supabase
        .from('app_config')
        .upsert({ key, value })
        .select();

    if (error) {
        console.error(`Error updating config ${key}:`, error);
        return false;
    }
    return true;
}

export interface AppFeatures {
    voiceEnabled: boolean;
    imagesEnabled: boolean;
    registrationEnabled: boolean;
    defaultLanguage: string;
}

export async function getAppFeatures(): Promise<AppFeatures> {
    const [voice, images, reg, lang] = await Promise.all([
        getAppConfig('feature_voice_enabled', 'true'),
        getAppConfig('feature_image_generation_enabled', 'true'),
        getAppConfig('public_registration_enabled', 'true'),
        getAppConfig('system_language', 'ar-SA')
    ]);

    return {
        voiceEnabled: voice === 'true',
        imagesEnabled: images === 'true',
        registrationEnabled: reg === 'true',
        defaultLanguage: lang
    };
}

