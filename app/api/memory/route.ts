
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { MemorySystem } from '@/lib/memory-system';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const query = searchParams.get('q');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        const supabase = await createClient();
        const memorySystem = new MemorySystem(supabase);

        // Standard profile read
        const profile = await memorySystem.getProfile(userId);

        let searchResults = [];
        if (query) {
            // Search vector store
            searchResults = await memorySystem.searchMemories(userId, query, 10);
        } else {
            // Just show recent via standard select if no query (Need to add custom method for Recent, but search via empty string might work if configured, or just skip)
            // Let's rely on search for now or modify memory system.
            // For now return empty for memories if no query.
            if (query === 'ALL') {
                // Fetch all if needed (expensive for vectors without limit)
                // Or we can use direct supabase client here
                const { data } = await supabase.from('memory_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
                searchResults = data || [];
            }
        }

        return NextResponse.json({
            profile,
            memories: searchResults
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    try {
        const supabase = await createClient();
        const memorySystem = new MemorySystem(supabase);

        await memorySystem.clearMemory(userId);

        return NextResponse.json({ success: true, message: 'Memory wiped successfully' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
