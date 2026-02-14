import { createClient } from './supabase-server';
import { findNearest } from './geo';

export interface ShoppingOrder {
    productName: string;
    userId: string;
    isFake?: boolean;
}

/**
 * Main logic to process a shopping order:
 * 1. Finds the nearest store for the user/customer.
 * 2. Creates an order record in the database.
 */
export async function processShoppingOrder({ productName, userId, isFake = false }: ShoppingOrder) {
    const supabase = await createClient();
    const time = new Date().toISOString();

    try {
        // 1. Get all available stores
        const { data: stores, error: storeError } = await supabase
            .from('stores')
            .select('*');

        if (storeError || !stores || stores.length === 0) {
            throw new Error('لا توجد متاجر مسجلة في النظام حالياً.');
        }

        // 2. Get customer coordinates (For simulation, we'll pick the first fake customer if requested)
        let customerLat = 15.3236; // Default to Sanaa
        let customerLon = 44.1923;
        let customerName = 'مستخدم';

        if (isFake) {
            const { data: fakes } = await supabase.from('fake_customers').select('*').limit(1).single();
            if (fakes) {
                customerLat = fakes.latitude;
                customerLon = fakes.longitude;
                customerName = fakes.full_name;
            }
        } else {
            // In a real app, we might get this from the user's profile or browser geo
            // For now, we use the default Sanaa coordinates
        }

        // 3. Find the nearest store
        const nearestResult = findNearest(customerLat, customerLon, stores);
        if (!nearestResult) throw new Error('تعذر العثور على متجر قريب.');

        const { item: store, distance } = nearestResult;

        // 4. Record the order
        const { data: order, error: orderError } = await supabase
            .from('shopping_orders')
            .insert({
                [isFake ? 'fake_customer_id' : 'customer_id']: isFake ? undefined : userId,
                store_id: store.id,
                product_name: productName,
                distance_km: Math.round(distance * 100) / 100,
                status: 'sent'
            })
            .select()
            .single();

        if (orderError) throw orderError;

        return {
            success: true,
            orderId: order.id,
            product: productName,
            storeName: store.name,
            address: store.address,
            distance: Math.round(distance * 100) / 100,
            customerName: customerName
        };

    } catch (error: any) {
        console.error('[Shopping Logic Error]:', error.message);
        return { success: false, error: error.message };
    }
}
