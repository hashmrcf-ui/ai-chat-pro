'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Sparkles, Settings } from 'lucide-react';
import { features } from '@/lib/features';

export default memo(function AINode({ data, selected }: NodeProps) {
    return (
        <div
            className={`
                group relative min-w-[250px] bg-gradient-to-br from-indigo-950/90 to-purple-950/90
                border-2 rounded-xl shadow-xl backdrop-blur-sm transition-all
                ${selected ? 'border-indigo-400 shadow-indigo-500/50' : 'border-indigo-600/50 hover:border-indigo-500'}
            `}
        >
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-indigo-400" />

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-indigo-500/30">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-semibold text-white">AI Agent</span>
                <button className="ml-auto p-1 hover:bg-indigo-500/20 rounded">
                    <Settings className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Model Selector */}
                <div>
                    <label className="text-xs text-gray-400 mb-1 block">النموذج</label>
                    <select className="w-full bg-[#0a0a0a] border border-indigo-500/30 rounded-lg px-3 py-2 text-sm text-white">
                        {features.ai.models.map((model) => (
                            <option key={model} value={model}>
                                {model.split('/')[1] || model}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Prompt */}
                <div>
                    <label className="text-xs text-gray-400 mb-1 block">الأمر</label>
                    <textarea
                        className="w-full bg-[#0a0a0a] border border-indigo-500/30 rounded-lg px-3 py-2 text-sm text-white resize-none"
                        rows={3}
                        placeholder="اكتب أمرك هنا..."
                        defaultValue={data.prompt || ''}
                    />
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-400" />
        </div>
    );
});
