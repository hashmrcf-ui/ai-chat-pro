import { tool } from 'ai';
import { z } from 'zod';
import { features } from './features';

export const getTools = (userId?: string) => {
    const tools: any = {};

    // 1. Image Generation Tool
    if (features.images.enabled) {
        tools.generateImage = tool({
            description: 'Generate an image based on a prompt. Use this to create assets for the website (hero backgrounds, logos, etc).',
            parameters: z.object({
                prompt: z.string().describe('The prompt to generate an image from'),
            }),
            execute: async ({ prompt }: { prompt: string }) => {
                console.log(`[Tool] generateImage: "${prompt}"`);
                try {
                    const { generateKEIImageAndWait } = await import('./kei-generation');
                    const imageUrl = await generateKEIImageAndWait({
                        model: 'flux-kontext',
                        prompt: prompt
                    });
                    return { success: true, url: imageUrl, prompt };
                } catch (error: any) {
                    console.error(`[Tool] Image Failed: ${error.message}`);
                    return { success: false, error: error.message };
                }
            },
        } as any);
    }

    // 2. Web Search Tool (Real-time with Tavily)
    tools.searchWeb = tool({
        description: 'Use this tool to search the web for current information, news, or products.',
        parameters: z.object({
            query: z.string().describe('The search query'),
        }),
        execute: async ({ query }: { query: string }) => {
            console.log(`[Tool] searchWeb: "${query}"`);
            try {
                const apiKey = process.env.TAVILY_API_KEY;
                if (!apiKey) return { success: false, error: "Configuration Error: Missing TAVILY_API_KEY" };

                const response = await fetch("https://api.tavily.com/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        api_key: apiKey,
                        query: query,
                        search_depth: "basic",
                        include_answer: true,
                        max_results: 3
                    })
                });

                if (!response.ok) throw new Error(`Tavily API error: ${response.statusText}`);

                const data = await response.json();
                const results = data.results.map((r: any) => `- [${r.title}](${r.url}): ${r.content}`).join('\n');

                return {
                    success: true,
                    result: `[Search Results]:\n${results}\n\n[Summary]: ${data.answer || 'No direct summary.'}`,
                };

            } catch (error: any) {
                console.error("[Tool] Search failed:", error);
                return { success: false, error: "Web search failed. Please try again." };
            }
        }
    } as any);

    // 3. Website Generator Tool
    tools.generateWebsite = tool({
        description: 'Generate website code. Use only when the design is complete.',
        parameters: z.object({
            html: z.string().describe('The complete HTML code.'),
            files: z.array(z.object({
                name: z.string(),
                content: z.string(),
                type: z.enum(['file', 'folder'])
            })).optional(),
            summary: z.string().describe('Summary of the generated site.')
        }),
        execute: async ({ summary }: { summary: string }) => {
            console.log(`[Tool] generateWebsite: "${summary}"`);
            return { success: true, message: "Website code generated successfully." };
        }
    } as any);

    // 4. Memory Tool
    tools.updateMemories = tool({
        description: 'Save important user facts or preferences for future recall.',
        parameters: z.object({
            memories: z.array(z.object({
                content: z.string().describe('The fact to remember'),
                importance: z.number().min(1).max(10).default(5)
            }))
        }),
        execute: async ({ memories }: { memories: any[] }) => {
            if (!userId) return { success: false, error: "No user ID provided for memory storage." };

            console.log(`[Tool] updateMemories: ${memories.length} facts`);
            try {
                const { createClient } = await import('@/lib/supabase-server');
                const supabase = await createClient();
                const { saveMemory } = await import('./memories');

                for (const m of memories) {
                    await saveMemory(userId, m.content, m.importance, supabase);
                }
                return { success: true, message: "Memories saved successfully." };
            } catch (error: any) {
                console.error(`[Tool] Memory Failed: ${error.message}`);
                return { success: false, error: error.message };
            }
        }
    } as any);

    // 5. Shopping Tool
    tools.processOrder = tool({
        description: 'Process a shopping order and route to the nearest store.',
        parameters: z.object({
            productName: z.string().describe('Product name'),
            isFake: z.boolean().optional()
        }),
        execute: async ({ productName, isFake }: { productName: string, isFake?: boolean }) => {
            console.log(`[Tool] processOrder: "${productName}"`);
            try {
                const { processShoppingOrder } = await import('./shopping');
                const result = await processShoppingOrder({ productName, userId: userId || '', isFake });
                return result.success
                    ? { success: true, message: `Order for ${productName} routed to ${result.storeName} (${result.distance}km).` }
                    : { success: false, error: result.error };
            } catch (error: any) {
                console.error(`[Tool] Shopping Failed: ${error.message}`);
                return { success: false, error: error.message };
            }
        },
    } as any);

    return tools;
};
