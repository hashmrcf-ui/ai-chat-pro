
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import * as fs from 'fs';
import * as path from 'path';

// Manual .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            content.split('\n').forEach(line => {
                const [key, ...parts] = line.split('=');
                if (key && parts.length > 0) {
                    const value = parts.join('=').trim().replace(/^["']|["']$/g, '');
                    process.env[key.trim()] = value;
                }
            });
        }
    } catch (e) {
        console.log("Could not load .env.local");
    }
}

loadEnv();

async function check() {
    console.log("--- DEBUG START ---");
    try {
        const groq = createOpenAI({
            baseURL: 'https://api.groq.com/openai/v1',
            apiKey: process.env.GROQ_API_KEY || 'dummy',
        });

        console.log("Calling streamText...");
        // Just a simple hello to check the return object
        const result = await streamText({
            model: groq('llama3-8b-8192'),
            messages: [{ role: 'user', content: 'hi' }],
        });

        console.log("StreamText executed.");
        console.log("Result Type:", typeof result);
        console.log("Result Keys:", Object.keys(result));

        // Check for specific methods
        const methods = ['toDataStreamResponse', 'toTextStreamResponse', 'toAIStreamResponse', 'toResponse'];
        methods.forEach(m => {
            // @ts-ignore
            console.log(`Has ${m}?`, typeof result[m]);
        });

    } catch (e: any) {
        console.error("Error during execution:", e.message);
        if (e.cause) console.error("Cause:", e.cause);
    }
    console.log("--- DEBUG END ---");
}

check();
