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

interface Message {
  role: 'user' | 'assistant';
  content: string;
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

      // Only reload if the ID changed to a DIFFERENT one (prevents race condition during new chat creation)
      if (chatIdFromUrl && chatIdFromUrl !== currentChatId) {
        const history = await getChatMessages(chatIdFromUrl);
        setMessages(history.map(m => ({ role: m.role as any, content: m.content })));
        setCurrentChatId(chatIdFromUrl);
      } else {
        // Reset state for New Chat
        setMessages([]);
        setCurrentChatId(null);
      }

      setIsInitializing(false);
    };
    init();
  }, [router, chatIdFromUrl]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !user) return;

    const userContent = input.trim();
    const newMessage: Message = { role: 'user', content: userContent };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    try {
      let activeChatId = currentChatId;

      if (!activeChatId) {
        const newChat = await createChat(user.id, userContent.substring(0, 30) + '...');
        if (newChat) {
          activeChatId = newChat.id;
          setCurrentChatId(activeChatId);
          router.replace(`/?id=${activeChatId}`, { scroll: false });
        }
      }

      if (activeChatId) {
        await saveMessage(activeChatId, 'user', userContent);
      }

      // Switch to /api/chat (streaming) for full tool support (like memory)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newMessage],
          model: selectedModel,
          userId: user.id, // Explicitly pass userId for memory tracking
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل الاتصال بالخادم');
      }

      // Handle Streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('تعذر بدء تدفق البيانات');

      let assistantContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        // Update the last message (assistant) with the accumulated content
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: 'assistant', content: assistantContent };
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
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#27272a] text-gray-200 rounded-tl-none border border-[#3f3f46]'}`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
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

        <div className="p-4 bg-[#1a1a1a] border-t border-[#27272a]">
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
      <ChatContent key={chatId || 'new'} />
    </Suspense>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageContent />
    </Suspense>
  );
}
