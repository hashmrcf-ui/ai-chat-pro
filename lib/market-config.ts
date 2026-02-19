export const MARKETS_CONFIG = {
    // Saudi Arabia (Default)
    SA: {
        currency: 'SAR',
        sites: [
            'amazon.sa', 'noon.com/saudi-ar', 'jarir.com', 'extra.com',
            'haraj.com.sa', 'cobone.com', 'tamara.com', 'tabby.ai'
        ],
        search_params: { gl: 'sa', location: 'Saudi Arabia' }
    },
    // Yemen (New)
    YE: {
        currency: 'YER',
        sites: [
            'yemen-market.com', 'opsoq.com', 'haraj.com.ye', 'ye.opensooq.com',
            'facebook.com/marketplace/sana', 'instagram.com', 'bazarry.com'
        ],
        search_params: { gl: 'ye', location: 'Yemen' }
    }
};

export function getMarketContext(query: string) {
    if (query.includes('اليمن') || query.includes('صنعاء') || query.includes('عدن')) {
        return MARKETS_CONFIG.YE;
    }
    return MARKETS_CONFIG.SA;
}
