const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/OPENROUTER_API_KEY=(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!apiKey) {
    console.error('OPENROUTER_API_KEY not found in .env.local');
    process.exit(1);
}

console.log('Testing OpenRouter connection with key:', apiKey.substring(0, 10) + '...');
const MODEL_ID = "google/gemini-2.0-flash-001"; // Official stable model

async function testOpenRouter() {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": MODEL_ID,
                "messages": [
                    { "role": "user", "content": "Hello, are you working?" }
                ],
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error with model ${MODEL_ID}: ${response.status} ${response.statusText}`, errorText);
            return;
        }

        const data = await response.json();
        console.log(`Success with model ${MODEL_ID}! Response:`, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testOpenRouter();
