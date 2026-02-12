import { useState, useEffect } from 'react';
import { Send, Code, Play, Download, Copy, RefreshCw, Check, Layout, FileText, X } from 'lucide-react'; // Icons
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { StepsVisualizer, Step } from './StepsVisualizer';
import { FileTree } from './FileTree';

// Mock Step Data
const INITIAL_STEPS: Step[] = [
    { id: '1', label: 'Analyzing Request', status: 'pending', description: 'Understanding requirements and context...' },
    { id: '2', label: 'Planning Architecture', status: 'pending', description: 'Designing component structure and data flow...' },
    { id: '3', label: 'Generating Code', status: 'pending', description: 'Writing TypeScript and React components...' },
    { id: '4', label: 'Refining Styles', status: 'pending', description: 'Applying Tailwind CSS classes...' },
    { id: '5', label: 'Finalizing', status: 'pending', description: 'Preparing preview and file tree...' },
];

const MOCK_FILE_TREE = [
    {
        id: 'root',
        name: 'src',
        type: 'folder' as const,
        children: [
            {
                id: 'components',
                name: 'components',
                type: 'folder' as const,
                children: [
                    { id: 'main', name: 'App.tsx', type: 'file' as const },
                    { id: 'header', name: 'Header.tsx', type: 'file' as const },
                    { id: 'footer', name: 'Footer.tsx', type: 'file' as const },
                ]
            },
            { id: 'styles', name: 'globals.css', type: 'file' as const },
            { id: 'config', name: 'tailwind.config.js', type: 'file' as const },
        ]
    }
];

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface CodeBuilderProps {
    initialPrompt?: string;
}

export function CodeBuilder({ initialPrompt }: CodeBuilderProps) {
    // State
    const [input, setInput] = useState(initialPrompt || '');
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: 'مرحباً! أنا مهندس البرمجيات الخاص بك. ماذا تريد أن تبني اليوم؟' }
    ]);

    // Workflow State
    const [isGenerating, setIsGenerating] = useState(false);
    const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
    const [currentStepId, setCurrentStepId] = useState<string>('1');
    const [showSteps, setShowSteps] = useState(false);

    // Editor State
    const [currentCode, setCurrentCode] = useState('');
    const [currentLanguage, setCurrentLanguage] = useState('javascript');
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
    const [isCopied, setIsCopied] = useState(false);
    const [showFileTree, setShowFileTree] = useState(true);
    const [selectedFileId, setSelectedFileId] = useState('main');

    // Auto-scroll to bottom of chat
    const messagesEndRef = useState<HTMLDivElement | null>(null);

    // Auto-trigger if initialPrompt is provided
    useEffect(() => {
        if (initialPrompt) {
            handleSend(initialPrompt);
        }
    }, []);

    // Effect: Switch to preview if HTML is generated
    useEffect(() => {
        if (currentLanguage === 'html' && currentCode) {
            setActiveTab('preview');
        }
    }, [currentLanguage, currentCode]);

    const runSimulation = async () => {
        setShowSteps(true);
        setIsGenerating(true);
        setSteps(INITIAL_STEPS);

        // Simulate steps
        for (let i = 0; i < INITIAL_STEPS.length; i++) {
            const stepId = INITIAL_STEPS[i].id;
            setCurrentStepId(stepId);

            // Mark current as loading
            setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'loading' } : s));

            await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate work

            // Mark as completed
            setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'completed' } : s));
        }

        setIsGenerating(false);
        return true;
    };

    // Mock function to simulate code generation (will be replaced with actual AI call)
    const mockGenerateCode = async (prompt: string): Promise<{ code: string; language: string; explanation: string }> => {
        // Run the step visualizer workflow first
        await runSimulation();

        // Simple heuristic for demo purposes
        if (prompt.toLowerCase().includes('html') || prompt.toLowerCase().includes('website')) {
            return {
                language: 'html',
                code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Page</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f0f0; margin: 0; }
        .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #333; }
        p { color: #666; }
        button { background: #0070f3; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; margin-top: 1rem; }
        button:hover { background: #0051a2; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Hello World</h1>
        <p>This is a generated HTML page.</p>
        <button onclick="alert('Clicked!')">Click Me</button>
    </div>
</body>
</html>`,
                explanation: 'قمت بإنشاء صفحة HTML بسيطة مع تنسيقات CSS مضمنة وبطاقة تفاعلية.'
            };
        } else {
            return {
                language: 'python',
                code: `def fibonacci(n):
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    sequence = [0, 1]
    while len(sequence) < n:
        next_val = sequence[-1] + sequence[-2]
        sequence.append(next_val)
    return sequence

# Example usage
print(fibonacci(10))`,
                explanation: 'هذه دالة بايثون لحساب متتالية فيبوناتشي.'
            };
        }
    };

    const handleSend = async (text?: string) => {
        const contentToSend = text || input;
        if (!contentToSend.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: contentToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        try {
            // Simulate generation
            const result = await mockGenerateCode(userMsg.content);

            setCurrentCode(result.code);
            setCurrentLanguage(result.language);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.explanation
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error(error);
            const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'عذراً، حدث خطأ أثناء توليد الكود.' };
            setMessages(prev => [...prev, errorMsg]);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(currentCode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="flex h-full w-full bg-gray-50 dark:bg-[#1e1e1e] overflow-hidden font-sans">

            {/* Left Panel: Chat Interface (40%) */}
            <div className="w-[400px] flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#18181b]">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                        <Code size={18} />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-800 dark:text-gray-100">بناء الأكواد</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">مساعد برمجيات ذكي</p>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex flex-col max-w-[85%]",
                                msg.role === 'user' ? "self-end items-end" : "self-start items-start"
                            )}
                        >
                            <div
                                className={cn(
                                    "p-3 rounded-2xl text-sm leading-relaxed",
                                    msg.role === 'user'
                                        ? "bg-blue-600 text-white rounded-tr-none"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700"
                                )}
                            >
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                    ))}

                    {/* Step Visualization Overlay in Chat */}
                    {showSteps && isGenerating && (
                        <div className="my-4">
                            <StepsVisualizer
                                steps={steps}
                                currentStepId={currentStepId}
                            />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#18181b]">
                    <div className="relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="اكتب طلبك البرمجي هنا..."
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#27272a] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none h-24 text-sm scrollbar-hide"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isGenerating}
                            className="absolute left-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel: Code/Preview (60%) */}
            <div className="flex-1 flex flex-col bg-[#1e1e1e] h-full overflow-hidden">
                {/* Toolbar */}
                <div className="h-12 border-b border-[#333] flex items-center justify-between px-4 bg-[#252526]">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowFileTree(!showFileTree)}
                            className={cn(
                                "p-1.5 rounded-md transition-colors mr-2",
                                showFileTree ? "bg-[#3e3e42] text-white" : "text-gray-400 hover:text-gray-200"
                            )}
                            title="Toggle File Tree"
                        >
                            <Layout size={16} />
                        </button>

                        <button
                            onClick={() => setActiveTab('code')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2",
                                activeTab === 'code' ? "bg-[#3e3e42] text-white" : "text-gray-400 hover:text-gray-200"
                            )}
                        >
                            <Code size={14} />
                            <span>الكود المصدر</span>
                        </button>
                        {/* Only show preview tab for web-related languages */}
                        {['html', 'javascript', 'css'].includes(currentLanguage) && (
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2",
                                    activeTab === 'preview' ? "bg-[#3e3e42] text-white" : "text-gray-400 hover:text-gray-200"
                                )}
                            >
                                <Play size={14} />
                                <span>معاينة حية</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 uppercase font-mono">{currentLanguage}</span>
                        <div className="h-4 w-px bg-[#333] mx-1" />
                        <button
                            onClick={copyToClipboard}
                            className="p-1.5 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white transition-colors"
                            title="نسخ الكود"
                        >
                            {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex overflow-hidden relative">
                    {/* File Tree Panel */}
                    {showFileTree && (
                        <div className="w-56 border-r border-[#333] bg-[#252526] text-gray-300 p-2 overflow-y-auto shrink-0">
                            <h3 className="text-[10px] uppercase font-bold text-gray-500 mb-2 px-2">Explorer</h3>
                            <FileTree
                                files={MOCK_FILE_TREE}
                                onSelectFile={setSelectedFileId}
                                selectedFileId={selectedFileId}
                            />
                        </div>
                    )}

                    {/* Editor/Preview Container */}
                    <div className="flex-1 relative">
                        {/* Code Editor View */}
                        <div className={cn("absolute inset-0 transition-opacity duration-300", activeTab === 'code' ? "opacity-100 z-10" : "opacity-0 z-0")}>
                            {currentCode ? (
                                <SyntaxHighlighter
                                    language={currentLanguage}
                                    style={vscDarkPlus}
                                    customStyle={{
                                        margin: 0,
                                        padding: '1.5rem',
                                        height: '100%',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                        backgroundColor: '#1e1e1e'
                                    }}
                                    showLineNumbers={true}
                                    wrapLines={true}
                                >
                                    {currentCode}
                                </SyntaxHighlighter>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <Code size={48} className="mb-4 opacity-20" />
                                    <p>لم يتم توليد أي كود بعد.</p>
                                </div>
                            )}
                        </div>

                        {/* Preview View (Iframe) */}
                        <div className={cn("absolute inset-0 bg-white transition-opacity duration-300", activeTab === 'preview' ? "opacity-100 z-10" : "opacity-0 z-0")}>
                            {activeTab === 'preview' && (
                                <iframe
                                    srcDoc={currentCode}
                                    className="w-full h-full border-none"
                                    sandbox="allow-scripts"
                                    title="Code Preview"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
