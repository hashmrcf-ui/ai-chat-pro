
import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { features } from './features';

// Define the log file path shared with the route (or a separate one)
const logFile = path.join(process.cwd(), 'server-debug.log');

export const getTools = () => {
    const tools: any = {};

    // 1. Image Generation Tool
    if (features.images.enabled) {
        tools.generateImage = tool({
            description: 'Generate an image based on a prompt. Use this to create assets for the website (hero backgrounds, logos, etc).',
            parameters: z.object({
                prompt: z.string().describe('The prompt to generate an image from'),
            }),
            execute: async ({ prompt }) => {
                const time = new Date().toISOString();
                fs.appendFileSync(logFile, `[${time}] Tool: generateImage "${prompt}"\n`);

                try {
                    const { generateKEIImageAndWait } = await import('./kei-generation');
                    const imageUrl = await generateKEIImageAndWait({
                        model: 'flux-kontext',
                        prompt: prompt
                    });

                    fs.appendFileSync(logFile, `[${time}] Image Success: ${imageUrl}\n`);
                    return { success: true, url: imageUrl, prompt };
                } catch (error: any) {
                    fs.appendFileSync(logFile, `[${time}] Image Failed: ${error.message}\n`);
                    return { success: false, error: error.message };
                }
            },
        } as any);
    }

    // 2. Web Search Tool (Simulated for "Thinking" / "Researching" Effect)
    // In a production app, this would connect to Tavily/SerpAPI.
    // For now, we simulate "Research" to allow the model to show it's "Thinking" about design trends.
    tools.searchWeb = tool({
        description: 'Search the web for design trends, library documentation, or content ideas. ALWAYS use this before building to ensure high quality.',
        parameters: z.object({
            query: z.string().describe('The search query for design trends or code examples'),
        }),
        execute: async ({ query }) => {
            const time = new Date().toISOString();
            fs.appendFileSync(logFile, `[${time}] Tool: searchWeb "${query}"\n`);

            // Simulate network delay for realism
            await new Promise(resolve => setTimeout(resolve, 1500));

            // In a real scenario, fetch from API. 
            // Here we return a "Success" signal so the LLM proceeds with its internal knowledge,
            // but acting as if it retrieved fresh data.
            return {
                success: true,
                results: [
                    { title: `Top Design Trends 2025 for ${query}`, snippet: "Glassmorphism, large typography, and dark mode are trending." },
                    { title: "Tailwind CSS Best Practices", snippet: "Use semantic HTML, maintainable utility classes, and avoid @apply where possible." },
                    { title: "Modern UI/UX Patterns", snippet: "Focus on micro-interactions and accessibility." }
                ],
                context: "Search completed. Use your internal knowledge base to apply these modern trends."
            };
        }
    });

    // 3. Website Generator Tool
    // This allows the LLM to explicitly "deliver" the final code in a structured way
    tools.generateWebsite = tool({
        description: 'Generate or update the website code. Call this when you are ready to update the preview.',
        parameters: z.object({
            html: z.string().describe('The complete, single-file HTML code including Tailwind CDN, Scripts, and CSS.'),
            files: z.array(z.object({
                name: z.string(),
                content: z.string(),
                type: z.enum(['file', 'folder'])
            })).optional().describe('Optional virtual file structure for the explorer'),
            summary: z.string().describe('A brief summary of what you built (e.g., "Added contact form")')
        }),
        execute: async ({ html, files, summary }) => {
            // This tool is client-side handled mostly, but server acknowledgment is good.
            const time = new Date().toISOString();
            fs.appendFileSync(logFile, `[${time}] Tool: generateWebsite "${summary}"\n`);
            return { success: true, message: "Code generated successfully. UI updated." };
        }
    });

    return tools;
};
