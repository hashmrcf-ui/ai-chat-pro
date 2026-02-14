'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsAdmin } from '@/lib/auth';
import { getAllModelsAdmin, toggleModelActive, setModelDefault, addNewModel, AIModel } from '@/lib/models';
import { Loader2, Cpu, Plus, Star, ToggleLeft, ToggleRight, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function ModelManagementPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [models, setModels] = useState<AIModel[]>([]);

    // New Model Form State
    const [isAdding, setIsAdding] = useState(false);
    const [newModelId, setNewModelId] = useState('');
    const [newModelName, setNewModelName] = useState('');
    const [newProvider, setNewProvider] = useState('openrouter');

    useEffect(() => {
        const init = async () => {
            const admin = await checkIsAdmin();
            if (!admin) {
                router.push('/');
                return;
            }
            await fetchModels();
        };
        init();
    }, [router]);

    const fetchModels = async () => {
        setIsLoading(true);
        const data = await getAllModelsAdmin();
        setModels(data);
        setIsLoading(false);
    };

    const handleToggleActive = async (model: AIModel) => {
        await toggleModelActive(model.id, !model.is_active);
        // Optimistic update or refresh
        fetchModels();
    };

    const handleSetDefault = async (model: AIModel) => {
        if (model.is_default) return;
        await setModelDefault(model.id);
        fetchModels();
    };

    const handleAddModel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newModelId || !newModelName) return;

        const success = await addNewModel(newModelId, newModelName, newProvider);
        if (success) {
            setIsAdding(false);
            setNewModelId('');
            setNewModelName('');
            fetchModels();
        } else {
            alert('Failed to add model');
        }
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
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <Link href="/admin" className="flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 mb-2">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Cpu className="w-8 h-8 text-indigo-500" />
                            AI Models
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Configure available AI models for users.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Model
                    </button>
                </header>

                {isAdding && (
                    <div className="mb-8 bg-white dark:bg-[#212121] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                        <h3 className="font-bold mb-4">Add New Model</h3>
                        <form onSubmit={handleAddModel} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Display Name</label>
                                <input
                                    type="text"
                                    value={newModelName}
                                    onChange={e => setNewModelName(e.target.value)}
                                    placeholder="e.g. GPT-4o"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Model ID (API String)</label>
                                <input
                                    type="text"
                                    value={newModelId}
                                    onChange={e => setNewModelId(e.target.value)}
                                    placeholder="e.g. openai/gpt-4o"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Provider</label>
                                <select
                                    value={newProvider}
                                    onChange={e => setNewProvider(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent"
                                >
                                    <option value="openrouter">OpenRouter</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                    <option value="ollama">Ollama (Local)</option>
                                </select>
                            </div>
                            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                Save
                            </button>
                        </form>
                    </div>
                )}

                <div className="bg-white dark:bg-[#212121] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="p-4 font-medium text-gray-500 text-sm">Active</th>
                                <th className="p-4 font-medium text-gray-500 text-sm">Full Name</th>
                                <th className="p-4 font-medium text-gray-500 text-sm">Model ID</th>
                                <th className="p-4 font-medium text-gray-500 text-sm">Provider</th>
                                <th className="p-4 font-medium text-gray-500 text-sm">Default</th>
                                <th className="p-4 font-medium text-gray-500 text-sm text-right">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {models.map((model) => (
                                <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleToggleActive(model)}
                                            className={`transition-colors ${model.is_active ? 'text-green-500' : 'text-gray-300'}`}
                                        >
                                            {model.is_active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                        </button>
                                    </td>
                                    <td className="p-4 font-medium text-gray-900 dark:text-white">
                                        {model.name}
                                    </td>
                                    <td className="p-4 text-xs font-mono text-gray-500">
                                        {model.model_id}
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                        {model.provider}
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleSetDefault(model)}
                                            disabled={!model.is_active}
                                            className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${model.is_default ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                                }`}
                                        >
                                            <Star className="w-5 h-5" />
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        {/* Simplified: No delete for this demo, or add delete logic later if needed */}
                                        <button className="text-gray-300 hover:text-red-500 transition-colors" title="Delete feature pending">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
