
import { supabase } from './supabase';

interface SecurityCheckResult {
    flagged: boolean;
    violationType?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    reason?: string;
}

// Basic keyword list - In a real app, this could be fetched from DB or an AI Model
const FORBIDDEN_KEYWORDS = [
    { word: 'hack', severity: 'medium', type: 'security_risk' },
    { word: 'exploit', severity: 'high', type: 'security_risk' },
    { word: 'ignore previous instructions', severity: 'medium', type: 'prompt_injection' },
    { word: 'bomb', severity: 'critical', type: 'violence' },
    { word: 'kill', severity: 'high', type: 'violence' },
    { word: 'suicide', severity: 'critical', type: 'self_harm' },
    // Add more Arabic/English keywords as needed
    { word: 'اختراق', severity: 'medium', type: 'security_risk' },
    { word: 'قنبلة', severity: 'critical', type: 'violence' },
    { word: 'قتل', severity: 'high', type: 'violence' },
];

export function checkContent(content: string): SecurityCheckResult {
    const lowerContent = content.toLowerCase();

    for (const item of FORBIDDEN_KEYWORDS) {
        if (lowerContent.includes(item.word)) {
            return {
                flagged: true,
                violationType: item.type,
                severity: item.severity as any,
                reason: `Detected forbidden keyword: "${item.word}"`
            };
        }
    }

    return { flagged: false };
}

export async function logSecurityEvent(userId: string | undefined, content: string, result: SecurityCheckResult) {
    if (!result.flagged) return;

    try {
        const { error } = await supabase.from('security_logs').insert({
            user_id: userId || null,
            content: content,
            violation_type: result.violationType,
            severity: result.severity,
            metadata: { reason: result.reason },
        });

        if (error) {
            console.error('Failed to log security event:', error);
        }
    } catch (err) {
        console.error('Error logging security event:', err);
    }
}

export function resolveSafetyError(rawError: string): string {
    const technicalKeywords = [
        'moderation', 'flagged', 'illicit', 'violent',
        'safety policy', 'blocked', 'content filter',
        'prohibited', 'sensitive'
    ];

    const isTechnicalError = technicalKeywords.some(keyword =>
        rawError.toLowerCase().includes(keyword)
    );

    if (isTechnicalError) {
        return `نعتذر، لا يمكنني تزويدك بمعلومات حول هذا الطلب تحديداً لالتزامي بسياسات السلامة والأمان.

بإمكاني مساعدتك في:
1- الحصول على معلومات عامة أو تعليمية حول الجوانب المسموح بها في هذا الموضوع.
2- استكشاف بدائل قانونية وآمنة تماماً لتحقيق هدفك.
3- الإجابة على أي استفسارات أخرى في مجالات مختلفة.

كيف يمكنني مساعدتك بشكل آخر؟`;
    }

    return rawError;
}
