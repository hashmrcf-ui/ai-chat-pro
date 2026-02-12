import { NextRequest, NextResponse } from 'next/server';
import { Presentation, Slide } from '@/data/presentation-templates';
import { presentationTemplates } from '@/data/presentation-templates';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

export async function POST(req: NextRequest) {
    try {
        const { topic, slideCount, template } = await req.json();

        if (!topic || !slideCount) {
            return NextResponse.json(
                { error: 'Topic and slide count are required' },
                { status: 400 }
            );
        }

        // Get template colors
        const selectedTemplate = presentationTemplates.find(t => t.id === template) || presentationTemplates[0];

        // Generate presentation content using GROQ
        const prompt = `Create a professional presentation about: "${topic}"

Requirements:
- Create exactly ${slideCount} slides
- First slide should be a title slide
- Last slide should be a conclusion/summary
- Middle slides should cover key points in detail
- Each slide should have a clear title and 2-4 bullet points
- Make it informative and engaging

Return the response in this exact JSON format:
{
  "title": "Presentation Title",
  "slides": [
    {
      "type": "title",
      "title": "Main Title",
      "content": ["Subtitle or tagline"]
    },
    {
      "type": "content",
      "title": "Slide Title",
      "content": ["Point 1", "Point 2", "Point 3"]
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            throw new Error(`GROQ API error: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices[0].message.content;

        // Clean the response (remove markdown code blocks if present)
        let cleanedText = text.trim();
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/```\n?/g, '');
        }

        const generatedData = JSON.parse(cleanedText);

        // Create presentation object
        const presentation: Presentation = {
            id: Date.now().toString(),
            title: generatedData.title || topic,
            slides: generatedData.slides.map((slide: any, index: number) => ({
                id: `slide-${index}`,
                type: slide.type || 'content',
                title: slide.title,
                content: slide.content,
                backgroundColor: selectedTemplate.colors.background,
                textColor: selectedTemplate.colors.text
            })),
            template: template,
            slideCount: slideCount,
            createdAt: Date.now()
        };

        return NextResponse.json({ presentation });

    } catch (error: any) {
        console.error('Error generating presentation:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        return NextResponse.json(
            {
                error: 'Failed to generate presentation',
                details: error.message || 'Unknown error',
                type: error.name || 'Error'
            },
            { status: 500 }
        );
    }
}
