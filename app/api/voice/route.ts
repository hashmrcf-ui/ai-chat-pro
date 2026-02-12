import { Groq } from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { os } from 'process';

// Get API key from env or fallback (User needs to set this)
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'gsk_PLAYGROUND_KEY_NEEDED', // Placeholder
});

export async function POST(req: NextRequest) {
    const logFile = path.join(process.cwd(), 'server-debug.log');
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

        // Save temporarily (Groq SDK expects a file path or stream, but file path is safer for temp storage)
        const tempFilePath = path.join(process.cwd(), `temp_${Date.now()}.webm`);
        fs.writeFileSync(tempFilePath, buffer);
        
        fs.appendFileSync(logFile, `[${time}] Voice: Received audio file size: ${buffer.length}\n`);

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-large-v3',
            prompt: 'Conversation in Arabic or English', // Context hint
            response_format: 'json',
            language: 'ar', // Default hint, but it detects automatically
        });

        // Cleanup
        fs.unlinkSync(tempFilePath);

        fs.appendFileSync(logFile, `[${time}] Voice: Transcription success: "${transcription.text}"\n`);

        return NextResponse.json({ text: transcription.text });

    } catch (error: any) {
        fs.appendFileSync(logFile, `[${time}] Voice ERROR: ${error.message}\n`);
        console.error('Groq Whisper Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
