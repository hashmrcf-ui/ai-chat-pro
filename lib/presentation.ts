'use client';

import { Presentation, Slide } from '@/data/presentation-templates';
import jsPDF from 'jspdf';
import pptxgen from 'pptxgenjs';

// Generate presentation content using AI
export async function generatePresentation(
    topic: string,
    slideCount: number,
    template: string
): Promise<Presentation> {
    try {
        const response = await fetch('/api/presentation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, slideCount, template })
        });

        if (!response.ok) throw new Error('Failed to generate presentation');

        const data = await response.json();
        return data.presentation;
    } catch (error) {
        console.error('Error generating presentation:', error);
        throw error;
    }
}

// Export presentation to PDF
export async function exportToPDF(presentation: Presentation): Promise<void> {
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1920, 1080]
    });

    presentation.slides.forEach((slide, index) => {
        if (index > 0) pdf.addPage();

        // Background
        pdf.setFillColor(slide.backgroundColor || '#ffffff');
        pdf.rect(0, 0, 1920, 1080, 'F');

        // Title
        pdf.setFontSize(48);
        pdf.setTextColor(slide.textColor || '#000000');
        pdf.text(slide.title, 100, 150);

        // Content
        pdf.setFontSize(24);
        slide.content.forEach((line, i) => {
            pdf.text(line, 100, 250 + (i * 50));
        });
    });

    pdf.save(`${presentation.title}.pdf`);
}

// Export presentation to PPTX
export async function exportToPPTX(presentation: Presentation): Promise<void> {
    const pptx = new pptxgen();

    presentation.slides.forEach((slide) => {
        const pptSlide = pptx.addSlide();

        // Background
        pptSlide.background = { color: slide.backgroundColor || 'FFFFFF' };

        // Title
        pptSlide.addText(slide.title, {
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 1,
            fontSize: 44,
            bold: true,
            color: slide.textColor || '000000'
        });

        // Content
        const contentText = slide.content.join('\n');
        pptSlide.addText(contentText, {
            x: 0.5,
            y: 2,
            w: 9,
            h: 4,
            fontSize: 24,
            color: slide.textColor || '000000'
        });
    });

    await pptx.writeFile({ fileName: `${presentation.title}.pptx` });
}

// Export presentation to HTML
export function exportToHTML(presentation: Presentation): string {
    const slidesHTML = presentation.slides.map((slide, index) => `
        <div class="slide" style="background-color: ${slide.backgroundColor || '#fff'}; color: ${slide.textColor || '#000'};">
            <h1>${slide.title}</h1>
            <div class="content">
                ${slide.content.map(line => `<p>${line}</p>`).join('')}
            </div>
            <div class="slide-number">${index + 1} / ${presentation.slides.length}</div>
        </div>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${presentation.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .slide {
            width: 100vw;
            height: 100vh;
            padding: 60px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            page-break-after: always;
        }
        h1 { font-size: 3rem; margin-bottom: 2rem; }
        .content p { font-size: 1.5rem; margin: 1rem 0; }
        .slide-number {
            position: absolute;
            bottom: 30px;
            right: 30px;
            font-size: 1.2rem;
            opacity: 0.7;
        }
        @media print {
            .slide { page-break-after: always; }
        }
    </style>
</head>
<body>
    ${slidesHTML}
    <script>
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' && currentSlide < slides.length - 1) {
                currentSlide++;
                slides[currentSlide].scrollIntoView({ behavior: 'smooth' });
            } else if (e.key === 'ArrowLeft' && currentSlide > 0) {
                currentSlide--;
                slides[currentSlide].scrollIntoView({ behavior: 'smooth' });
            }
        });
    </script>
</body>
</html>
    `;
}

// Save presentation locally
export function savePresentation(presentation: Presentation): void {
    const presentations = getPresentations();
    presentations.push(presentation);
    localStorage.setItem('presentations', JSON.stringify(presentations));
}

// Get all presentations
export function getPresentations(): Presentation[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('presentations');
    return data ? JSON.parse(data) : [];
}

// Delete presentation
export function deletePresentation(id: string): void {
    const presentations = getPresentations().filter(p => p.id !== id);
    localStorage.setItem('presentations', JSON.stringify(presentations));
}
