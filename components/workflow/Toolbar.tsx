'use client';

import { Plus, Sparkles, Type, Image, Play, CheckCircle } from 'lucide-react';

interface ToolbarProps {
    onAddNode: (type: string) => void;
}

export default function Toolbar({ onAddNode }: ToolbarProps) {
    const nodeTypes = [
        { type: 'ai', label: 'AI', icon: Sparkles, color: 'indigo' },
        { type: 'text', label: 'نص', icon: Type, color: 'gray' },
        { type: 'image', label: 'صورة', icon: Image, color: 'purple' },
        { type: 'trigger', label: 'بداية', icon: Play, color: 'green' },
        { type: 'output', label: 'نتيجة', icon: CheckCircle, color: 'cyan' },
    ];

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl p-2 flex gap-2">
                {nodeTypes.map(({ type, label, icon: Icon, color }) => (
                    <button
                        key={type}
                        onClick={() => onAddNode(type)}
                        className={`
                            group flex items-center gap-2 px-4 py-2 rounded-lg
                            bg-${color}-500/10 hover:bg-${color}-500/20
                            border border-${color}-500/30 hover:border-${color}-500
                            transition-all duration-200
                        `}
                        title={`إضافة ${label}`}
                    >
                        <Icon className={`w-4 h-4 text-${color}-400`} />
                        <span className="text-sm font-medium text-white">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
