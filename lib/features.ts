export const features = {
    ai: {
        // The primary model to use. If this fails, the system will try the others in order.
        models: [
            // === TOP 3 PAID (Verified Working) ===
            'anthropic/claude-3.5-sonnet',             // #1 Latest Claude 3.5 Sonnet
            'openai/gpt-4o',                           // #2 GPT-4 Omni
            'google/gemini-pro-1.5',                   // #3 Gemini 1.5 Pro

            // === FREE MODELS (OpenRouter - Verified Working) ===
            'meta-llama/llama-3.3-70b-instruct:free',          // #1 Llama 3.3 (Most Reliable Free Model)
            'google/gemma-3-27b-it:free',                      // #2 Gemma 3 (Latest & Fast)

            // === FREE MODELS (Backup / Busy) ===
            // 'mistralai/mistral-small-3.1-24b-instruct:free',   // Removed due to instability
            // 'deepseek/deepseek-r1:free',                       // Removed due to instability

            // === LOCAL MODELS (Ollama) ===
            // 'llama3.2',
            // 'deepseek-r1',
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
