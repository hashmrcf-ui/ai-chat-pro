import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkIsAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const logFile = path.join(process.cwd(), 'debug-memory.log');
        if (!fs.existsSync(logFile)) {
            return new Response('Log file not found.', { status: 200 });
        }
        const content = fs.readFileSync(logFile, 'utf-8');
        return new Response(content, {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const logFile = path.join(process.cwd(), 'debug-memory.log');
        if (fs.existsSync(logFile)) {
            fs.unlinkSync(logFile);
        }
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
