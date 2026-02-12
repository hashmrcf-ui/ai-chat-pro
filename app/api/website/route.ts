import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { description, category, colorScheme, pages, features } = await request.json();

        console.log('Generating website with:', { description, category, colorScheme, pages, features });

        // Validate input
        if (!description || !category || !colorScheme) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check for API key
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error('GROQ_API_KEY not found in environment variables');
            return NextResponse.json(
                { error: 'API key not configured', details: 'GROQ_API_KEY is missing' },
                { status: 500 }
            );
        }

        // Build prompt for AI
        const prompt = `Create a complete, modern, SINGLE-PAGE website with a PREMIUM design based on:

Description: ${description}
Category: ${category}
Color Scheme: ${colorScheme}
Number of Pages: ${pages}
Features: ${features.join(', ') || 'none'}

CRITICAL DESIGN REQUIREMENTS:
1.  **FRAMEWORK**: You MUST use **Tailwind CSS** via CDN for ALL styling. Do NOT write custom CSS in styles.css unless absolutely necessary for animations.
    - Include this in head: \`<script src="https://cdn.tailwindcss.com"></script>\`
    - Include this in head: \`<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Tajawal:wght@400;700&display=swap" rel="stylesheet">\`
    - Set font-family to 'Cairo' or 'Tajawal' in tailwind config or body class.

2.  **AESTHETICS (Essential)**:
    - Use **Glassmorphism** effects (backdrop-blur, bg-opacity).
    - Use **Gradient Text** for main headings.
    - Use **Soft Shadows** (shadow-lg, shadow-xl) for cards.
    - Use **Rounded corners** (rounded-2xl, rounded-3xl).
    - Use **Whitespace** generous padding (p-8, py-16, gap-8).
    - **Dark Mode** support if applicable.

3.  **STRUCTURE**:
    - **Header**: Sticky glassmorphism navbar with logo and links.
    - **Hero Section**: Big, bold, centered, with gradient headline and CTA button.
    - **Features/Services**: Grid layout (grid-cols-1 md:grid-cols-3) with elegant cards.
    - **Footer**: Clean, multi-column footer.

4.  **CONTENT**:
    - ALL text must be in **ARABIC** (Right-to-Left direction used automatically via dir="rtl" in html tag).
    - Use high-quality placeholder images from **Unsplash Source** or **Picsum** with specific keywords (e.g., https://source.unsplash.com/random/800x600?${category}).

Return ONLY valid JSON in this exact format:
{
  "title": "Website Title in Arabic",
  "files": {
    "index.html": "<!DOCTYPE html><html lang='ar' dir='rtl'><head>...scripts...</head><body class='bg-gray-50 text-gray-900 font-cairo'>...content...</body></html>",
    "styles.css": "/* Minimal custom CSS only for keyframes or scrollbars */",
    "script.js": "// Interactive logic (mobile menu, scroll effects)"
  }
}

CRITICAL: Return ONLY the JSON object. NO markdown. NO explanations.`;

        console.log('Calling GROQ API...');

        // Call GROQ API with updated model
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert web developer. Generate complete, production-ready websites. Always return valid JSON only, no markdown formatting.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 8000,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('GROQ API error:', errorData);
            return NextResponse.json(
                { error: 'AI service error', details: errorData },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('GROQ API response received');

        // Extract content
        const content = data.choices[0]?.message?.content;
        if (!content) {
            console.error('No content in response');
            return NextResponse.json(
                { error: 'No content generated' },
                { status: 500 }
            );
        }

        console.log('Raw content:', content.substring(0, 200));

        // Parse JSON from response
        let websiteData;
        try {
            // Remove markdown code blocks if present
            const cleanContent = content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            websiteData = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error('Failed to parse JSON:', parseError);
            console.error('Content:', content);
            return NextResponse.json(
                { error: 'Failed to parse generated website', details: 'Invalid JSON format' },
                { status: 500 }
            );
        }

        // Create website object
        const website = {
            id: Date.now().toString(),
            title: websiteData.title || 'موقع جديد',
            description,
            category,
            colorScheme,
            files: websiteData.files || {},
            preview: websiteData.files['index.html'] || '<h1>Error: No HTML generated</h1>',
            createdAt: Date.now()
        };

        console.log('Website generated successfully:', website.title);

        return NextResponse.json(website);

    } catch (error: any) {
        console.error('Error generating website:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        return NextResponse.json(
            {
                error: 'Failed to generate website',
                details: error.message || 'Unknown error',
                type: error.name || 'Error'
            },
            { status: 500 }
        );
    }
}
