import { useState, useEffect } from 'react';
import { Check, Circle, Loader2, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface Step {
    id: string;
    label: string;
    status: 'pending' | 'loading' | 'completed' | 'error';
    description?: string;
}

interface StepsVisualizerProps {
    steps: Step[];
    currentStepId: string;
    onComplete?: () => void;
}

export function StepsVisualizer({ steps, currentStepId, onComplete }: StepsVisualizerProps) {

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-gray-800 dark:text-white">
                <PlayCircle className="w-5 h-5 text-blue-500" />
                Workflow Progress
            </h3>

            <div className="space-y-4">
                {steps.map((step, index) => {
                    const isCurrent = step.id === currentStepId;
                    const isCompleted = step.status === 'completed';
                    const isPending = step.status === 'pending';
                    const isError = step.status === 'error';

                    return (
                        <div
                            key={step.id}
                            className={cn(
                                "relative flex items-start gap-4 p-4 rounded-lg transition-all duration-500",
                                isCurrent
                                    ? "bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500"
                                    : "border-l-4 border-transparent",
                                isPending && "opacity-50"
                            )}
                        >
                            {/* Icon Indicator */}
                            <div className="shrink-0 mt-0.5">
                                {isCompleted ? (
                                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                ) : isCurrent ? (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-blue-600">
                                        <Loader2 size={20} className="animate-spin" />
                                    </div>
                                ) : isError ? (
                                    <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                                        <span className="font-bold">!</span>
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-700" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className={cn(
                                        "font-medium text-sm transition-colors",
                                        isCurrent ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300",
                                        isCompleted && "text-gray-500 dark:text-gray-500 line-through"
                                    )}>
                                        {step.label}
                                    </h4>
                                    {isCurrent && (
                                        <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full animate-pulse">
                                            Processing
                                        </span>
                                    )}
                                </div>

                                <AnimatePresence>
                                    {(isCurrent || step.description) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                                {step.description || "In progress..."}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
