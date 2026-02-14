'use server';

import { createClient } from './supabase-server';
import { processShoppingOrder } from './shopping';

const MOCK_PRODUCTS = [
    'آيفون 16 برو',
    'سماعات لاسلكية',
    'لابتوب ديل',
    'شاشة 4K',
    'كاميرا كانون',
    'سوار ذكي'
];

/**
 * Trigger a mock order for a random fake customer to test the system.
 */
export async function triggerSimulationOrder() {
    const supabase = await createClient();

    try {
        // 1. Get a random fake customer
        const { data: customers } = await supabase.from('fake_customers').select('id');
        if (!customers || customers.length === 0) throw new Error('لا يوجد عملاء وهميون للمحاكاة.');

        const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
        const randomProduct = MOCK_PRODUCTS[Math.floor(Math.random() * MOCK_PRODUCTS.length)];

        // 2. Process the order
        const result = await processShoppingOrder({
            productName: randomProduct,
            userId: '', // Not used for fake customers
            isFake: true
        });

        return result;
    } catch (error: any) {
        console.error('[Simulation Error]:', error.message);
        return { success: false, error: error.message };
    }
}
