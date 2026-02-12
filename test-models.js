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

console.log('Fetching OpenRouter models...');

async function fetchModels() {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/models", {
            method: "GET",
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();
        const models = data.data.map(m => m.id);

        // Filter for "ather" or "ether" or popular ones
        const matches = models.filter(m =>
            m.toLowerCase().includes('ather') ||
            m.toLowerCase().includes('ether') ||
            m.toLowerCase().includes('open') ||
            m.toLowerCase().includes('deepseek')
        );

        console.log('Matches for ather/ether/open/deepseek:', JSON.stringify(matches, null, 2));

        // Save full list
        fs.writeFileSync('openrouter_models.json', JSON.stringify(models, null, 2));
        console.log('All models saved to openrouter_models.json');

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

fetchModels();
