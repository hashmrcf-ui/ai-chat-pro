'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Type } from 'lucide-react';

export default memo(function TextNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`
                min-w-[200px] bg-[#18181b] border-2 rounded-xl shadow-xl transition-all
                ${selected ? 'border-gray-400 shadow-gray-500/30' : 'border-gray-600/50 hover:border-gray-500'}
            `}
        >
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />

            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700">
                <Type className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-white">ملاحظة</span>
            </div>

            <div className="p-4">
                <textarea
                    className="w-full bg-[#0a0a0a] border border-gray-600/30 rounded-lg px-3 py-2 text-sm text-white resize-none"
                    rows={4}
                    placeholder="اكتب ملاحظاتك هنا..."
                    defaultValue={data.content || ''}
                />
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
        </div>
    );
});
