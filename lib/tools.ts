
import { tool } from 'ai';
import { z } from 'zod';

export const getTools = () => ({
    searchShopping: tool({
        description: 'Find products, prices, and shopping deals in Saudi Arabia.',
        parameters: z.object({
            query: z.string().describe('Product name or category to search for'),
            country: z.string().optional().describe('Country code (default: sa)'),
        }),
        execute: async ({ query, country = 'sa' }) => {
            console.log(`[MOCK MODE] Searching for: ${query}`);

            // --- MOCK DATA FOR DEBUGGING ---
            return {
                source: 'Mocked SerpApi Debugger',
                shopping_results: [
                    {
                        title: `MOCK RESULT: ${query}`,
                        price: "SAR 1,234.00",
                        source: "Debug Store",
                        link: "https://google.com",
                        thumbnail: "https://via.placeholder.com/150",
                        rating: 5.0,
                        reviews: 999
                    },
                    {
                        title: "iPhone 17 Pro Max (Virtual)",
                        price: "SAR 5,500.00",
                        source: "Virtual Shop",
                        link: "https://apple.com",
                        thumbnail: "https://via.placeholder.com/150",
                        rating: 4.8,
                        reviews: 120
                    }
                ]
            };

            /* REAL IMPLEMENTATION (DISABLED):
            const apiKey = process.env.SERPER_API_KEY || process.env.SERPAPI_API_KEY;
            // ... (Your previous code would be here)
            */
        },
    }),

    // Placeholder for vision tool (commented out for now)
    // analyzeImage: ...
});
