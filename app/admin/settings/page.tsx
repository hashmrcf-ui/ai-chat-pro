'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsAdmin } from '@/lib/auth';
import { Loader2, Save, Undo, Sparkles, AlertCircle } from 'lucide-react';
import { getSystemPrompt, updateSystemPrompt } from '@/lib/config';

export default function AdminSettings() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [originalPrompt, setOriginalPrompt] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const init = async () => {
            const admin = await checkIsAdmin();
            if (!admin) {
                router.push('/');
                return;
            }

            try {
                // Fetch current prompt via API or Server Action in improved version
                // For now, we will use a client-side fetch wrapper or direct call if allowed (RLS permits read)
                // However, updateSystemPrompt is a server-side logic wrapper usually, but here we imported from lib/config
                // Note: lib/config uses supabase directly which is fine for client if keys are public, 
                // but config update requires admin rights which RLS handles.

                // Since getSystemPrompt is async, we can call it. 
                // BUT: importing directly from lib/config might run on client. 
                // We need to ensure lib/config is client-safe or use an API route.
                // For simplicity in this "No-Mess-Up" approach, we'll try direct invocation 
                // assuming lib/config uses the singleton supabase client.

                const current = await getSystemPrompt();
                setPrompt(current);
                setOriginalPrompt(current);
            } catch (error) {
                console.error('Failed to load settings:', error);
                setMessage({ type: 'error', text: 'Failed to load settings.' });
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, [router]);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);

        try {
            const success = await updateSystemPrompt(prompt);
            if (success) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
                setOriginalPrompt(prompt);
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings.' });
            }
        } catch (error) {
            console.error('Error saving:', error);
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setPrompt(originalPrompt);
        setMessage(null);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#1a1a1a]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a] p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-indigo-500" />
                        AI Settings & Customization
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Customize the behavior and persona of your AI assistant.
                    </p>
                </header>

                <div className="bg-white dark:bg-[#212121] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            System Prompt (The "Brain")
                        </label>
                        <p className="text-xs text-gray-500 mb-4">
                            This instruction is sent to the AI before every conversation. It defines the AI's personality, tone, and constraints.
                        </p>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full h-64 p-4 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
                            placeholder="Enter the system prompt here..."
                        />
                    </div>

                    {message && (
                        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {message.type === 'success' ? <Save className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            {message.text}
                        </div>
                    )}

                    <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || prompt === originalPrompt}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                        <button
                            onClick={handleReset}
                            disabled={prompt === originalPrompt}
                            className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Undo className="w-4 h-4" />
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
