
// @ts-nocheck
// Shopping Agent V28 - Guided Onboarding (Step-by-Step Profiler)
// "Contract: No Guessing. Ask Explicitly: Location -> Category -> Item -> Budget -> Search."

import { getMarketContext } from '@/lib/market-config';
import { generateObject, generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { searchProducts } from '@/lib/search-service';
import { z } from 'zod';

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL_ROLES = {
    INTENT: 'gemini-2.0-flash-001',
    JUDGE: 'gemini-2.0-flash-001',
    WRITER: 'gemini-2.0-flash-001'
};

function getModel(modelName: string) {
    if (modelName.includes('gpt')) return openai(modelName);
    return openrouter(modelName);
}

// -------------------- Config --------------------
const CONFIG = {
    SEMANTIC_JUDGE_ENABLED: true,
    INTENT_MIN_CONF: 60,
    RESULT_MIN_CONF: 65,
    MAX_REFINE_ROUNDS: 1,
    MAX_SNIPPET_LEN: 250,
};

// -------------------- State Schema (User Journey) --------------------
// We treat the interaction as a Finite State Machine
type UserState = 'INIT' | 'ASK_LOCATION' | 'ASK_CATEGORY' | 'ASK_ITEM' | 'ASK_BUDGET' | 'READY_TO_SEARCH';

// -------------------- Schemas (Zod) --------------------

const IntentSchema = z.object({
    goal: z.enum(['shopping', 'chat']),
    slots: z.object({
        item_name: z.string().nullable(),
        category: z.string().nullable(),
        location: z.string().nullable(),
        budget_preference: z.enum(['cheap', 'mid', 'expensive', 'unspecified']).nullable(),
    }),
    missing_info_step: z.enum(['LOCATION', 'CATEGORY', 'ITEM', 'BUDGET', 'NONE']), // What to ask next?
    clarify_question: z.object({
        text: z.string(),
        options: z.array(z.string()),
        category: z.string() // UI Type ID
    }).nullable(),
    query_plan: z.array(z.string()).min(1).max(3),
    confidence: z.number()
});

const ValidationResponseSchema = z.object({
    validations: z.array(z.object({
        id: z.string(),
        label: z.enum(['exact', 'related', 'irrelevant']),
        score: z.number().min(0).max(100),
        reason: z.string(),
    }))
});

const RecommendationSchema = z.object({
    title: z.string(),
    summary: z.string(),
    top_pick_reason: z.string(),
    value_pick_reason: z.string(),
    advice: z.string(),
    follow_up_question: z.string(),
    suggested_actions: z.array(z.string())
});

// -------------------- Orchestrator V28 --------------------

export async function runShoppingAgent(
    userQuery: string,
    modelName: string = 'gemini-2.0-flash-001',
    sendToStream: (chunk: string) => Promise<void>,
    previousContext?: any
) {
    console.log(`--- Shopping Agent V28 (Step-by-Step) ---`);
    const AGENT_MODELS = { INTENT: modelName, JUDGE: modelName, WRITER: modelName };

    try {
        // 1. INTENT CORE (State Analysis)
        await sendToStream(`:::UI_SEARCHING:::جاري تحليل الخطوة الحالية...:::`);

        // We pass previous slots to keep memory of what was already answered
        let intent = await parseStepByStepIntent(userQuery, previousContext, AGENT_MODELS.INTENT);

        if (intent.goal === 'chat') {
            const chatResponse = intent.clarify_question?.text || "أهلاً بك! كيف يمكنني مساعدتك؟";
            await sendToStream(chatResponse);
            return;
        }

        // 2. GUIDED ONBOARDING LOOP
        // if missing_info_step is NOT NONE, we stop and ask.
        if (intent.missing_info_step !== 'NONE') {
            await triggerClarification(intent, sendToStream);
            // Important: Return INTENT_CONTEXT so next turn has the slots
            await sendToStream(`:::INTENT_CONTEXT:::${JSON.stringify(intent)}:::`);
            return;
        }

        // 3. READY TO SEARCH
        // If we are here, we have Location + Category + Item + Budget (or user skipped budget explicitly)

        let round = 0;
        let finalResult = { ranked: [], metadata: { confidenceLabel: 'low', confidenceScore: 0, totalFound: 0 } };
        let queries = intent.query_plan;
        let isEmergency = false;

        // Detect if Yemen context for specialized search params
        const isYemen = intent.slots.location?.includes('اليمن') || intent.slots.location?.includes('صنعاء') || intent.slots.location?.includes('عدن');
        const searchParams = isYemen ? { gl: 'ye', location: 'Yemen' } : { gl: 'sa', location: 'Saudi Arabia' };

        while (round <= CONFIG.MAX_REFINE_ROUNDS + 1) {
            const isRetry = round > 0;
            let statusMsg = `:::UI_SEARCHING:::جاري البحث في ${intent.slots.location || 'السوق'}...:::`;
            if (isEmergency) statusMsg = `:::UI_SEARCHING:::بحث شامل عن "${intent.slots.item_name}"...:::`;

            await sendToStream(statusMsg);

            // A. Search
            const searchResults = await executeSearch(queries, searchParams);

            // B. Judge Core
            const validated = isEmergency
                ? searchResults.map(p => ({ ...p, _semanticScore: 60, _semanticLabel: 'related', _validationReason: 'نتائج تقريبية' }))
                : await validateUniversalResults(intent, searchResults, AGENT_MODELS.JUDGE);

            // C. Rank
            finalResult = rankUniversal(validated);

            // D. Check Success
            if (finalResult.metadata.confidenceScore >= CONFIG.RESULT_MIN_CONF && finalResult.metadata.totalFound > 0) break;

            // E. Refine / Emergency Logic
            if (round === CONFIG.MAX_REFINE_ROUNDS) {
                if (finalResult.ranked.length === 0) {
                    isEmergency = true;
                    queries = [intent.slots.item_name];
                    round++; continue;
                }
            }
            if (isEmergency) break;

            queries = queries.map(q => q + " review");
            round++;
        }

        // 4. WRITER CORE
        if (finalResult.ranked.length === 0) {
            const fallbackQ = intent.clarify_question || { text: "لم أجد نتائج.. هل تريد تغيير البحث؟", options: ["بحث عام"], reason: "فشل البحث", category: 'General' };
            await triggerClarification({ ...intent, clarify_question: fallbackQ }, sendToStream);
            return;
        }

        if (finalResult.metadata.confidenceLabel === 'low' || isEmergency) {
            await sendToStream(`⚠️ **هذه أقرب النتائج (قد لا تكون دقيقة 100%):**\n\n`);
        }

        await sendToStream(`:::UI_SEARCHING:::جاري تنسيق النتائج...:::`);
        const recommendation = await generaterecommendationContent(intent, finalResult.ranked.slice(0, 3), AGENT_MODELS.WRITER);

        // 5. Output
        const content = `
### ${recommendation.title}
${recommendation.summary}

---

## 🥇 الخيار الأفضل: ${finalResult.ranked[0].name}
**السعر:** ${finalResult.ranked[0].displayPrice}
**لماذا اخترته:** ${recommendation.top_pick_reason}
🔗 [عرض المنتج](${finalResult.ranked[0].url})

${finalResult.ranked[1] ? `
---
## 🥈 البديل: ${finalResult.ranked[1].name}
**السعر:** ${finalResult.ranked[1].displayPrice}
**لماذا هو بديل جيد:** ${recommendation.value_pick_reason}
🔗 [عرض المنتج](${finalResult.ranked[1].url})
` : ''}

---
💡 **نصيحة:** ${recommendation.advice}
    `.trim();

        await sendToStream(content + "\n\n");
        await sendToStream(`:::UI_PRODUCTS:::${JSON.stringify({
            title: recommendation.title,
            summary: recommendation.summary,
            products: finalResult.ranked.slice(0, 4).map(toUIProduct)
        })}:::`);

        await sendToStream(`:::INTENT_CONTEXT:::${JSON.stringify(intent)}:::`);

        const suggestionsPayload = {
            question: recommendation.follow_up_question || "هل لديك استفسار آخر؟",
            options: recommendation.suggested_actions || ["مقارنة الأسعار", "البحث عن مستعمل"],
            category: "FollowUp"
        };

        await sendToStream(`\n\n💬 **${suggestionsPayload.question}**`);
        await sendToStream(`:::UI_QUESTION:::${JSON.stringify(suggestionsPayload)}:::`);

    } catch (error) {
        console.error("V28 Error:", error);
        await sendToStream(`⚠️ حدث خطأ: ${error?.message}`);
    }
}

// -------------------- CORE 1: INTENT AGENT (Step-by-Step) --------------------

async function parseStepByStepIntent(query: string, context: any, modelName: string) {
    // Current accumulated knowledge
    const currentSlots = context?.slots || { item_name: null, category: null, location: null, budget_preference: null };

    // We update slots based on new query + history
    const systemPrompt = `
You are a Guided Shopping Assistant.
Your goal is to fill these slots: [Location, Category, ItemName, Budget].

Current Knowledge: ${JSON.stringify(currentSlots)}.
New Input: "${query}".

INSTRUCTIONS:
1. **MERGE** Valid Knowledge + New Input.
   - PRESERVE existing values from 'Current Knowledge' unless the user explicitly changes them (e.g. "No, I want coffee").
   - EXTRACT new values from 'New Input'.

2. **DETERMINE STATUS**:
   - simple: Is Location known? -> If no, missing='LOCATION'.
   - simple: Is Category known? -> If no, missing='CATEGORY'.
   - simple: Is Item known? -> If no, missing='ITEM'.
   - simple: Is Budget known? -> If no, missing='BUDGET'.
   - Else -> missing='NONE'.

Output JSON with the FULL MERGED STATE.
`;
    try {
        const result = await generateObject({
            model: getModel(modelName), schema: IntentSchema, system: systemPrompt,
            prompt: "Analyze Step.", mode: 'json'
        });

        // Manual Safe Merge (Code Level Protection)
        // If LLM returns null for a slot that we already had, KEEP validity.
        const mergedSlots = {
            item_name: result.object.slots.item_name || currentSlots.item_name,
            category: result.object.slots.category || currentSlots.category,
            location: result.object.slots.location || currentSlots.location,
            budget_preference: result.object.slots.budget_preference || currentSlots.budget_preference,
        };

        // Recalculate missing step based on MERGED data if LLM made a mistake
        let calculatedMissing = result.object.missing_info_step;
        if (!mergedSlots.location) calculatedMissing = 'LOCATION';
        else if (!mergedSlots.category) calculatedMissing = 'CATEGORY';
        else if (!mergedSlots.item_name) calculatedMissing = 'ITEM';
        else if (!mergedSlots.budget_preference) calculatedMissing = 'BUDGET';
        else calculatedMissing = 'NONE';

        return {
            ...result.object,
            slots: mergedSlots,
            missing_info_step: calculatedMissing
        };

    } catch (e) {
        // Fallback or restart flow
        return { goal: 'shopping', slots: currentSlots, missing_info_step: 'LOCATION', confidence: 60, query_plan: [query], clarify_question: { text: "وين مكانك؟", options: ["اليمن", "السعودية"], category: "Location" } } as any;
    }
}

// -------------------- CORE 2: JUDGE AGENT --------------------

async function validateUniversalResults(intent: any, candidates: any[], modelName: string) {
    if (candidates.length === 0) return [];
    const promptItems = candidates.map((p, i) => `ID: "${p.id}"\nTitle: ${p.title}\nSnippet: ${p.snippet}\nPrice: ${p.displayPrice}\n---`).join("\n");

    try {
        const result = await generateObject({
            model: getModel(modelName), schema: ValidationResponseSchema,
            system: `Semantic Judge. User: ${intent.slots.item_name} loc:${intent.slots.location} budget:${intent.slots.budget_preference}.`,
            prompt: `Check items against user intent:\n${promptItems}`, mode: 'json'
        });
        const valMap = new Map(result.object.validations.map(v => [v.id, v]));
        return candidates.map(p => {
            const val = valMap.get(p.id);
            return { ...p, _semanticScore: val?.score || 0, _semanticLabel: val?.label || 'irrelevant' };
        });
    } catch (e) { return candidates.map(p => ({ ...p, _semanticScore: 50, _semanticLabel: 'related' })); }
}

// -------------------- CORE 3: WRITER AGENT --------------------
async function generaterecommendationContent(intent: any, topProducts: any[], modelName: string) {
    const systemPrompt = `Expert Shopping Consultant (Arabic). Item: ${intent.slots.item_name}. Location: ${intent.slots.location}. Write Report.`;
    try {
        const result = await generateObject({
            model: getModel(modelName), schema: RecommendationSchema, system: systemPrompt, prompt: "Generate.", mode: 'json'
        });
        return result.object;
    } catch (e) {
        return {
            title: "النتائج", summary: "تفضل أفضل الخيارات", top_pick_reason: "خيار ممتاز", value_pick_reason: "سعر جيد", advice: "قارن المواصفات",
            follow_up_question: "هل ناسبك السعر؟", suggested_actions: ["نعم", "لا"]
        };
    }
}


// -------------------- Helpers --------------------

async function executeSearch(queries: string[], searchParams?: any) {
    const allProducts = [];
    const results = await Promise.all(queries.map(q => searchProducts(q, searchParams)));

    results.forEach((res, idx) => {
        if (res.products) res.products.forEach((p, i) => allProducts.push(normalizeProduct(p, i + (idx * 10))));
    });

    const seen = new Set();
    return allProducts.filter(p => {
        const k = p.title + p.displayPrice;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

function normalizeProduct(raw: any, index: number) {
    const rawPrice = String(raw.price || "0").replace(/[^0-9.]/g, '');
    const cleanName = (raw.name || raw.title || "Item");
    const imageSrc = raw.image_query || raw.image || raw.thumbnail || "";

    return {
        id: `prod_${index}`, name: cleanName, title: cleanName, snippet: (raw.snippet || "").slice(0, 250),
        price: parseFloat(rawPrice) || 0, displayPrice: raw.price || "Check Site",
        url: raw.url || "", merchant: raw.merchant || "Unknown", image: imageSrc,
        _score: 0
    };
}

function rankUniversal(products: any[]) {
    const ranked = products.map(p => {
        let s = (p.price > 0 ? 30 : 0) + (p._semanticScore || 0);
        return { ...p, _score: s };
    }).sort((a, b) => b._score - a._score);
    return { ranked: ranked.slice(0, 5), metadata: { confidenceScore: 75, totalFound: ranked.length } };
}

async function triggerClarification(intent: any, sendToStream: any) {
    const q = intent.clarify_question || { text: "ممكن تفاصيل أكثر؟", options: [], reason: "معلومات ناقصة", category: "General" };
    await sendToStream(`🤔 **${q.reason}**\n\n`);
    await sendToStream(`:::UI_QUESTION:::${JSON.stringify({ question: q.text, options: q.options, category: q.category })}:::`);
}

function toUIProduct(p: any) { return p; }
