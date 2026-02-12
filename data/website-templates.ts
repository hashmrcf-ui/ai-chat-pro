export interface Website {
    id: string;
    title: string;
    description: string;
    category: string;
    colorScheme: string;
    files: {
        [filename: string]: string;
    };
    preview: string;
    createdAt: number;
}

export interface WebsiteCategory {
    id: string;
    nameAr: string;
    nameEn: string;
    icon: string;
    description: string;
}

export interface ColorScheme {
    id: string;
    nameAr: string;
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
}

export interface QuickSuggestion {
    id: number;
    textAr: string;
    textEn: string;
    category: string;
}

export const websiteCategories: WebsiteCategory[] = [
    {
        id: 'personal',
        nameAr: 'شخصي',
        nameEn: 'Personal',
        icon: '👤',
        description: 'موقع شخصي احترافي'
    },
    {
        id: 'business',
        nameAr: 'تجاري',
        nameEn: 'Business',
        icon: '💼',
        description: 'موقع للأعمال التجارية'
    },
    {
        id: 'ecommerce',
        nameAr: 'متجر',
        nameEn: 'E-commerce',
        icon: '🛍️',
        description: 'متجر إلكتروني'
    },
    {
        id: 'blog',
        nameAr: 'مدونة',
        nameEn: 'Blog',
        icon: '📝',
        description: 'مدونة شخصية'
    },
    {
        id: 'portfolio',
        nameAr: 'محفظة أعمال',
        nameEn: 'Portfolio',
        icon: '🎨',
        description: 'عرض الأعمال والمشاريع'
    },
    {
        id: 'landing',
        nameAr: 'صفحة هبوط',
        nameEn: 'Landing Page',
        icon: '📄',
        description: 'صفحة واحدة للتسويق'
    }
];

export const colorSchemes: ColorScheme[] = [
    {
        id: 'blue',
        nameAr: 'أزرق احترافي',
        primary: '#2563eb',
        secondary: '#3b82f6',
        accent: '#60a5fa',
        background: '#ffffff',
        text: '#1e293b'
    },
    {
        id: 'green',
        nameAr: 'أخضر طبيعي',
        primary: '#059669',
        secondary: '#10b981',
        accent: '#34d399',
        background: '#ffffff',
        text: '#1e293b'
    },
    {
        id: 'orange',
        nameAr: 'برتقالي حيوي',
        primary: '#ea580c',
        secondary: '#f97316',
        accent: '#fb923c',
        background: '#ffffff',
        text: '#1e293b'
    },
    {
        id: 'purple',
        nameAr: 'بنفسجي أنيق',
        primary: '#7c3aed',
        secondary: '#8b5cf6',
        accent: '#a78bfa',
        background: '#ffffff',
        text: '#1e293b'
    },
    {
        id: 'gray',
        nameAr: 'رمادي احترافي',
        primary: '#475569',
        secondary: '#64748b',
        accent: '#94a3b8',
        background: '#ffffff',
        text: '#1e293b'
    }
];

export const quickSuggestions: QuickSuggestion[] = [
    {
        id: 1,
        textAr: 'موقع شخصي لمصور فوتوغرافي مع معرض صور',
        textEn: 'Personal website for photographer with image gallery',
        category: 'portfolio'
    },
    {
        id: 2,
        textAr: 'صفحة هبوط لتطبيق جوال جديد',
        textEn: 'Landing page for new mobile app',
        category: 'landing'
    },
    {
        id: 3,
        textAr: 'موقع لمطعم مع قائمة الطعام ونظام الحجز',
        textEn: 'Restaurant website with menu and reservation system',
        category: 'business'
    },
    {
        id: 4,
        textAr: 'محفظة أعمال لمطور ويب',
        textEn: 'Portfolio for web developer',
        category: 'portfolio'
    },
    {
        id: 5,
        textAr: 'مدونة تقنية مع مقالات وتعليقات',
        textEn: 'Tech blog with articles and comments',
        category: 'blog'
    },
    {
        id: 6,
        textAr: 'صفحة قادمة قريباً لمنتج جديد',
        textEn: 'Coming soon page for new product',
        category: 'landing'
    }
];

export const websiteFeatures = [
    { id: 'contact', nameAr: 'نموذج اتصال', nameEn: 'Contact Form' },
    { id: 'gallery', nameAr: 'معرض صور', nameEn: 'Image Gallery' },
    { id: 'testimonials', nameAr: 'الشهادات', nameEn: 'Testimonials' },
    { id: 'social', nameAr: 'وسائل التواصل', nameEn: 'Social Media' },
    { id: 'map', nameAr: 'خريطة الموقع', nameEn: 'Location Map' },
    { id: 'newsletter', nameAr: 'النشرة البريدية', nameEn: 'Newsletter' }
];
