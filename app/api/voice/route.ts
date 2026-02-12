import { Groq } from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Get API key from env or fallback (User needs to set this)
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'gsk_PLAYGROUND_KEY_NEEDED', // Placeholder
});

export async function POST(req: NextRequest) {
    const logFile = path.join(process.cwd(), 'server-debug.log'); // Keep for local, but console log for Vercel
    const time = new Date().toISOString();

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Save temporarily (Use /tmp for Vercel/Linux, or process.cwd() for local fallback if /tmp fails check? simplest is os.tmpdir())
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `temp_${Date.now()}.webm`);
        fs.writeFileSync(tempFilePath, buffer);

        console.log(`[${time}] Voice: Received audio file size: ${buffer.length}`);

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-large-v3',
            prompt: 'Conversation in Arabic or English', // Context hint
            response_format: 'json',
            language: 'ar', // Default hint, but it detects automatically
        });

        // Cleanup
        try {
            fs.unlinkSync(tempFilePath);
        } catch (e) {
            console.error('Failed to delete temp file:', e);
        }

        console.log(`[${time}] Voice: Transcription success: "${transcription.text}"`);

        return NextResponse.json({ text: transcription.text });

    } catch (error: any) {
        console.error(`[${time}] Voice ERROR: ${error.message}`);
        console.error('Groq Whisper Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
