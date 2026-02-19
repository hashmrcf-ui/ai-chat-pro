
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { userId, ...updates } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const supabase = await createClient();

        // Security check: ensure session matches userId
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== userId) {
            return NextResponse.json({ error: 'Unauthorized', debug: { userId, session: user?.id } }, { status: 401 });
        }

        const { error } = await supabase
            .from('user_profile')
            .update(updates)
            .eq('user_id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
