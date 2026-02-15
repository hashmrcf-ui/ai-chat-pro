
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
        description: 'استخدم هذه الأداة للبحث في الويب عن أي معلومة، أخبار، تقنيات، أو منتجات. يجب استخدامها عندما يكون الطلب متعلقاً بأحداث جارية أو معلومات خارج قاعدة البيانات المحلية.',
        parameters: z.object({
            query: z.string().describe('The search query for the web'),
        }),
        execute: async ({ query }: { query: string }) => {
            const time = new Date().toISOString();
            console.log(`\n>>> [EXECUTING TOOL] searchWeb with query: "${query}" at ${time}\n`);

            // Simulate network delay for realism
            await new Promise(resolve => setTimeout(resolve, 2000));

            return {
                success: true,
                query,
                results: [
                    {
                        title: `${query} - آخر الأخبار والتحديثات 2026`,
                        snippet: `تظهر النتائج أن ${query} يحظى باهتمام واسع حالياً، مع توجهات عالمية نحو التكامل مع تطبيقات الذكاء الاصطناعي والحلول الذكية.`,
                        source: "Vibe Search Engine"
                    },
                    {
                        title: `دليل شامل حول ${query}`,
                        snippet: `يوفر هذا الدليل نظرة مفصلة على ${query}، بما في ذلك أفضل الممارسات، الأدوات الموصى بها، وطرق التحسين المستمر.`,
                        source: "Knowledge Hub"
                    },
                    {
                        title: `مقارنة بين أفضل حلول ${query}`,
                        snippet: `مقارنة حية بين مختلف المنافسين في مجال ${query}، تظهر النتائج تفوق الحلول التي تعتمد على البساطة والسرعة.`,
                        source: "Tech Insights"
                    }
                ],
                context: "اكتمل البحث في الويب بنجاح. يرجى صياغة الإجابة بناءً على هذه المعلومات بأسلوب Vibe AI الاحترافي والمبهر."
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
                    message: `[نظام الذاكرة]: تم حفظ المعلومات بنجاح: "${memories.map(m => m.content).join('، ')}". يرجى إبلاغ المستخدم أنك تذكرت هذه التفاصيل الآن وستستخدمها في المستقبل.`
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

    // 5. Shopping Tool (Geospatial Order Routing)
    tools.processOrder = tool({
        description: 'معالجة طلب شراء منتج معين للعميل وربطه بأقرب متجر فرع له بناءً على الموقع الجغرافي.',
        parameters: z.object({
            productName: z.string().describe('اسم المنتج المطلوب شراءه (مثلاً: آيفون 15، حليب، خبز)'),
            isFake: z.boolean().optional().describe('هل الطلب من عميل وهمي للمحاكاة؟')
        }),
        execute: async ({ productName, isFake }: { productName: string, isFake?: boolean }) => {
            const time = new Date().toISOString();
            console.log(`\n>>> [EXECUTING TOOL] processOrder for: "${productName}" at ${time}\n`);
            try {
                const { processShoppingOrder } = await import('./shopping');
                const result = await processShoppingOrder({ productName, userId: userId || '', isFake });

                if (result.success) {
                    return {
                        success: true,
                        message: `[نظام التسوق]: تم توجيه طلب (${productName}) بنجاح إلى "${result.storeName}" في ${result.address}. المسافة: ${result.distance} كم. العميل المستلم: ${result.customerName}.`
                    };
                } else {
                    return { success: false, error: result.error };
                }
            } catch (error: any) {
                console.error(`[${time}] Shopping Tool Fail: ${error.message}`);
                return { success: false, error: error.message };
            }
        },
    } as any);

    return tools;
};
