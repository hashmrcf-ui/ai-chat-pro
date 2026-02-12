export const presentationTemplates = [
    {
        id: 'professional',
        name: 'Professional',
        nameAr: 'احترافي',
        description: 'Clean and professional design',
        descriptionAr: 'تصميم نظيف واحترافي',
        thumbnail: '/templates/professional.png',
        colors: {
            primary: '#2563eb',
            secondary: '#64748b',
            background: '#ffffff',
            text: '#1e293b'
        }
    },
    {
        id: 'creative',
        name: 'Creative',
        nameAr: 'إبداعي',
        description: 'Vibrant and modern design',
        descriptionAr: 'تصميم حيوي وعصري',
        thumbnail: '/templates/creative.png',
        colors: {
            primary: '#8b5cf6',
            secondary: '#ec4899',
            background: '#faf5ff',
            text: '#1e1b4b'
        }
    },
    {
        id: 'educational',
        name: 'Educational',
        nameAr: 'تعليمي',
        description: 'Clear and informative design',
        descriptionAr: 'تصميم واضح ومعلوماتي',
        thumbnail: '/templates/educational.png',
        colors: {
            primary: '#10b981',
            secondary: '#3b82f6',
            background: '#f0fdf4',
            text: '#064e3b'
        }
    },
    {
        id: 'technical',
        name: 'Technical',
        nameAr: 'تقني',
        description: 'Dark and technical design',
        descriptionAr: 'تصميم داكن وتقني',
        thumbnail: '/templates/technical.png',
        colors: {
            primary: '#06b6d4',
            secondary: '#8b5cf6',
            background: '#0f172a',
            text: '#e2e8f0'
        }
    }
];

export const keywordSuggestions = [
    {
        id: 1,
        textAr: 'إنشاء عرض تقديمي حول تأثير الذكاء الاصطناعي على مستقبل العمل',
        textEn: 'Create a presentation about AI impact on the future of work'
    },
    {
        id: 2,
        textAr: 'إعداد وحدة تدريبية عن أفضل ممارسات الأمن السيبراني',
        textEn: 'Prepare a training module on cybersecurity best practices'
    },
    {
        id: 3,
        textAr: 'إنشاء عرض تقديمي حول تأثير الذكاء الاصطناعي على مستقبل العمل',
        textEn: 'Design a pitch deck for a startup seeking funding'
    },
    {
        id: 4,
        textAr: 'إنشاء عرض منتجات لحل يروج للأعمال بين الشركات',
        textEn: 'Create a product showcase for a B2B solution'
    }
];

export interface Slide {
    id: string;
    type: 'title' | 'content' | 'image' | 'quote' | 'conclusion';
    title: string;
    content: string[];
    image?: string;
    backgroundColor?: string;
    textColor?: string;
}

export interface Presentation {
    id: string;
    title: string;
    slides: Slide[];
    template: string;
    slideCount: number;
    createdAt: number;
}
