import { NextRequest, NextResponse } from 'next/server';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { WORKFLOW_ARCHITECT_PROMPT } from '@/lib/workflow-prompts';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { description } = await req.json();

        if (!description || typeof description !== 'string') {
            return NextResponse.json(
                { error: 'يجب إرسال وصف للعملية' },
                { status: 400 }
            );
        }

        // Call AI to generate workflow JSON
        const { text } = await generateText({
            model: openrouter('anthropic/claude-sonnet-4.5'),
            system: WORKFLOW_ARCHITECT_PROMPT,
            prompt: description,
            temperature: 0.3, // Lower temperature for more consistent JSON
        });

        // Parse JSON response
        let workflowData;
        try {
            // Extract JSON from response (in case AI adds extra text)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('لم يتم إرجاع JSON صالح');
            }
            workflowData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error('JSON Parse Error:', text);
            return NextResponse.json(
                { error: 'فشل في تحليل استجابة AI', details: text },
                { status: 500 }
            );
        }

        return NextResponse.json({ workflow: workflowData });
    } catch (error: any) {
        console.error('Workflow Generation Error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ أثناء توليد الـ Workflow', details: error.message },
            { status: 500 }
        );
    }
}
