
import { tool } from 'ai';
import { z } from 'zod';

export const getTools = () => tools;

export const tools = {
    searchShopping: tool({
        description: 'Find products, prices, and shopping deals in Saudi Arabia.',
        parameters: z.object({
            query: z.string().describe('Product name or category to search for'),
            country: z.string().optional().describe('Country code (default: sa)'),
        }),
        execute: async ({ query, country }: { query: string; country?: string }) => {
            // Apply default country if not provided
            const effectiveCountry = country || 'sa';
            console.log(`[MOCK MODE] Searching for: ${query} in ${effectiveCountry}`);

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
        },
    }),
};
