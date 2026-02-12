import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const logFile = path.join(process.cwd(), 'chat-minimal.log');
    const time = new Date().toISOString();

    try {
        fs.appendFileSync(logFile, `\n[${time}] Minimal POST /api/chat called\n`);
        const body = await req.json();
        fs.appendFileSync(logFile, `[${time}] Body received: ${JSON.stringify(body).length} chars\n`);

        // Return simple text stream
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode("Hello from server! This is a test stream.\n"));
                setTimeout(() => {
                    controller.enqueue(encoder.encode("If you see this, streaming works.\n"));
                    controller.close();
                }, 500);
            }
        });

        return new Response(readable, {
            headers: { 'Content-Type': 'text/plain' },
        });

    } catch (error) {
        fs.appendFileSync(logFile, `[${time}] ERROR: ${error}\n`);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
