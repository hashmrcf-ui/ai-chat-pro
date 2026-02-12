import { createOpenAI } from '@ai-sdk/openai';

// Create OpenRouter provider instance
const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});

// Create Standard OpenAI provider instance
const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Default to OpenRouter if key exists, otherwise OpenAI
const provider = process.env.OPENROUTER_API_KEY ? openrouter : openai;

export const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

export const customModel = (model: string) => {
    return provider(model);
};
