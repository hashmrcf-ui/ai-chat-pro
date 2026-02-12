'use client';

import { useState, useEffect, useRef } from 'react';
import { Layout, Smartphone, Monitor, Code, Eye, RefreshCw, Send, Check, Play, Palette, Type, Image as ImageIcon, ArrowRight, Loader2, FileCode, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepsVisualizer, Step } from './StepsVisualizer';
import { FileTree } from './FileTree';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@ai-sdk/react';
import SidebarLayout from '@/components/SidebarLayout';

interface WebsiteBuilderProps {
    initialPrompt?: string;
    onClose?: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);

export default function WebsiteBuilder({ initialPrompt, onClose }: WebsiteBuilderProps) {
    // UI State
    const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [selectedFileId, setSelectedFileId] = useState('index');
    const [showSteps, setShowSteps] = useState(false);

    // Artifact State
    const [generatedCode, setGeneratedCode] = useState('');
    const [fileStructure, setFileStructure] = useState<any[]>([]);

    // Steps Logic
    const [steps, setSteps] = useState<Step[]>([]);
    const [currentStepId, setCurrentStepId] = useState<string | null>(null);

    // Input State (Local to avoid useChat issues)
    const [input, setInput] = useState('');

    // AI Chat Hook
    const chatHelpers: any = useChat({
        api: '/api/chat',
        body: {
            model: 'google/gemini-2.0-flash-001', // Primary Model (Fast & Intelligent)
        },
        initialMessages: [
            {
                id: generateId(),
                role: 'system',
                content: `You are an Expert AI Web Architect. Your goal is to build high-quality, modern, and functional websites from scratch based on user requests.

                **PROCESS:**
                1. **SEARCH:** Use 'searchWeb' to find design trends.
                2. **BUILD:** Use 'generateWebsite' to write the code.
                
                **CRITICAL RULES:**
                - **DO NOT ASK QUESTIONS.** Make educated assumptions if details are missing.
                - **START IMMEDIATELY.** Do not explain your plan. Just do it.
                - **USE TOOLS.** You MUST use 'generateWebsite' to output code.
                - Write the FULL HTML/CSS code in the tool.
                - Use Tailwind CSS and Google Fonts.`
            }
        ],
        onToolCall: ({ toolCall }) => {
            // Visualize Tool Calls as Steps
            const stepId = toolCall.toolCallId;
            let stepLabel = 'Processing...';
            let stepDesc = '';

            if (toolCall.toolName === 'searchWeb') {
                stepLabel = 'Researching';
                // @ts-ignore
                stepDesc = `Searching for: ${toolCall.args.query}`;
            } else if (toolCall.toolName === 'generateWebsite') {
                stepLabel = 'Building Architecture';
                stepDesc = 'Writing code & assembling assets...';
            } else if (toolCall.toolName === 'generateImage') {
                stepLabel = 'Generating Assets';
                stepDesc = 'Creating custom visuals...';
            }

            // Add Step
            setSteps(prev => {
                // Avoid duplicates
                if (prev.find(s => s.id === stepId)) return prev;
                return [...prev, {
                    id: stepId,
                    label: stepLabel,
                    description: stepDesc,
                    status: 'loading'
                }];
            });
            setCurrentStepId(stepId);
            setShowSteps(true);
        },
        onFinish: (message) => {
            // Mark last step as complete
            if (currentStepId) {
                setSteps(prev => prev.map(s => s.id === currentStepId ? { ...s, status: 'completed' } : s));
            }

            // Check if website was generated in tool invocations
            const toolInvocations = (message as any).toolInvocations;
            if (toolInvocations) {
                toolInvocations.forEach((tool: any) => {
                    if (tool.toolName === 'searchWeb') {
                        setSteps(prev => prev.map(s => s.id === tool.toolCallId ? { ...s, status: 'completed', description: 'Research complete.' } : s));
                    }
                    if (tool.toolName === 'generateWebsite' && 'result' in tool) {
                        // The tool result logic is handled by the model, but we need to extract args to update UI
                        // args are in tool.args
                        const args = tool.args as any;
                        if (args.html) setGeneratedCode(args.html);
                        if (args.files) setFileStructure(args.files);

                        setSteps(prev => prev.map(s => s.id === tool.toolCallId ? { ...s, status: 'completed', description: 'Build successfully deployed.' } : s));
                    }
                });
            }
        }
    });

    // Extract properties from chatHelpers
    const messages = chatHelpers.messages;
    const append = chatHelpers.append;
    const isLoading = chatHelpers.isLoading;
    const reload = chatHelpers.reload;

    // Auto-start
    const effectRan = useRef(false);
    useEffect(() => {
        if (!effectRan.current && initialPrompt) {
            effectRan.current = true;
            append({ role: 'user', content: initialPrompt });
        }
    }, [initialPrompt, append]);

    const handleSendMessage = async () => {
        if (!input?.trim()) return;

        // Manual "Refining" step for UX
        const stepId = generateId();
        setSteps(prev => [...prev, {
            id: stepId,
            label: 'Analyzing Request',
            status: 'pending',
            description: 'Processing instructions...'
        }]);
        setShowSteps(true);
        setCurrentStepId(stepId);

        await append({ role: 'user', content: input });
        setInput(''); // Clear local input

        // Mark analysis done when request starts processing (handled by onToolCall usually, but fallback here)
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'completed' } : s));
    };

    return (
        <div className="flex h-full w-full bg-[#09090b] font-sans overflow-hidden text-gray-100">
            {/* Split Screen Layout */}

            {/* LEFT PANEL: Agent Interaction (400px) */}
            <div className="w-[400px] flex flex-col border-r border-[#27272a] bg-[#0c0c0e]">
                {/* Header */}
                <div className="h-14 border-b border-[#27272a] flex items-center px-4 justify-between bg-[#09090b]">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
                            <Code className="w-4 h-4 text-white" />
                        </div>
                        Smart Architect
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w - 2 h - 2 rounded - full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{isLoading ? 'Thinking...' : 'Active'}</span>
                    </div>
                </div>

                {/* Agent Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-800">

                    {/* Dynamic Steps Visualization */}
                    {showSteps && steps.length > 0 && (
                        <div className="bg-[#18181b] rounded-xl p-4 border border-[#27272a] shadow-lg">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Execution Plan</h3>
                                {isLoading && <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />}
                            </div>
                            <StepsVisualizer steps={steps} currentStepId={currentStepId || ''} />
                        </div>
                    )}

                    {/* Chat Messages */}
                    <div className="space-y-4">
                        {messages.filter(m => m.role !== 'system').map((m) => {
                            // Don't show tool invocations as raw text
                            if ((m as any).toolInvocations) return null;

                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={m.id}
                                    className={cn(
                                        "text-sm p-3 rounded-lg leading-relaxed max-w-[90%]",
                                        m.role === 'user'
                                            ? "bg-indigo-600 text-white self-end ml-auto"
                                            : "bg-[#27272a] text-gray-200 border border-[#3f3f46]"
                                    )}
                                >
                                    {(m as any).content || ''}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-[#27272a] bg-[#09090b]">
                    <div className="relative flex items-center gap-2">
                        <input
                            value={input || ''}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Describe your website (e.g. 'Coffee shop with dark mode')..."
                            className="flex-1 bg-[#18181b] text-white border border-[#27272a] rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!input?.trim() || isLoading}
                            className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Workspace (Preview & Code) */}
            <div className="flex-1 flex flex-col bg-[#000]">
                {/* Workspace Toolbar */}
                <div className="h-14 border-b border-[#27272a] flex items-center justify-between px-4 bg-[#09090b]">
                    <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded-lg border border-[#27272a]">
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all",
                                activeTab === 'preview' ? "bg-[#27272a] text-white shadow-sm" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <Eye size={14} /> Preview
                        </button>
                        <button
                            onClick={() => setActiveTab('code')}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all",
                                activeTab === 'code' ? "bg-[#27272a] text-white shadow-sm" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <Code size={14} /> Code
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded-lg border border-[#27272a]">
                            <button onClick={() => setViewMode('desktop')} className={cn("p-1.5 rounded hover:bg-[#27272a] transition-colors", viewMode === 'desktop' ? "text-indigo-400" : "text-gray-500")}>
                                <Monitor size={16} />
                            </button>
                            <button onClick={() => setViewMode('mobile')} className={cn("p-1.5 rounded hover:bg-[#27272a] transition-colors", viewMode === 'mobile' ? "text-indigo-400" : "text-gray-500")}>
                                <Smartphone size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Workspace Content */}
                <div className="flex-1 relative flex overflow-hidden">

                    {/* File Tree Sidebar (Visible only in Code mode) */}
                    <AnimatePresence>
                        {activeTab === 'code' && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 240, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="border-r border-[#27272a] bg-[#0c0c0e] flex flex-col"
                            >
                                <div className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Explorer</div>
                                {fileStructure.length > 0 ? (
                                    <FileTree files={[{ id: 'root', name: 'project', type: 'folder', children: fileStructure }]} onSelectFile={setSelectedFileId} selectedFileId={selectedFileId} />
                                ) : (
                                    <div className="p-4 text-xs text-gray-500 text-center">Files will appear here...</div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main Area */}
                    <div className="flex-1 bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
                        {/* Background Grid Pattern */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                        />

                        {activeTab === 'preview' ? (
                            generatedCode ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className={cn(
                                        "bg-white shadow-2xl transition-all duration-500 overflow-hidden relative z-10",
                                        viewMode === 'mobile'
                                            ? "w-[375px] h-[720px] rounded-[3rem] border-8 border-[#27272a] shadow-xl"
                                            : "w-full h-full rounded-md border border-[#27272a]"
                                    )}
                                >
                                    <iframe
                                        srcDoc={generatedCode}
                                        className="w-full h-full border-0 bg-white"
                                        title="Preview"
                                        sandbox="allow-scripts"
                                    />
                                </motion.div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-gray-500 z-10">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
                                    <p className="text-sm font-medium">Smart Architect is working...</p>
                                    <p className="text-xs text-gray-600 mt-2">Researching & Designing</p>
                                </div>
                            )
                        ) : (
                            <div className="w-full h-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-[#27272a] z-10 text-sm">
                                <SyntaxHighlighter
                                    language="html"
                                    style={vscDarkPlus}
                                    customStyle={{ margin: 0, height: '100%', background: '#1e1e1e' }}
                                    showLineNumbers={true}
                                >
                                    {generatedCode || '<!-- Generating code... -->'}
                                </SyntaxHighlighter>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
