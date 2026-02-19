'use client';

import { useState, FormEvent, ChangeEvent, useEffect, Suspense } from 'react';
import { Send, Loader2, Plus, Mic, Image as ImageIcon, Globe, PenTool, ShoppingBag, UserCheck, Link as LinkIcon, BookOpen, MoreHorizontal, Sparkles } from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';
import { features } from '@/lib/features';
import { Logo } from '@/components/Logo';
import { getCurrentUser, UserProfile } from '@/lib/auth';
import { getChatMessages, createChat, saveMessage } from '@/lib/db';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAppFeatures, AppFeatures } from '@/lib/config';

import { FilterQuestion, ProductShowcase, SearchProgress } from '@/components/shopping/ShoppingComponents';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: Array<{
    toolName: string;
    toolCallId: string;
    args: any;
    result?: any;
  }>;
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatIdFromUrl = searchParams.get('id');

  const [user, setUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedModel, setSelectedModel] = useState(features.ai.models[0]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatIdFromUrl);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'chat' | 'shopping' | 'search'>('chat');
  const [showDebug, setShowDebug] = useState(true);
  const [rawLogs, setRawLogs] = useState<string[]>([]);

  const [appFeatures, setAppFeatures] = useState<AppFeatures>({
    voiceEnabled: true,
    imagesEnabled: true,
    registrationEnabled: true,
    defaultLanguage: 'ar-SA'
  });

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);

      const config = await getAppFeatures();
      setAppFeatures(config);

      if (loading) return; // Prevent state wipes during active streaming/submission

      if (chatIdFromUrl) {
        if (chatIdFromUrl !== currentChatId) {
          const history = await getChatMessages(chatIdFromUrl);
          setMessages(history.map(m => ({ role: m.role as any, content: m.content })));
          setCurrentChatId(chatIdFromUrl);
        }
      } else {
        // Reset state for New Chat
        setMessages([]);
        setCurrentChatId(null);
      }

      setIsInitializing(false);
    };
    init();
  }, [router, chatIdFromUrl]);

  const handleSubmit = async (e?: FormEvent, specificContent?: string) => {
    if (e) e.preventDefault();

    // Auto-submit support
    const contentToSend = specificContent || input.trim();
    if (!contentToSend || loading || !user) return;

    // Build the message object
    const newMessage: Message = { role: 'user', content: contentToSend };

    // Optimistic UI update
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    try {
      let activeChatId = currentChatId;

      if (!activeChatId) {
        const newChat = await createChat(user.id, contentToSend.substring(0, 30) + '...');
        if (newChat) {
          activeChatId = newChat.id;
          setCurrentChatId(activeChatId);
          router.replace(`/?id=${activeChatId}`, { scroll: false });
        }
      }

      if (activeChatId) {
        await saveMessage(activeChatId, 'user', contentToSend);
      }

      // API Call
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newMessage],
          model: selectedModel,
          userId: user.id,
          activeMode: activeMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل الاتصال بالخادم');
      }

      // Handle Text Streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('تعذر بدء تدفق البيانات');

      let assistantContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const decoder = new TextDecoder();
      let buffer = '';

      const processLine = (line: string) => {
        if (line.trim() === '') return;

        // Check for Vercel AI SDK Protocol (0:"content")
        if (line.startsWith('0:') && line.length > 2) {
          const rawContent = line.slice(2);
          if (rawContent.startsWith('"') && rawContent.endsWith('"')) {
            try {
              const content = JSON.parse(rawContent);
              assistantContent += content;
            } catch (e) {
              assistantContent += rawContent;
            }
          } else {
            assistantContent += rawContent;
          }
        }
        // Check for other protocol messages (skip)
        else if (line.match(/^\d+:/)) {
          return;
        }
        // Fallback: Raw Text
        else {
          assistantContent += line;
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) {
            processLine(buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // DEBUG LOGGING
        setRawLogs(prev => [...prev.slice(-20), `Chunk: ${decoder.decode(value)}`]);

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          processLine(line);
        }

        // Atomic UI update
        setMessages(prev => {
          const newMsgs = [...prev];
          if (newMsgs.length > 0) {
            newMsgs[newMsgs.length - 1] = { role: 'assistant', content: assistantContent };
          }
          return newMsgs;
        });
      }

      if (activeChatId) {
        await saveMessage(activeChatId, 'assistant', assistantContent);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ في الاتصال بالخدمة.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    router.push('/');
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#1a1a1a]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className="flex flex-col h-full bg-[#1e1e1e]">
        <header className="h-16 border-b border-[#27272a] bg-[#1a1a1a] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button onClick={handleNewChat} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg text-gray-400">
              <Plus className="w-5 h-5" />
            </button>
            <Logo iconSize="w-8 h-8" textSize="text-lg text-white" showText={true} />
            {user?.is_admin && (
              <a href="/admin" className="ml-4 px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full border border-amber-500/20 hover:bg-amber-500/20 transition-all">
                ADMIN
              </a>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`p-2 rounded-lg transition-colors ${showDebug ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Show Debug Logs"
            >
              🐞
            </button>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[#27272a] border border-[#3f3f46] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 cursor-pointer"
            >
              {features.ai.models.map((model) => (
                <option key={model} value={model} className="bg-[#212121]">
                  {model.split('/')[1] || model}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center px-4">
              <div>
                <div className="mb-6 animate-pulse flex justify-center">
                  <Logo iconSize="w-20 h-20" showText={false} />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">مرحباً {user?.full_name?.split(' ')[0]}!</h2>
                <p className="text-gray-400">ابدأ محادثة جديدة مع Vibe AI. سيتم حفظ كل شيء في حسابك.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-12 max-w-6xl mx-auto px-6 md:px-12 pb-40">
              {messages.map((msg, i) => {
                // Feature: Single Box Flow - Hide user's auto-responses
                if (msg.role === 'user' && msg.content.startsWith('[Selected Option]:')) return null;

                const isUser = msg.role === 'user';

                return (
                  <div key={i} className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'}`}>

                    {/* Role Label / Icon (Optional but nice for context) */}
                    <div className="flex items-center gap-3 mb-2 px-1 opacity-70">
                      {isUser ? (
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">You</div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Logo iconSize="w-5 h-5" showText={false} />
                          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Vibe AI</span>
                        </div>
                      )}
                    </div>

                    <div
                      className={`relative w-full text-base md:text-lg leading-relaxed ${isUser
                        ? 'bg-[#27272a] text-gray-100 rounded-3xl px-6 py-4 max-w-[85%] border border-[#3f3f46]'
                        : 'text-gray-200 px-1 py-1 max-w-full font-light text-right'
                        }`}
                      dir={!isUser ? "rtl" : "auto"}
                    >
                      {/* UI PARSING LOGIC */}
                      {(() => {
                        // ULTRA-ROBUST EXTRACTOR v5 (Clean Split & Hide)
                        // ... (same logic as before, just ensuring context is kept clean)
                        const extractGenerativeUI = (text: string) => {
                          // Pre-clean: Remove hidden context tags first
                          let cleanText = text.replace(/:::INTENT_CONTEXT:::([\s\S]*?):::/g, '').trim();

                          const result: { type: string, data?: any, cleanText: string } = { type: 'text', cleanText: cleanText };

                          // 1. Check for PRODUCTS block
                          const productsMatch = text.match(/:::UI_PRODUCTS:::([\s\S]*?):::/);
                          if (productsMatch) {
                            try {
                              let jsonContent = productsMatch[1];
                              jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();

                              const data = JSON.parse(jsonContent);
                              result.type = 'products';
                              result.data = data;
                              result.cleanText = cleanText.replace(productsMatch[0], '').trim();
                              return result;
                            } catch (e) { console.error("Product JSON Parse Error", e); }
                          }

                          // 2. Check for QUESTION block
                          const questionMatch = text.match(/:::UI_QUESTION:::([\s\S]*?):::/);
                          if (questionMatch) {
                            try {
                              let jsonContent = questionMatch[1];
                              jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();

                              const data = JSON.parse(jsonContent);
                              result.type = 'question';
                              result.data = data;
                              result.cleanText = cleanText.replace(questionMatch[0], '').trim();
                              return result;
                            } catch (e) { }
                          }

                          // 3. Searching State
                          if (text.includes(":::UI_SEARCHING:::")) {
                            result.type = 'searching';
                            result.cleanText = cleanText.replace(":::UI_SEARCHING:::", "").trim();
                            return result;
                          }

                          return result;
                        };

                        const uiResult = extractGenerativeUI(msg.content);

                        if (uiResult.type !== 'text') {
                          return (
                            <>
                              {/* 1. Render Clean Text Part (Explanation) */}
                              {uiResult.cleanText && (
                                <div className={`prose prose-invert prose-lg max-w-none mb-8 ${!isUser && 'text-gray-300 elements-spacing-relaxed'}`}>
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                  >
                                    {uiResult.cleanText}
                                  </ReactMarkdown>
                                </div>
                              )}

                              {/* 2. Render UI Component */}
                              {uiResult.type === 'searching' && <SearchProgress />}

                              {uiResult.type === 'question' && (
                                <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500 w-full my-6">
                                  <FilterQuestion
                                    question={uiResult.data.question}
                                    options={uiResult.data.options || []}
                                    category={uiResult.data.category || 'general'}
                                    previousSelection={undefined}
                                    onSelect={(opt) => {
                                      const choiceMsg = `[Selected Option]: ${opt}`;
                                      handleSubmit(undefined, choiceMsg);
                                    }}
                                  />
                                </div>
                              )}

                              {uiResult.type === 'products' && (
                                <div className="my-8">
                                  <ProductShowcase
                                    title={uiResult.data.title || "Recommendations"}
                                    summary={uiResult.data.summary || ""}
                                    products={uiResult.data.products || []}
                                  />
                                </div>
                              )}
                            </>
                          );
                        }

                        // Fallback: Render text normally with Markdown support
                        if (!msg.content) {
                          return (
                            <div className="flex items-center gap-3 text-gray-400 italic py-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span className="text-sm">جاري التفكير والكتابة...</span>
                            </div>
                          );
                        }

                        return (
                          <div className={`prose prose-invert prose-lg max-w-none ${!isUser && 'text-gray-300 elements-spacing-relaxed'}`}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                // Typography: Clean & Modern (Screenshot Match)
                                h1: ({ node, ...props }: any) => <h1 {...props} className="text-4xl font-bold mt-12 mb-8 text-white leading-tight tracking-tight" />,
                                h2: ({ node, ...props }: any) => <h2 {...props} className="text-3xl font-bold mt-12 mb-6 text-indigo-100 border-b border-gray-800/60 pb-4" />,
                                h3: ({ node, ...props }: any) => <h3 {...props} className="text-2xl font-bold mt-10 mb-4 text-gray-100" />,

                                // Removing custom 'p' to fix hydration error (div inside p)
                                // Standard prose-p will handle it, or we can use a span if really needed, but removing is safer.

                                // Image with more breathing room (Block level)
                                img: ({ node, ...props }: any) => (
                                  <span className="block my-12 relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border border-gray-800/50">
                                    <img {...props} className="object-cover w-full h-full hover:scale-105 transition-transform duration-700" loading="lazy" />
                                  </span>
                                ),

                                // Lists: Clean spacing
                                ul: ({ node, ...props }: any) => <ul {...props} className="list-disc list-outside mr-6 space-y-3 my-6 text-gray-200 text-lg leading-8 marker:text-gray-500" />,
                                ol: ({ node, ...props }: any) => <ol {...props} className="list-decimal list-outside mr-6 space-y-3 my-6 text-gray-200 text-lg leading-8 marker:text-gray-500 font-bold" />,

                                // Tags (Code blocks used as chips)
                                code: ({ node, ...props }: any) => <code {...props} className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-700 mx-1 font-medium inline-block mb-2 shadow-sm" />,

                                // Special blocks
                                blockquote: ({ node, ...props }: any) => <blockquote {...props} className="border-r-4 border-gray-600 pr-4 py-2 my-6 text-gray-400 italic text-lg bg-transparent shadow-none" />,
                                strong: ({ node, ...props }: any) => <strong {...props} className="font-bold text-white" />,
                                hr: ({ node, ...props }: any) => <hr {...props} className="my-10 border-gray-800" />,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#27272a] text-gray-400 rounded-2xl px-4 py-3 border border-[#3f3f46] flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">يفكر...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-[#1a1a1a] border-t border-[#27272a] relative">
          {/* DEBUG PANEL */}
          {showDebug && (
            <div className="absolute bottom-full left-0 right-0 mb-4 mx-6 bg-black/95 border border-green-500/30 rounded-xl p-4 h-48 overflow-y-auto text-xs font-mono text-green-400 shadow-2xl z-50 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2 bg-black/50 sticky top-0">
                <span className="font-bold text-green-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  System Memory Stream
                </span>
                <button onClick={() => setRawLogs([])} className="text-gray-500 hover:text-white px-2 hover:bg-white/10 rounded">Clear</button>
              </div>
              <div className="space-y-1">
                {rawLogs.length === 0 ? <span className="text-gray-600 italic">Waiting for system events...</span> : rawLogs.map((log, i) => (
                  <div key={i} className="border-b border-gray-900/50 py-1 break-all whitespace-pre-wrap font-mono">{log}</div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">

            {/* Floating Add Menu (ChatGPT Style) */}
            {isAddMenuOpen && (
              <div className="absolute bottom-full left-0 mb-4 w-72 bg-[#2d2d2d] border border-[#3f3f46] rounded-2xl shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-bottom-2">
                <div className="p-2 space-y-1">
                  <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">الأدوات الذكية</div>

                  <button
                    type="button"
                    onClick={() => { setActiveMode('search'); setIsAddMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all ${activeMode === 'search' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:bg-[#383838]'}`}
                  >
                    <Globe className="w-4 h-4 text-emerald-400" />
                    البحث في الويب
                  </button>

                  <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-[#383838] rounded-xl transition-all">
                    <PenTool className="w-4 h-4 text-amber-400" />
                    أداة Canvas
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveMode('shopping'); setIsAddMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all ${activeMode === 'shopping' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-300 hover:bg-[#383838]'}`}
                  >
                    <ShoppingBag className="w-4 h-4 text-indigo-400" />
                    مساعد التسوق
                  </button>

                  <div className="h-px bg-[#3f3f46] my-1 mx-2" />

                  <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-[#383838] rounded-xl transition-all">
                    <UserCheck className="w-4 h-4 text-purple-400" />
                    وضع الوكيل
                  </button>

                  <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-[#383838] rounded-xl transition-all">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    ذاكر وتعلم
                  </button>

                  <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-all font-bold">
                    <MoreHorizontal className="w-4 h-4" />
                    المزيد...
                  </button>
                </div>
              </div>
            )}

            <div className="relative flex items-center">
              {/* Add Button */}
              <div className="absolute left-2 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                  className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${isAddMenuOpen ? 'bg-[#3f3f46] text-white rotate-45' : 'text-gray-400 hover:text-white hover:bg-[#323235]'}`}
                >
                  <Plus className="w-5 h-5" />
                </button>

                {/* Active Mode Chip (User Requested UI) */}
                {activeMode === 'shopping' && (
                  <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-3 py-1.5 rounded-xl text-xs font-bold animate-in zoom-in-95 duration-200">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>مساعد التسوق</span>
                    <button
                      onClick={() => setActiveMode('chat')}
                      className="ml-1 hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3 rotate-45" />
                    </button>
                  </div>
                )}

                {activeMode === 'search' && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold animate-in zoom-in-95 duration-200">
                    <Globe className="w-3.5 h-3.5" />
                    <span>البحث في الويب</span>
                    <button
                      onClick={() => setActiveMode('chat')}
                      className="ml-1 hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3 rotate-45" />
                    </button>
                  </div>
                )}
              </div>

              <input
                value={input}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                placeholder={activeMode === 'search' ? 'ابحث في الويب عن أي شيء...' : activeMode === 'shopping' ? 'ابحث عن منتج، متجر، أو ماركة...' : 'اسأل عن أي شيء...'}
                className={`w-full bg-[#27272a] border border-[#3f3f46] rounded-2xl py-4 text-white text-sm outline-none focus:border-indigo-500 transition-all shadow-inner ${activeMode === 'shopping' ? 'pl-44' : activeMode === 'search' ? 'pl-40' : 'pl-14'} pr-32`}
                disabled={loading}
              />

              <div className="absolute right-2 top-2 flex items-center gap-1">
                {/* Voice Feature */}
                {appFeatures.voiceEnabled && (
                  <button
                    type="button"
                    className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-indigo-400 hover:bg-[#323235] rounded-xl transition-all"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}

                {/* Image Feature */}
                {appFeatures.imagesEnabled && (
                  <button
                    type="button"
                    className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-pink-400 hover:bg-[#323235] rounded-xl transition-all"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="h-10 w-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-xl transition-all shadow-lg active:scale-95"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </SidebarLayout>
  );
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get('id');

  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-[#1a1a1a]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-[#1a1a1a]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
