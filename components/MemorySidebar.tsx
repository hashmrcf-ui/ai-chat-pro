'use client';
import { useEffect, useState } from 'react';
import { getTopMemories } from '@/lib/memories';
import { Brain, RefreshCw, Trash2, Plus } from 'lucide-react';

export default function MemorySidebar({ userId }: { userId: string }) {
    const [memories, setMemories] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [newFact, setNewFact] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const loadMemories = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            // Using a limit of 5 for Sidebar display
            const data = await getTopMemories(userId, 5);
            setMemories(data);
        } catch (e) {
            console.error('Failed to load memories', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFact = async () => {
        if (!newFact.trim() || !userId) return;
        setIsSaving(true);
        try {
            const { saveMemory } = await import('@/lib/memories');
            const success = await saveMemory(userId, newFact.trim(), 5);
            if (success) {
                setNewFact('');
                loadMemories();
            }
        } catch (e) {
            console.error('Manual save failed', e);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        loadMemories();
        // Refresh every 30 seconds to show newly saved facts
        const interval = setInterval(loadMemories, 30000);
        return () => clearInterval(interval);
    }, [userId]);

    return (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <Brain className="w-3.5 h-3.5" />
                    ذاكرتي (My Memory)
                </div>
                <button onClick={loadMemories} disabled={loading} className="text-gray-400 hover:text-indigo-500 transition-colors">
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Manual Entry */}
            <div className="px-2 mb-4">
                <div className="flex gap-1">
                    <input
                        value={newFact}
                        onChange={(e) => setNewFact(e.target.value)}
                        placeholder="أضف حقيقة يدوياً..."
                        className="flex-1 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1 text-[10px] outline-none focus:border-indigo-500 text-gray-600 dark:text-gray-300"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddFact()}
                    />
                    <button
                        onClick={handleAddFact}
                        disabled={isSaving || !newFact.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded-lg disabled:opacity-50 transition-all shadow-sm"
                    >
                        {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    </button>
                </div>
            </div>

            <div className="space-y-2 px-2">
                {memories.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic">لا توجد حقائق محفوظة بعد. أخبر الذكاء الاصطناعي شيئاً عنك!</p>
                ) : (
                    memories.map((m, i) => (
                        <div key={i} className="group relative">
                            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-400 leading-tight">
                                {m}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <p className="mt-3 px-2 text-[9px] text-gray-500 italic leading-tight">
                * يتم تحديث هذه القائمة تلقائياً عند حفظ الذكاء الاصطناعي لمعلومات جديدة.
            </p>
        </div>
    );
}
