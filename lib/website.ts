import { Website } from '@/data/website-templates';

export async function generateWebsite(
    description: string,
    category: string,
    colorScheme: string,
    pages: number,
    features: string[]
): Promise<Website> {
    try {
        const response = await fetch('/api/website', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description,
                category,
                colorScheme,
                pages,
                features
            }),
        });

        if (!response.ok) {
            let errorMessage = `خطأ في الخادم (${response.status})`;
            try {
                const error = await response.json();
                console.error('API Error Response:', error);

                // Extract error message from various possible formats
                if (typeof error === 'string') {
                    errorMessage = error;
                } else if (error.details) {
                    errorMessage = typeof error.details === 'string'
                        ? error.details
                        : JSON.stringify(error.details);
                } else if (error.error) {
                    errorMessage = typeof error.error === 'string'
                        ? error.error
                        : JSON.stringify(error.error);
                } else if (error.message) {
                    errorMessage = error.message;
                }
            } catch (e) {
                console.error('Failed to parse error response:', e);
            }
            throw new Error(errorMessage);
        }

        return response.json();
    } catch (error: any) {
        console.error('Generate website error:', error);
        // Re-throw with better message
        if (error.message) {
            throw error;
        }
        throw new Error('فشل الاتصال بالخادم. تأكد من تشغيل الخادم بـ npm run dev');
    }
}

export function saveWebsite(website: Website): void {
    const saved = getSavedWebsites();
    saved.push(website);
    localStorage.setItem('saved_websites', JSON.stringify(saved));
}

export function getSavedWebsites(): Website[] {
    const saved = localStorage.getItem('saved_websites');
    return saved ? JSON.parse(saved) : [];
}

export function deleteWebsite(id: string): void {
    const saved = getSavedWebsites();
    const filtered = saved.filter(w => w.id !== id);
    localStorage.setItem('saved_websites', JSON.stringify(filtered));
}

export function createPreviewHTML(website: Website): string {
    const htmlFile = website.files['index.html'] || '';
    const cssFile = website.files['styles.css'] || '';
    const jsFile = website.files['script.js'] || '';

    // Inject CSS and JS into HTML
    return htmlFile
        .replace('</head>', `<style>${cssFile}</style></head>`)
        .replace('</body>', `<script>${jsFile}</script></body>`);
}

export async function exportWebsiteAsZip(website: Website): Promise<void> {
    // For now, we'll download files individually
    // In production, use JSZip library
    Object.entries(website.files).forEach(([filename, content]) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    });
}

export function copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
}
