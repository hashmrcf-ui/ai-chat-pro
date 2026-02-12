'use client';

import { Presentation } from '@/data/presentation-templates';
import { Sparkles } from 'lucide-react';

interface ToolsBarProps {
    onToolSelect: (tool: string) => void;
    activeTool: string | null;
}

export function ToolsBar({ onToolSelect, activeTool }: ToolsBarProps) {
    const tools = [
        { id: 'design', icon: '🎨', label: 'تصميم', labelEn: 'Design' },
        { id: 'app', icon: '📱', label: 'تطوير التطبيقات', labelEn: 'App Development' },
        { id: 'website', icon: '🌐', label: 'إنشاء موقع ويب', labelEn: 'Website Builder' },
        { id: 'presentation', icon: '📊', label: 'إنشاء عروض تقديمية', labelEn: 'Presentations' }
    ];

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2f2f2f] px-4 py-3">
            <div className="flex items-center gap-2 overflow-x-auto">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => onToolSelect(tool.id)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap
                            ${activeTool === tool.id
                                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-2 border-violet-500'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }
                        `}
                    >
                        <span className="text-xl">{tool.icon}</span>
                        <span className="text-sm font-medium">{tool.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
