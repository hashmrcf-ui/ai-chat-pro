'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Clock, User, CheckCircle2, AlertCircle } from 'lucide-react';

interface StageNodeData {
    label?: string;
    name?: string;
    department?: string;
    owner_role?: string;
    sla_hours?: number;
    type?: 'task' | 'approval' | 'condition';
    raci?: {
        responsible?: string[];
        approver?: string[];
    };
}

export default memo(function StageNode({ data, selected }: NodeProps<StageNodeData>) {
    const isApproval = data.type === 'approval';
    const stageName = data.name || data.label || 'Stage';
    const slaHours = data.sla_hours || 0;
    const slaDays = Math.floor(slaHours / 24);
    const remainingHours = slaHours % 24;

    const bgColor = isApproval
        ? 'from-amber-950/90 to-orange-950/90'
        : 'from-blue-950/90 to-indigo-950/90';

    const borderColor = isApproval
        ? selected ? 'border-amber-400' : 'border-amber-600/50'
        : selected ? 'border-blue-400' : 'border-blue-600/50';

    return (
        <div
            className={`
                group relative min-w-[280px] bg-gradient-to-br ${bgColor}
                border-2 rounded-xl shadow-xl backdrop-blur-sm transition-all
                ${borderColor} ${selected ? 'shadow-blue-500/50' : ''}
            `}
        >
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-400" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-blue-500/30">
                <div className="flex items-center gap-2">
                    {isApproval ? (
                        <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-blue-400" />
                    )}
                    <span className="text-sm font-semibold text-white">{stageName}</span>
                </div>
                {data.department && (
                    <span className="text-xs text-gray-400 px-2 py-1 bg-[#0a0a0a]/50 rounded">
                        {data.department}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-2">
                {/* Owner */}
                {data.owner_role && (
                    <div className="flex items-center gap-2 text-xs">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-300">{data.owner_role}</span>
                    </div>
                )}

                {/* SLA */}
                {slaHours > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-300">
                            {slaDays > 0 && `${slaDays}d `}
                            {remainingHours > 0 && `${remainingHours}h`}
                        </span>
                    </div>
                )}

                {/* RACI Preview */}
                {data.raci && (
                    <div className="flex gap-1 mt-2">
                        {data.raci.responsible && data.raci.responsible.length > 0 && (
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30">
                                R
                            </span>
                        )}
                        {data.raci.approver && data.raci.approver.length > 0 && (
                            <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30">
                                A
                            </span>
                        )}
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-400" />
        </div>
    );
});
