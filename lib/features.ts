export const features = {
    ai: {
        // The primary model to use. If this fails, the system will try the others in order.
        models: [
            // === TOP 3 PAID (Verified Working) ===
            'anthropic/claude-3.5-sonnet',             // #1 Latest Claude 3.5 Sonnet
            'openai/gpt-4o',                           // #2 GPT-4 Omni
            'google/gemini-pro-1.5',                   // #3 Gemini 1.5 Pro

            // === FREE MODELS (Expanded List) ===
            'google/gemini-2.0-flash-001:free',        // #1 Gemini 2.0 Flash (Fastest Free)
            'meta-llama/llama-3.1-405b-instruct:free', // #2 Llama 3.1 405B (Smartest Free)
            'qwen/qwen-2.5-72b-instruct:free',         // #3 Qwen 2.5 72B (Best Coding Free)
        ],
        // If true, shows detailed error messages to the user.
        debugMode: true,
    },
    voice: {
        enabled: true,
        autoPlay: false,
        lang: 'ar-SA', // Default to Arabic for this user
        interimResults: false, // Prevent "echo" duplication bug
    },
    images: {
        enabled: true,
        provider: 'kei', // Future: 'dalle' | 'midjourney'
    }
};

export const getModel = (index: number = 0) => {
    return features.ai.models[index] || features.ai.models[0];
};
