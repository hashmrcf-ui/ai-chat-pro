'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';

export default function GenerateWorkflowPage() {
    const router = useRouter();
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!input.trim()) {
            setError('الرجاء إدخال وصف للعملية');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/workflow/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: input }),
            });

            if (!response.ok) {
                throw new Error('فشل في توليد الـ Workflow');
            }

            const data = await response.json();

            // Save to localStorage
            const workflowId = `workflow-${Date.now()}`;
            localStorage.setItem(workflowId, JSON.stringify(data.workflow));

            // Redirect to workflow editor
            router.push(`/workflow?load=${workflowId}`);
        } catch (err: any) {
            setError(err.message || 'حدث خطأ غير متوقع');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#27272a] text-white">
            <div className="container mx-auto px-6 py-12 max-w-4xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm font-medium text-indigo-400">AI Workflow Generator</span>
                    </div>
                    <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        مولّد سير العمل الذكي
                    </h1>
                    <p className="text-xl text-gray-400">
                        اشرح العملية بالعربي، ودع الـ AI يبني الـ Workflow الكامل
                    </p>
                </div>

                {/* Input Card */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-8 shadow-2xl">
                    <label className="block text-sm font-medium text-gray-400 mb-3">
                        وصف العملية
                    </label>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full h-64 bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder="مثال:&#10;&#10;نريد إطلاق حملة لمنتج جديد خلال 14 يوم.&#10;الأقسام: التسويق، المبيعات، الحسابات.&#10;الهدف: زيادة المبيعات 20%.&#10;يتطلب موافقة على الميزانية."
                    />

                    {error && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>جاري الإنشاء...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                <span>إنشاء Workflow</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>

                {/* Examples */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-indigo-400 mb-2">مثال: حملة تسويقية</h3>
                        <p className="text-sm text-gray-400">
                            نريد إطلاق حملة إعلانية على السوشيال ميديا خلال أسبوع. الأقسام: التصميم، التسويق، المبيعات.
                        </p>
                    </div>
                    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-purple-400 mb-2">مثال: توظيف موظف</h3>
                        <p className="text-sm text-gray-400">
                            نحتاج لتوظيف مطور Full Stack خلال 30 يوم. الأقسام: HR، التقنية، الإدارة. يتطلب موافقة المدير.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
