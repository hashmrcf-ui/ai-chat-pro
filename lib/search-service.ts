
// @ts-nocheck
import { ProductItem } from '@/components/shopping/ShoppingComponents';

// REVERTING TO SERPAPI (Classic) based on the dashboard UI shown in screenshots
// The user likely has a "SerpApi" key, not "Serper.dev"
const SERPER_API_KEY = process.env.SERPER_API_KEY!;
// Note: We use the existing env var name but treat it as a SerpApi key

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    price?: string;
    source?: string;
    thumbnail?: string;
    rating?: number;
    reviews?: number;
}

export async function searchProducts(query: string, market?: { gl: string, location: string }): Promise<{
    title: string;
    summary: string;
    products: ProductItem[];
}> {
    if (!SERPER_API_KEY) {
        // ... err
    }

    try {
        const targetLocation = market?.location || "Saudi Arabia";
        const targetGl = market?.gl || "sa";

        console.log(`[Search Service] Searching SerpApi (Google Shopping) for: ${query} in ${targetLocation}`);

        // Construct SerpApi URL
        const params = new URLSearchParams({
            engine: "google_shopping",
            q: query,
            location: targetLocation,
            hl: "ar",
            gl: targetGl,
            api_key: SERPER_API_KEY,
            num: "10"
        });

        const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`SerpApi Error: ${response.status} ${response.statusText}`);
        }

        const data: any = await response.json();

        if (data.error) {
            throw new Error(`SerpApi Logic Error: ${data.error}`);
        }

        const shoppingResults = data.shopping_results || [];

        // Transform Results into Product Items
        const products: ProductItem[] = shoppingResults.map((result: any) => {
            return {
                name: result.title.substring(0, 80),
                price: result.price || "Check Site",
                description: result.source || "Online Store", // SerpApi often puts store name in 'source'
                features: result.delivery ? [result.delivery] : ["Available Now"],
                image_query: result.thumbnail || "",
                merchant: result.source,
                url: result.link,
                rating: result.rating || 4.5,
                reviews: result.reviews || 0
            };
        });

        return {
            title: `نتائج البحث عن: ${query}`,
            summary: products.length > 0
                ? `إليك أفضل العروض التي وجدتها لـ "${query}" في السعودية.`
                : `عذراً، لم أجد نتائج مطابقة لـ "${query}" في قسم التسوق، جرب كلمات أخرى.`,
            products: products.slice(0, 6)
        };

    } catch (error) {
        console.error("[Search Service Error]:", error);
        return {
            title: "خطأ في البحث",
            summary: `حدث خطأ أثناء الاتصال بمحرك البحث: ${error.message}`,
            products: []
        };
    }
}
