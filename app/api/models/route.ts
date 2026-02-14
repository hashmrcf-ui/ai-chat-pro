
import { getActiveModels } from '@/lib/models';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const models = await getActiveModels();
        // Fallback to static if DB is empty (optional, but good for stability)
        if (models.length === 0) {
            return NextResponse.json([
                { id: '1', model_id: 'default-fallback', name: 'Default Model', provider: 'fallback', is_active: true, is_default: true }
            ]);
        }
        return NextResponse.json(models);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
    }
}
