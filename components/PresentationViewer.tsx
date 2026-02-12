'use client';

import { useState } from 'react';
import { Presentation } from '@/data/presentation-templates';
import { exportToPDF, exportToPPTX, exportToHTML, savePresentation } from '@/lib/presentation';
import { ChevronLeft, ChevronRight, X, Download, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresentationViewerProps {
    presentation: Presentation;
    onClose?: () => void; // Made optional for embedded mode
    isEmbedded?: boolean;
}

export function PresentationViewer({ presentation, onClose, isEmbedded = false }: PresentationViewerProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isExporting, setIsExporting] = useState(false);

    const handlePrevSlide = () => {
        if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
    };

    const handleNextSlide = () => {
        if (currentSlide < presentation.slides.length - 1) setCurrentSlide(currentSlide + 1);
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            await exportToPDF(presentation);
        } catch (error) {
            alert('فشل في تصدير PDF');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPPTX = async () => {
        setIsExporting(true);
        try {
            await exportToPPTX(presentation);
        } catch (error) {
            alert('فشل في تصدير PowerPoint');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportHTML = () => {
        const html = exportToHTML(presentation);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${presentation.title}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSave = () => {
        savePresentation(presentation);
        alert('تم حفظ العرض التقديمي!');
    };

    const slide = presentation.slides[currentSlide];

    return (
        <div className={cn(
            "flex flex-col bg-gray-900 text-white overflow-hidden",
            isEmbedded ? "w-full h-full rounded-xl" : "fixed inset-0 z-50"
        )}>
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-700 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                    <h2 className="font-semibold text-sm md:text-base truncate">{presentation.title}</h2>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        className="p-2 md:px-3 md:py-1.5 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 transition-colors text-xs md:text-sm"
                        title="Save"
                    >
                        <Save className="w-4 h-4" />
                        <span className="hidden md:inline">حفظ</span>
                    </button>

                    <div className="relative group">
                        <button
                            disabled={isExporting}
                            className="p-2 md:px-3 md:py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-xs md:text-sm"
                            title="Export"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden md:inline">تصدير</span>
                        </button>

                        <div className="absolute left-0 top-full mt-2 bg-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-32 z-50 border border-gray-700">
                            <button
                                onClick={handleExportPDF}
                                className="w-full px-4 py-2 hover:bg-gray-700 rounded-t-lg text-right transition-colors text-xs"
                            >
                                PDF
                            </button>
                            <button
                                onClick={handleExportPPTX}
                                className="w-full px-4 py-2 hover:bg-gray-700 text-right transition-colors text-xs"
                            >
                                PowerPoint
                            </button>
                            <button
                                onClick={handleExportHTML}
                                className="w-full px-4 py-2 hover:bg-gray-700 rounded-b-lg text-right transition-colors text-xs"
                            >
                                HTML
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Stage (Slide Preview) */}
            <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4 md:p-8 bg-gray-950/50">
                <div
                    className="w-full max-w-4xl aspect-video rounded-xl shadow-2xl flex flex-col justify-center p-8 md:p-12 transition-all duration-300"
                    style={{
                        backgroundColor: slide.backgroundColor || '#ffffff',
                        color: slide.textColor || '#000000',
                        fontSize: isEmbedded ? '0.8rem' : '1rem' // Scale down font slightly in embedded mode
                    }}
                >
                    <h1 className="text-3xl md:text-5xl font-bold mb-4 md:mb-8 text-center">{slide.title}</h1>
                    <div className="space-y-3 md:space-y-6">
                        {slide.content.map((line, index) => (
                            <p key={index} className="text-lg md:text-2xl text-center opacity-90">{line}</p>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700 backdrop-blur-sm flex items-center justify-between shrink-0">
                <button
                    onClick={handlePrevSlide}
                    disabled={currentSlide === 0}
                    className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>

                <span className="text-sm font-mono text-gray-400">
                    {currentSlide + 1} / {presentation.slides.length}
                </span>

                <button
                    onClick={handleNextSlide}
                    disabled={currentSlide === presentation.slides.length - 1}
                    className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
