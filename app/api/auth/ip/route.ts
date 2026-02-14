import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
    const headerList = await headers();

    // Check various headers for IP, common in Vercel/Cloudflare
    const ip =
        headerList.get('x-forwarded-for')?.split(',')[0] ||
        headerList.get('x-real-ip') ||
        '127.0.0.1';

    return NextResponse.json({ ip });
}
