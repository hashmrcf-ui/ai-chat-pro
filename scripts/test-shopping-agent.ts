
const fs = require('fs');
const path = require('path');
const https = require('https');

// Custom function to load .env variables without 'dotenv' package
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env.local');
        if (!fs.existsSync(envPath)) {
            console.warn("⚠️ Warning: .env.local file not found.");
            return;
        }

        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');

        for (const line of lines) {
            if (!line || line.startsWith('#') || !line.includes('=')) continue;
            const [key, ...values] = line.split('=');
            if (key && values.length > 0) {
                process.env[key.trim()] = values.join('=').trim().replace(/^['"]|['"]$/g, '');
            }
        }
        console.log("✅ Environment variables loaded successfully.");
    } catch (e) {
        console.error("❌ Failed to load .env.local:", e);
    }
}

// Custom GET implementation for Node.js
function simpleGet(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error("Invalid JSON response"));
                    }
                } else {
                    reject(new Error(`API Error: ${res.statusCode} - ${data}`));
                }
            });
        });
        req.on('error', (e) => reject(e));
    });
}

// Main Test Function
async function testShoppingAgent(query, country = "sa") {
    loadEnv();

    console.log(`\n🛒 Testing Shopping Agent (SerpApi) for: "${query}" in "${country}"...`);

    try {
        // Reuse SERPER_API_KEY as the variable name, but it points to SerpApi key
        const apiKey = process.env.SERPER_API_KEY || process.env.SERPAPI_API_KEY;
        if (!apiKey) throw new Error("❌ API Key is missing in .env.local");

        console.log(`🔑 Using Key matching SerpApi format: ${apiKey.substring(0, 5)}...`);

        // Construct SerpApi URL
        const params = new URLSearchParams({
            engine: "google_shopping",
            q: query,
            api_key: apiKey,
            google_domain: "google.com.sa",
            gl: country,
            hl: "ar",
            num: "8"
        });

        // Call API
        const data = await simpleGet(`https://serpapi.com/search.json?${params.toString()}`);

        if (data.error) {
            throw new Error(`SerpApi Error: ${data.error}`);
        }

        const results = data.shopping_results || [];

        if (results.length === 0) {
            console.log("⚠️ No products found.");
            return;
        }

        console.log(`\n✅ Success! Found ${results.length} products:\n`);
        console.log("--------------------------------------------------");

        results.forEach((p, index) => {
            console.log(`Product #${index + 1}: ${p.title}`);
            console.log(`💰 Price:  ${p.price}`);
            console.log(`🏪 Store:  ${p.source}`);
            // SerpApi property is 'thumbnail', mapped to 'imageUrl' in app
            console.log(`�️ Image:  ${p.thumbnail ? "✅ Open" : "❌ Missing"}`);
            console.log("--------------------------------------------------");
        });

    } catch (error) {
        console.error("\n❌ TEST FAILED:", error.message);
    }
}

// Run Test
testShoppingAgent("iPhone 15 Pro Max");
