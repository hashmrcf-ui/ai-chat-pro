'use client';

import { useState } from 'react';
import { presentationTemplates, keywordSuggestions, Presentation } from '@/data/presentation-templates';
import { generatePresentation } from '@/lib/presentation';
import { Sparkles, ChevronDown, Monitor, LayoutTemplate, Type, FileText, RotateCcw } from 'lucide-react';
import { PresentationViewer } from './PresentationViewer';
import { cn } from '@/lib/utils';

export function PresentationBuilder() {
    const [topic, setTopic] = useState('');
    const [slideCount, setSlideCount] = useState(8);
    const [selectedTemplate, setSelectedTemplate] = useState('professional');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPresentation, setGeneratedPresentation] = useState<Presentation | null>(null);

    const handleGenerate = async () => {
        if (!topic.trim()) {
            alert('الرجاء إدخال موضوع العرض التقديمي');
            return;
        }

        setIsGenerating(true);
        try {
            console.log('Generating presentation for:', topic);
            const presentation = await generatePresentation(topic, slideCount, selectedTemplate);
            console.log('Presentation generated:', presentation);
            setGeneratedPresentation(presentation);
        } catch (error: any) {
            console.error('Error generating presentation:', error);
            const errorMessage = error.message || 'فشل في إنشاء العرض التقديمي';
            alert(`خطأ: ${errorMessage}\n\nحاول مرة أخرى أو تحقق من اتصال الإنترنت.`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex h-full w-full bg-gray-50 dark:bg-[#212121] overflow-hidden">

            {/* Left Panel: Controls (40%) */}
            <div className="w-[400px] shrink-0 border-l border-gray-200 dark:border-gray-700 h-full overflow-y-auto bg-white dark:bg-[#1e1e1e] shadow-xl z-10 flex flex-col">
                <div className="p-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Monitor className="w-6 h-6 text-violet-500" />
                            بناء عرض تقديمي
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            حول أفكارك إلى شرائح احترافية في ثوانٍ
                        </p>
                    </div>

                    {/* Topic Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            موضوع العرض
                        </label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="عن ماذا يتحدث عرضك التقديمي؟ (مثلاً: مستقبل الذكاء الاصطناعي في التعليم)"
                            className="w-full h-28 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2f2f2f] text-gray-900 dark:text-white focus:border-violet-500 focus:outline-none resize-none text-sm leading-relaxed"
                        />
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={!topic.trim() || isGenerating}
                        className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg mb-8 hover:shadow-xl"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>جاري الإنشاء...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                <span>{generatedPresentation ? 'إعادة إنشاء' : 'إنشاء العرض'}</span>
                            </>
                        )}
                    </button>

                    {/* Configuration Options */}
                    <div className="space-y-6">
                        {/* Slide Count */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" /> عدد الشرائح
                            </label>
                            <div className="relative">
                                <select
                                    value={slideCount}
                                    onChange={(e) => setSlideCount(Number(e.target.value))}
                                    className="w-full appearance-none px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#2f2f2f] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-violet-500 focus:outline-none cursor-pointer text-sm"
                                >
                                    <option value={5}>5 شرائح (ملخص)</option>
                                    <option value={8}>8 شرائح (قياسي)</option>
                                    <option value={12}>12 شريحة (مفصل)</option>
                                    <option value={15}>15 شريحة (شامل)</option>
                                </select>
                                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Template Selection */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-1">
                                <LayoutTemplate className="w-3.5 h-3.5" /> القالب والتصميم
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {presentationTemplates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => setSelectedTemplate(template.id)}
                                        className={cn(
                                            "group p-3 rounded-xl border text-right transition-all relative overflow-hidden",
                                            selectedTemplate === template.id
                                                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2f2f2f] hover:border-violet-300"
                                        )}
                                    >
                                        <div
                                            className="h-2 w-full rounded-full mb-2 opacity-80"
                                            style={{ backgroundColor: template.colors.primary }}
                                        />
                                        <span className={cn(
                                            "text-xs font-bold block mb-0.5",
                                            selectedTemplate === template.id ? "text-violet-700 dark:text-violet-300" : "text-gray-700 dark:text-gray-300"
                                        )}>
                                            {template.nameAr}
                                        </span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">
                                            {template.descriptionAr}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Keyword Suggestions */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-1">
                                <Type className="w-3.5 h-3.5" /> أفكار مقترحة
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {keywordSuggestions.map((suggestion) => (
                                    <button
                                        key={suggestion.id}
                                        onClick={() => setTopic(suggestion.textAr)}
                                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 transition-colors"
                                    >
                                        {suggestion.textAr}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Preview (60%) */}
            <div className="flex-1 bg-gray-100 dark:bg-black/50 flex flex-col h-full overflow-hidden relative">
                {generatedPresentation ? (
                    <div className="w-full h-full p-6">
                        <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800">
                            <PresentationViewer
                                presentation={generatedPresentation}
                                isEmbedded={true}
                                onClose={() => setGeneratedPresentation(null)}
                            />
                        </div>
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 p-8 text-center bg-gray-50/50 dark:bg-black/20">
                        <div className="w-32 h-32 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <Monitor className="w-16 h-16 opacity-30" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-gray-700 dark:text-gray-300">منطقة المعاينة</h3>
                        <p className="max-w-md mx-auto text-gray-500 font-medium">
                            أدخل موضوع العرض والإعدادات في القائمة الجانبية، واضغط على "إنشاء" لمشاهدة شرائحك هنا.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
