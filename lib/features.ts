export const features = {
    ai: {
        // The primary model to use. If this fails, the system will try the others in order.
        models: [
            // === TOP 3 PAID (Verified Working) ===
            'anthropic/claude-sonnet-4.5',             // #1 Latest Claude (Verified)
            'openai/gpt-4o',                           // #2 GPT-4 Omni (Verified)
            'google/gemini-2.0-pro-exp-02-05',         // #3 Gemini Pro (Verified)

            // === FREE MODELS (Expanded List) ===
            'deepseek/deepseek-r1:free',               // DeepSeek R1 (Free)
            'z-ai/glm-4.5-air:free',                   // Z.AI GLM 4.5 Air (Free)
            'xiaomi/mimo-v2-flash:free',               // Xiaomi MiMo V2 Flash (Free)
            'google/gemini-2.0-flash-001:free',        // Gemini Flash (Free)
            'meta-llama/llama-3.3-70b-instruct:free',  // Llama 3.3 (Free)
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
