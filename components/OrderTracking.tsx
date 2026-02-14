'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, Truck, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Order {
    id: string;
    product_name: string;
    status: string;
    distance_km: number;
    created_at: string;
    store: {
        name: string;
        address: string;
    };
}

export default function OrderTracking() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            const { data, error } = await supabase
                .from('shopping_orders')
                .select(`
                    id, 
                    product_name, 
                    status, 
                    distance_km, 
                    created_at,
                    store:store_id (name, address)
                `)
                .order('created_at', { ascending: false })
                .limit(5);

            if (!error && data) {
                setOrders(data as any);
            }
            setLoading(false);
        };

        fetchOrders();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('orders-channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shopping_orders' }, (payload: any) => {
                fetchOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) return null;
    if (orders.length === 0) return null;

    return (
        <div className="mt-6 space-y-3">
            <h3 className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3">
                <ShoppingBag className="w-3 h-3" />
                الطلبات النشطة
            </h3>
            <div className="space-y-2 px-2">
                {orders.map((order) => (
                    <div
                        key={order.id}
                        className="bg-[#1a1a1a] border border-[#27272a] rounded-lg p-3 space-y-2 hover:border-indigo-500/30 transition-all"
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-gray-200">{order.product_name}</span>
                            <span className="text-[9px] bg-green-900/20 text-green-400 px-1.5 py-0.5 rounded border border-green-800/30">
                                {order.status === 'sent' ? 'تم الإرسال' : order.status}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                <MapPin className="w-3 h-3 text-indigo-500" />
                                <span>{order.store?.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                <Truck className="w-3 h-3 text-orange-500" />
                                <span>أقرب فرع على بعد {order.distance_km} كم</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
