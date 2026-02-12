import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    const logFile = path.join(process.cwd(), 'env-test.log');
    const time = new Date().toISOString();

    try {
        const hasKey = !!process.env.OPENROUTER_API_KEY;
        const keyPrefix = hasKey ? process.env.OPENROUTER_API_KEY?.substring(0, 5) : 'NONE';

        fs.appendFileSync(logFile, `[${time}] GET /api/test-env called. Key present: ${hasKey} (${keyPrefix})\n`);

        return NextResponse.json({
            success: true,
            hasKey,
            keyPrefix,
            time
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
