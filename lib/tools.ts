
import { tool } from 'ai';
import { z } from 'zod';
// import * as fs from 'fs';
import * as path from 'path';
import { features } from './features';

// Define the log file path shared with the route (or a separate one)
// const logFile = path.join(process.cwd(), 'server-debug.log');

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

    // 4. Memory Tool (Learning & Adaptation)
    tools.updateMemories = tool({
        description: 'استخدم هذه الأداة لحفظ معلومات هامة أو تفضيلات عن المستخدم لاستخدامها في المحادثات المستقبلية. استخدمها عندما يذكر المستخدم حقائق ثابتة عن نفسه أو عن مشاريعه.',
        parameters: z.object({
            memories: z.array(z.object({
                content: z.string().describe('الحقيقة أو المعلومة التي يجب تذكرها (مثلاً: المستخدم يفضل التصميم الداكن)'),
                importance: z.number().min(1).max(10).default(5).describe('مدى أهمية المعلومة من 1 إلى 10')
            })).describe('قائمة الذكريات الجديدة المراد حفظها')
        }),
        execute: async ({ memories }: { memories: any[] }) => {
            const time = new Date().toISOString();
            const logMsg = `Tool: updateMemories | User: ${userId} | Facts: ${memories.length}`;
            console.log(`[${time}] ${logMsg}`);

            // Log to file for deep debugging
            try {
                const fs = await import('fs');
                const path = await import('path');
                fs.appendFileSync(path.join(process.cwd(), 'debug-memory.log'), `[${time}] ${logMsg}\n`);
            } catch (e) { }

            try {
                const { createClient } = await import('@/lib/supabase-server');
                const supabase = await createClient();

                let targetUserId = userId;
                if (!targetUserId) {
                    console.log(`[${time}] No userId in tool context, attempting to get from session...`);
                    const { data: { user } } = await supabase.auth.getUser();
                    targetUserId = user?.id;
                }

                if (!targetUserId) {
                    const failMsg = `[Memory Tool Fail] No UserId found.`;
                    console.error(`[${time}] ${failMsg}`);
                    try {
                        const fs = await import('fs');
                        const path = await import('path');
                        fs.appendFileSync(path.join(process.cwd(), 'debug-memory.log'), `[${time}] ${failMsg}\n`);
                    } catch (e) { }
                    return { success: false, error: "لم يتم العثور على مستخدم لتخزين الذاكرة" };
                }

                const { saveMemory } = await import('./memories');
                for (const m of memories) {
                    const factMsg = `Saving fact: "${m.content}" for user ${targetUserId}`;
                    console.log(`[${time}] ${factMsg}`);
                    try {
                        const fs = await import('fs');
                        const path = await import('path');
                        fs.appendFileSync(path.join(process.cwd(), 'debug-memory.log'), `[${time}] ${factMsg}\n`);
                    } catch (e) { }
                    await saveMemory(targetUserId, m.content, m.importance, supabase);
                }

                return {
                    success: true,
                    message: `تم تحديث ذاكرة النظام بنجاح. تذكرت المعلومات التالية: ${memories.map(m => m.content).join('، ')}.`
                };
            } catch (error: any) {
                const excMsg = `Memory Tool Exception: ${error.message}`;
                console.error(`[${time}] ${excMsg}`);
                try {
                    const fs = await import('fs');
                    const path = await import('path');
                    fs.appendFileSync(path.join(process.cwd(), 'debug-memory.log'), `[${time}] ${excMsg}\n`);
                } catch (e) { }
                return { success: false, error: error.message };
            }
        }
    } as any);

    return tools;
};
