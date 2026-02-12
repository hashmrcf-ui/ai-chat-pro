'use client';

import { useRef, useEffect, useState } from 'react';
import { Send, Bot, User, RefreshCw, Copy, Check, Mic, Volume2, StopCircle, Bug, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { VoiceRecognition } from '@/lib/voice-recognition';
import { VoiceSynthesis } from '@/lib/voice-synthesis';
import { features } from '@/lib/features';
import { Sidebar } from '@/components/Sidebar';
import { storage, ChatSession, Message } from '@/lib/storage';
import { getCurrentSession, logoutUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { PresentationBuilder } from '@/components/PresentationBuilder';
import WebsiteBuilder from '@/components/WebsiteBuilder';
import { CodeBuilder } from '@/components/CodeBuilder';



export function ChatInterface() {
    const router = useRouter();
    const currentUser = getCurrentSession();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(undefined);
    const [selectedModel, setSelectedModel] = useState<string>(features.ai.models[0]);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [lastToolPrompt, setLastToolPrompt] = useState<string>('');

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! I am AI Chat Pro. How can I help you today?',
        }
    ]);

    // Load theme from localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
        setIsDarkMode(shouldBeDark);
        document.documentElement.classList.toggle('dark', shouldBeDark);
    }, []);

    // Toggle theme
    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        document.documentElement.classList.toggle('dark', newMode);
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
    };

    // Load initial session if exists
    useEffect(() => {
        if (!currentUser) return;
        const sessions = storage.getUserSessions(currentUser.userId);
        if (sessions.length > 0) {
            // Optional: Auto-load last session logic here if desired
        }
    }, [currentUser]);

    // Save messages to current session
    useEffect(() => {
        if (!currentUser) return;
        if (messages.length <= 1 && messages[0].id === 'welcome') return;

        if (!currentSessionId) {
            const newId = Date.now().toString();
            const newSession: ChatSession = {
                id: newId,
                userId: currentUser.userId,
                title: messages[1]?.content?.substring(0, 30) || 'New Chat',
                messages,
                date: Date.now(),
                model: selectedModel,
                projectId: currentProjectId
            };
            storage.saveSession(newSession);
            setCurrentSessionId(newId);
        } else {
            const session = storage.getUserSessions(currentUser.userId).find(s => s.id === currentSessionId);
            if (session) {
                // @ts-ignore
                session.messages = messages;
                session.title = messages[1]?.content?.substring(0, 30) || session.title;
                storage.saveSession(session);
            }
        }
    }, [messages, currentSessionId, selectedModel, currentProjectId, currentUser]);

    const handleNewChat = (projectId?: string) => {
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! I am AI Chat Pro. How can I help you today?',
        }]);
        setCurrentSessionId(null);
        setCurrentProjectId(projectId);
        setInputValue('');
        setActiveTool(null);
        // Do not auto-collapse sidebar on new chat to keep context
    };

    const handleSelectSession = (session: ChatSession) => {
        // @ts-ignore
        setMessages(session.messages || []);
        setCurrentSessionId(session.id);
        setCurrentProjectId(session.projectId);
        setSelectedModel(session.model || features.ai.models[0]);
        setActiveTool(null);
        // Mobile behavior: collapse sidebar
        if (window.innerWidth < 768) {
            setIsSidebarCollapsed(true);
        }
    };

    // Tool selection from Sidebar
    const handleSelectTool = (tool: string | null) => {
        setActiveTool(tool);
        if (tool) {
            // When tool is selected, we might want to collapse sidebar on small screens
            if (window.innerWidth < 768) {
                setIsSidebarCollapsed(true);
            }
        }
    };

    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [showDebug, setShowDebug] = useState(false);

    const reload = () => window.location.reload();


    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState<string | null>(null);

    const voiceRecognition = useRef<VoiceRecognition | null>(null);
    const voiceSynthesis = useRef<VoiceSynthesis | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        try {
            voiceRecognition.current = new VoiceRecognition({
                lang: features.voice.lang,
                interimResults: features.voice.interimResults
            });
            voiceSynthesis.current = new VoiceSynthesis();
        } catch (e) {
            console.error('Voice init error:', e);
        }

        return () => {
            voiceRecognition.current?.stop();
            voiceSynthesis.current?.stop();
        };
    }, []);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleFormSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
        };

        // Heuristic: Auto-switch tool based on keywords
        const lowerInput = inputValue.toLowerCase();
        if (lowerInput.includes('website') || lowerInput.includes('موقع')) {
            setActiveTool('website');
            setLastToolPrompt(inputValue);
        } else if (lowerInput.includes('presentation') || lowerInput.includes('powerpoint') || lowerInput.includes('عرض')) {
            setActiveTool('presentation');
            setLastToolPrompt(inputValue);
        } else if (lowerInput.includes('code') || lowerInput.includes('python') || lowerInput.includes('javascript') || lowerInput.includes('html') || lowerInput.includes('كود') || lowerInput.includes('برمج')) {
            setActiveTool('code');
            setLastToolPrompt(inputValue);
        }

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setDebugLogs(prev => [...prev, `[Client] Sending: ${inputValue} (Model: ${selectedModel})`]);

        try {
            setDebugLogs(prev => [...prev, '[Client] Waiting for response headers...']);

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    model: selectedModel
                }),
                cache: 'no-store',
            });

            setDebugLogs(prev => [...prev, `[Client] Response received (status: ${response.status} ${response.statusText})`]);

            if (!response.ok) {
                const errorText = await response.text();
                const errorMsg = `${response.status} ${response.statusText}: ${errorText}`;
                setDebugLogs(prev => [...prev, `[Error] ${errorMsg}`]);
                throw new Error(errorMsg);
            }

            if (!response.body) throw new Error('No response body');

            setDebugLogs(prev => [...prev, '[Client] Response body present. Creating reader...']);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '',
            };

            setMessages(prev => [...prev, assistantMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                setDebugLogs(prev => [...prev.slice(-20), `[Server Chunk] ${chunk}`]); // Keep recent logs

                // Simple text appending for toTextStreamResponse
                assistantMessage.content += chunk;

                // Force update state
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { ...assistantMessage };
                    return newMessages;
                });
            }

        } catch (error: any) {
            console.error('Chat submit error:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `Error: ${error.message || 'Failed to send message'}`
            }]);
            setDebugLogs(prev => [...prev, `[Exception] ${error.message}`]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleRecording = () => {
        if (!voiceRecognition.current) {
            alert('Voice recognition is not supported in this browser.');
            return;
        }

        if (isRecording) {
            voiceRecognition.current.stop();
            setIsRecording(false);
        } else {
            setIsRecording(true);
            voiceRecognition.current.start((text) => {
                setInputValue((prev: string) => prev + (prev ? ' ' : '') + text);
            }, (error) => {
                console.error('Voice recognition error:', error);
                setIsRecording(false);
                // Don't alert for "no-speech" as it's common
                if (error?.error !== 'no-speech') {
                    alert('Voice recognition error: ' + (error?.message || error?.error || 'Unknown error') + '\nTry using Chrome or Edge.');
                }
            });
        }
    };


    const speakMessage = (text: string, id: string) => {
        if (!voiceSynthesis.current) return;

        if (isSpeaking === id) {
            voiceSynthesis.current.stop();
            setIsSpeaking(null);
        } else {
            voiceSynthesis.current.speak(text);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
                activeTool={activeTool}
                onSelectTool={handleSelectTool}
            />

            <div className="flex-1 flex flex-col h-full relative w-full transition-all duration-300">
                {/* Header */}
                <header className="glass-header px-6 py-4 sticky top-0 z-40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-xl text-gray-800 dark:text-white tracking-tight">AI Chat Pro</h1>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                            </div>
                        </div>
                    </div>

                    {/* User Info & Logout */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400 hidden md:block">
                            {currentUser?.name}
                        </span>
                        <button
                            onClick={() => {
                                logoutUser();
                                router.push('/login');
                            }}
                            className="glass-button p-2 rounded-xl transition-all"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Model Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                            className="glass-button flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                        >
                            <span>{selectedModel.split('/')[1]}</span>
                            <svg className={`w-4 h-4 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        <AnimatePresence>
                            {isModelMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-gray-200 dark:border-neutral-800 p-1 z-50"
                                >
                                    {features.ai.models.map((model) => (
                                        <button
                                            key={model}
                                            onClick={() => {
                                                setSelectedModel(model);
                                                setIsModelMenuOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
                                                selectedModel === model
                                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                                    : "hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
                                            )}
                                        >
                                            <span>{model.split('/')[1]}</span>
                                            {selectedModel === model && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </header>

                {/* Debug Console Overlay */}
                {
                    showDebug && (
                        <div className="absolute top-16 right-4 z-50 w-96 h-80 bg-black/90 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto shadow-xl border border-gray-700 backdrop-blur-sm">
                            <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2 sticky top-0 bg-black/90">
                                <span className="font-bold flex items-center gap-2">
                                    <Bug className="w-3 h-3" /> Debug Console
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => setDebugLogs([])} className="text-gray-400 hover:text-white uppercase text-[10px]">Clear</button>
                                    <button onClick={() => setShowDebug(false)} className="text-gray-400 hover:text-white uppercase text-[10px]">Close</button>
                                </div>
                            </div>
                            {debugLogs.length === 0 && <div className="text-gray-600 italic">Waiting for logs...</div>}
                            {debugLogs.map((log, i) => (
                                <div key={i} className="whitespace-pre-wrap mb-1 break-all border-b border-gray-800/50 pb-1">
                                    {log}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )
                }

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 space-y-6 scroll-smooth">
                    <AnimatePresence initial={false}>
                        {messages.map((m: any) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className={cn(
                                    "flex w-full max-w-4xl mx-auto gap-4",
                                    m.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                {/* Avatar for Assistant */}
                                {m.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0 mt-1">
                                        <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                )}

                                {/* Message Bubble */}
                                <div
                                    className={cn(
                                        "relative group px-5 py-3.5 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed max-w-[85%]",
                                        m.role === 'user'
                                            ? "glass-bubble-user text-white rounded-br-sm"
                                            : "glass-bubble-ai text-gray-100 rounded-bl-sm"
                                    )}
                                >
                                    {m.role === 'assistant' ? (
                                        <div className="markdown-content">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    code({ className, children, ...props }) {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        const isInline = !match;
                                                        // Extract ref to avoid passing it to SyntaxHighlighter
                                                        const { ref, ...rest } = props as any;

                                                        return !isInline ? (
                                                            <div className="relative my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700 bg-[#1e1e1e]">
                                                                <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-gray-700 text-xs text-gray-400">
                                                                    <span>{match![1]}</span>
                                                                    <button onClick={() => copyToClipboard(String(children), m.id + 'code')} className="hover:text-white transition-colors">
                                                                        {copiedId === m.id + 'code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                                    </button>
                                                                </div>
                                                                <SyntaxHighlighter
                                                                    style={vscDarkPlus as any}
                                                                    language={match![1]}
                                                                    PreTag="div"
                                                                    customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
                                                                    {...rest}
                                                                >
                                                                    {String(children).replace(/\n$/, '')}
                                                                </SyntaxHighlighter>
                                                            </div>
                                                        ) : (
                                                            <code className={cn("bg-gray-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-red-500 dark:text-red-400 font-mono text-xs", className)} {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    }
                                                }}
                                            >
                                                {m.content}
                                            </ReactMarkdown>

                                            {/* Tool Invocations (Images) */}
                                            {m.toolInvocations && m.toolInvocations.map((tool: any) => {
                                                if (tool.toolName === 'generateImage' && tool.state === 'result') {
                                                    const { result } = tool;
                                                    return (
                                                        <div key={tool.toolCallId} className="mt-4">
                                                            {result.success ? (
                                                                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700">
                                                                    <img
                                                                        src={result.url}
                                                                        alt={tool.args.prompt}
                                                                        className="w-full h-auto max-h-[400px] object-cover"
                                                                    />
                                                                    <div className="p-2 bg-gray-50 dark:bg-neutral-800 text-xs text-gray-500">
                                                                        Generated with {tool.args.model}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="p-3 bg-red-50 text-red-500 rounded-md text-sm border border-red-100">
                                                                    Generation failed: {result.error}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                } else if (tool.toolName === 'generateImage' && tool.state !== 'result') {
                                                    return (
                                                        <div key={tool.toolCallId} className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md text-sm flex items-center gap-2">
                                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                            Generating image: {tool.args.prompt}...
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}

                                            {/* Action Buttons */}
                                            <div className="mt-2 flex items-center gap-2 transition-opacity">
                                                <button
                                                    onClick={() => copyToClipboard(m.content, m.id)}
                                                    className="glass-button p-1.5 rounded-lg"
                                                    title="Copy message"
                                                >
                                                    {copiedId === m.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => reload()}
                                                    className="glass-button p-1.5 rounded-lg"
                                                    title="Regenerate"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                {features.voice.enabled && (
                                                    <button
                                                        onClick={() => speakMessage(m.content, m.id)}
                                                        className={cn(
                                                            "p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors",
                                                            isSpeaking === m.id ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                        )}
                                                        title={isSpeaking === m.id ? "Stop Speaking" : "Read Aloud"}
                                                    >
                                                        {isSpeaking === m.id ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap">{m.content}</div>
                                    )}
                                </div>

                                {/* Avatar for User */}
                                {m.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center border border-gray-300 dark:border-neutral-600 shrink-0 mt-1">
                                        <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex w-full max-w-4xl mx-auto gap-4 justify-start"
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0 mt-1">
                                    <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area (Floating & Glass) */}
                <div className="p-4 z-10 w-full absolute bottom-0 left-0">
                    <div className="max-w-4xl mx-auto glass-panel rounded-2xl p-2 flex items-center gap-2 relative">
                        <button
                            onClick={() => setShowDebug(!showDebug)}
                            className={`p-2 rounded-full transition-colors ${showDebug ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/5 text-gray-400'}`}
                            title="Toggle Debug Console"
                        >
                            <Bug className="w-5 h-5" />
                        </button>
                        {features.voice.enabled && (
                            <button
                                onClick={toggleRecording}
                                className={cn(
                                    "p-3 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0",
                                    isRecording
                                        ? "bg-red-500 text-white shadow-lg animate-pulse"
                                        : "hover:bg-white/10 text-gray-300"
                                )}
                                title={isRecording ? "Stop Recording" : "Start Recording"}
                            >
                                {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>
                        )}
                        <form onSubmit={handleFormSubmit} className="flex-1 relative">
                            <input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={isRecording ? "جاري الاستماع..." : "اكتب رسالتك هنا..."}
                                className="glass-input w-full p-3 text-white placeholder-gray-400 focus:outline-none rounded-xl"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !inputValue.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                    <div className="max-w-4xl mx-auto mt-2 text-center text-[10px] text-gray-500">
                        AI Chat Pro - Powered by Gemini
                    </div>
                </div>

                {/* Presentation Builder Overlay */}
                {activeTool === 'presentation' && (
                    <div className="absolute inset-0 z-50 bg-white dark:bg-[#212121]">
                        <PresentationBuilder />
                    </div>
                )}

                {/* Website Builder Overlay */}
                {activeTool === 'website' && (
                    <div className="absolute inset-0 z-50 bg-white dark:bg-[#212121]">
                        <WebsiteBuilder />
                    </div>
                )}
            </div>
        </div>
    );
}
