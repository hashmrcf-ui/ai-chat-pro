
import { tool } from 'ai';
import { z } from 'zod';
// import * as fs from 'fs';
import * as path from 'path';
import { features } from './features';

// Define the log file path shared with the route (or a separate one)
// const logFile = path.join(process.cwd(), 'server-debug.log');

export const getTools = () => {
    const tools: any = {};

    // 1. Image Generation Tool
    if (features.images.enabled) {
        tools.generateImage = tool({
            description: 'Generate an image based on a prompt. Use this to create assets for the website (hero backgrounds, logos, etc).',
            parameters: z.object({
                prompt: z.string().describe('The prompt to generate an image from'),
            }),
            execute: async ({ prompt }: { prompt: string }) => {
                const time = new Date().toISOString();
                console.log(`[${time}] Tool: generateImage "${prompt}"`);

                try {
                    const { generateKEIImageAndWait } = await import('./kei-generation');
                    const imageUrl = await generateKEIImageAndWait({
                        model: 'flux-kontext',
                        prompt: prompt
                    });

                    console.log(`[${time}] Image Success: ${imageUrl}`);
                    return { success: true, url: imageUrl, prompt };
                } catch (error: any) {
                    console.error(`[${time}] Image Failed: ${error.message}`);
                    return { success: false, error: error.message };
                }
            },
        } as any);
    }

    // 2. Web Search Tool (High-Intelligence Simulation)
    tools.searchWeb = tool({
        description: 'استخدم هذه الأداة للبحث عن أحدث صيحات التصميم، المكتبات البرمجية، أو الأفكار الإبداعية. يجب استخدامها كمرحلة "بحث وتقصي" قبل تقديم أي حل نهائي لضمان التفوق البرمجي والجمالي.',
        parameters: z.object({
            query: z.string().describe('The search query for design trends or code examples'),
        }),
        execute: async ({ query }: { query: string }) => {
            const time = new Date().toISOString();
            console.log(`[${time}] Tool: searchWeb "${query}"`);

            await new Promise(resolve => setTimeout(resolve, 1500));

            return {
                success: true,
                results: [
                    { title: `أحدث صيحات التصميم 2025 لـ ${query}`, snippet: "التركيز على واجهات الـ Glassmorphism المعقدة، التفاعلات الدقيقة (Micro-interactions)، والوضع المظلم الفاخر." },
                    { title: "أفضل ممارسات Tailwind CSS", snippet: "استخدام Tailwind للتصاميم المتجاوبة، الالتزام بمعايير الـ UI/UX الحديثة، وربط العناصر بحركات انسيابية." },
                    { title: "أنماط تجربة المستخدم الحديثة", snippet: "التركيز على سهولة الوصول (Accessibility) والسرعة الفائقة في العرض." }
                ],
                context: "اكتمل البحث. استخدم هذه المعلومات لتقديم حل يفوق توقعات المستخدم ويجمع بين القوة التقنية والجمال البصري."
            };
        }
    } as any);

    // 3. Website Generator Tool (Professional Delivery)
    tools.generateWebsite = tool({
        description: 'الأداة النهائية لتوليد كود الموقع. استخدمها فقط بعد التأكد من اكتمال التصميم ودمج كل العناصر الفنية والجمالية لجعل الواجهة "مذهلة" (WOW effect).',
        parameters: z.object({
            html: z.string().describe('The complete, single-file HTML code including Tailwind CDN, Scripts, and CSS.'),
            files: z.array(z.object({
                name: z.string(),
                content: z.string(),
                type: z.enum(['file', 'folder'])
            })).optional().describe('Optional virtual file structure for the explorer'),
            summary: z.string().describe('ملخص احترافي لما تم بناؤه بأسلوب جذاب.')
        }),
        execute: async ({ html, files, summary }: { html: string, files?: any[], summary: string }) => {
            const time = new Date().toISOString();
            console.log(`[${time}] Tool: generateWebsite "${summary}"`);
            return { success: true, message: "تم توليد الكود بنجاح. الواجهة جاهزة للعرض الفوري." };
        }
    } as any);

    return tools;
};
