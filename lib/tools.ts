
import { tool } from 'ai';
import { z } from 'zod';

// Define schema externally for better inference
const searchSchema = z.object({
    query: z.string().describe('Product name or category to search for'),
    country: z.string().optional().describe('Country code (default: sa)'),
});

type SearchArgs = z.infer<typeof searchSchema>;

const toolsMap = {
    searchShopping: tool({
        description: 'Find products, prices, and shopping deals in Saudi Arabia.',
        parameters: searchSchema,
        execute: async (rawArgs: unknown) => {
            const args = rawArgs as SearchArgs;
            const effectiveCountry = args.country || 'sa';
            console.log(`[MOCK MODE] Searching for: ${args.query} in ${effectiveCountry}`);

            return {
                source: 'Mocked SerpApi Debugger',
                shopping_results: [
                    {
                        title: `MOCK RESULT: ${args.query}`,
                        price: "SAR 1,234.00",
                        source: "Debug Store",
                        link: "https://google.com",
                        thumbnail: "https://via.placeholder.com/150",
                        rating: 5.0,
                        reviews: 999
                    }
                ]
            };
        },
    }),
};

export const getTools = () => toolsMap;
export const tools = toolsMap;
