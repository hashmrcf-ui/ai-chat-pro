import { useState, useEffect } from 'react';
import { X, Check, Smile, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { storage, Project } from '@/lib/storage';

interface ProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onProjectCreated: (project: Project) => void;
    userId: string;
}

const EMOJI_OPTIONS = ['🚀', '💻', '🎨', '📝', '📊', '🛍️', '🎓', '🏥', '✈️', '🏠', '🎮', '🎵', '📷', '🍔', '⚽'];
const COLOR_OPTIONS = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-gray-500'
];

export function ProjectDialog({ isOpen, onClose, onProjectCreated, userId }: ProjectDialogProps) {
    const [name, setName] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('📁');
    const [selectedColor, setSelectedColor] = useState('bg-blue-500');
    const [error, setError] = useState('');

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setName('');
            setSelectedEmoji('📁');
            setSelectedColor('bg-blue-500');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Please enter a project name');
            return;
        }

        const newProject: Project = {
            id: Date.now().toString(),
            userId,
            name: name.trim(),
            icon: selectedEmoji,
            createdAt: Date.now()
        };

        // Save to storage
        storage.saveProject(newProject);

        onProjectCreated(newProject);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#252526]">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FolderPlus className="w-6 h-6 text-blue-500" />
                        New Project
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Website Redesign"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>

                    {/* Icon Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Icon
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-[#2f2f2f] rounded-xl border border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto scrollbar-hide">
                            {EMOJI_OPTIONS.map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setSelectedEmoji(emoji)}
                                    className={cn(
                                        "w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-all",
                                        selectedEmoji === emoji
                                            ? "bg-white dark:bg-gray-700 shadow-sm scale-110 border border-blue-500"
                                            : "hover:bg-gray-200 dark:hover:bg-gray-600"
                                    )}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            <Check size={18} />
                            Create Project
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
