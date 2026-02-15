export const features = {
    ai: {
        // The primary model to use. If this fails, the system will try the others in order.
        models: [
            // === PAID: SUPER INTELLIGENCE ===
            'minimax/minimax-m2.5',            // #1 Best Programming & Productivity
            'z-ai/glm-5',                      // #2 High-End Reasoning & Search Optimization (GLM-5)
            'deepseek/deepseek-r1',            // #3 Deep Reasoning

            // === PAID: STANDARD ===
            'anthropic/claude-3.5-sonnet',     // Reliable All-rounder

            // === FREE: HIGH PERFORMANCE ===
            'arcee-ai/trinity-large-preview:free', // Optimized for coding & reasoning
            'stepfun/step-3.5-flash:free',         // Fast, efficient search assistant
            'z-ai/glm-4.5-air:free',               // Lightweight, great for quick queries

            // === OTHER FREE OPTIONS ===
            'deepseek/deepseek-r1:free',
            'meta-llama/llama-3.3-70b-instruct:free',
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
