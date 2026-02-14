import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsAdmin } from '@/lib/auth';
import { Loader2, Save, Undo, Sparkles, AlertCircle, ToggleLeft, ToggleRight, Mic, Image as ImageIcon, UserPlus, Globe } from 'lucide-react';
import { getSystemPrompt, updateSystemPrompt, getAppFeatures, updateAppConfig, AppFeatures } from '@/lib/config';

export default function AdminSettings() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // System Prompt
    const [prompt, setPrompt] = useState('');
    const [originalPrompt, setOriginalPrompt] = useState('');

    // Feature Flags
    const [features, setFeatures] = useState<AppFeatures>({
        voiceEnabled: true,
        imagesEnabled: true,
        registrationEnabled: true,
        defaultLanguage: 'ar-SA'
    });

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const init = async () => {
            const admin = await checkIsAdmin();
            if (!admin) {
                router.push('/');
                return;
            }

            try {
                const [currentPrompt, currentFeatures] = await Promise.all([
                    getSystemPrompt(),
                    getAppFeatures()
                ]);

                setPrompt(currentPrompt);
                setOriginalPrompt(currentPrompt);
                setFeatures(currentFeatures);

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
            // Save Prompt
            await updateSystemPrompt(prompt);

            // Save Features
            await Promise.all([
                updateAppConfig('feature_voice_enabled', String(features.voiceEnabled)),
                updateAppConfig('feature_image_generation_enabled', String(features.imagesEnabled)),
                updateAppConfig('public_registration_enabled', String(features.registrationEnabled)),
                updateAppConfig('system_language', features.defaultLanguage)
            ]);

            setMessage({ type: 'success', text: 'Settings saved successfully!' });
            setOriginalPrompt(prompt);
        } catch (error) {
            console.error('Error saving:', error);
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setPrompt(originalPrompt);
        // We could also re-fetch features here if needed, but keeping simple for now
        setMessage(null);
    };

    const toggleFeature = (key: keyof AppFeatures) => {
        setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
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
                        Customize system prompts and toggle application features.
                    </p>
                </header>

                <div className="grid gap-8">
                    {/* Prompt Section */}
                    <div className="bg-white dark:bg-[#212121] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            System Personality
                        </h2>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                System Prompt (The "Brain")
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full h-48 p-4 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
                                placeholder="Enter the system prompt here..."
                            />
                        </div>
                    </div>

                    {/* Features Section */}
                    <div className="bg-white dark:bg-[#212121] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            Feature Toggles
                        </h2>
                        <div className="space-y-6">
                            {/* Voice Chat */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#1a1a1a]">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                        <Mic className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Voice Chat</h3>
                                        <p className="text-xs text-gray-500">Enable microphone input and voice output.</p>
                                    </div>
                                </div>
                                <button onClick={() => toggleFeature('voiceEnabled')} className="text-indigo-600 dark:text-indigo-400">
                                    {features.voiceEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                                </button>
                            </div>

                            {/* Image Generation */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#1a1a1a]">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
                                        <ImageIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Image Generation</h3>
                                        <p className="text-xs text-gray-500">Allow users to generate images with AI.</p>
                                    </div>
                                </div>
                                <button onClick={() => toggleFeature('imagesEnabled')} className="text-indigo-600 dark:text-indigo-400">
                                    {features.imagesEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                                </button>
                            </div>

                            {/* Public Registration */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#1a1a1a]">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                        <UserPlus className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Public Registration</h3>
                                        <p className="text-xs text-gray-500">Allow new users to sign up freely.</p>
                                    </div>
                                </div>
                                <button onClick={() => toggleFeature('registrationEnabled')} className="text-indigo-600 dark:text-indigo-400">
                                    {features.registrationEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                                </button>
                            </div>

                            {/* Default Language */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#1a1a1a]">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Default Language</h3>
                                        <p className="text-xs text-gray-500">System interface default language (ar-SA).</p>
                                    </div>
                                </div>
                                <select
                                    value={features.defaultLanguage}
                                    onChange={(e) => setFeatures(prev => ({ ...prev, defaultLanguage: e.target.value }))}
                                    className="bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-sm outline-none focus:border-indigo-500"
                                >
                                    <option value="ar-SA">Arabic (SA)</option>
                                    <option value="en-US">English (US)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={`mt-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {message.type === 'success' ? <Save className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {message.text}
                    </div>
                )}

                <div className="flex items-center gap-4 mt-6">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save All Changes
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-all flex items-center gap-2"
                    >
                        <Undo className="w-4 h-4" />
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}
