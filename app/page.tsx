'use client';

import { useState, FormEvent, ChangeEvent, useEffect, Suspense } from 'react';
import { Send, Loader2, Plus, Mic, Image as ImageIcon } from 'lucide-react';
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

      if (chatIdFromUrl) {
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
        {/* Optimized Header (Cleaner) */}
        <header className="h-14 border-b border-[#27272a] bg-[#1a1a1a] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleNewChat} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg text-gray-400">
              <Plus className="w-5 h-5" />
            </button>
            <Logo iconSize="w-6 h-6" textSize="text-md text-white font-bold" showText={true} />
          </div>
          <div className="flex items-center gap-2">
            {user?.is_admin && (
              <a href="/admin" className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-full border border-amber-500/20 hover:bg-amber-500/20 transition-all">
                ADMIN
              </a>
            )}
            <div className="text-[10px] text-gray-600 bg-[#27272a] px-2 py-1 rounded text-uppercase tracking-tighter">S_01_OPTIMIZED</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center px-4">
              <div className="max-w-md">
                <div className="mb-4 flex justify-center opacity-20">
                  <Logo iconSize="w-16 h-16" showText={false} />
                </div>
                <h2 className="text-xl font-bold mb-2 text-white">مرحباً {user?.full_name?.split(' ')[0]}!</h2>
                <p className="text-sm text-gray-500">ابدأ محادثة جديدة الآن. تم ترتيب كل شيء لسرعة الوصول.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/10' : 'bg-[#27272a] text-gray-200 rounded-tl-none border border-[#3f3f46]'}`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#27272a] text-gray-400 rounded-2xl px-4 py-3 border border-[#3f3f46] flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    <span className="text-xs">يفكر...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Optimized Input Area */}
        <div className="p-4 bg-[#1a1a1a] border-t border-[#27272a]">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex flex-col gap-3">
            <div className="relative group">
              {/* Centralized Model & Quick Actions Controller (Left Side) */}
              <div className="absolute left-2 top-2 bottom-2 flex items-center gap-1 bg-[#1e1e1e] rounded-xl px-1 border border-[#3f3f46]/50">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-bold text-gray-400 hover:text-white px-2 py-1 outline-none cursor-pointer max-w-[80px] truncate"
                >
                  {features.ai.models.map((model) => (
                    <option key={model} value={model} className="bg-[#1a1a1a]">
                      {model.split('/')[1]?.toUpperCase() || model}
                    </option>
                  ))}
                </select>
              </div>

              <input
                autoFocus
                value={input}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                placeholder="اسأل Vibe AI شيئاً..."
                className="w-full bg-[#27272a] border border-[#3f3f46] rounded-2xl pl-24 pr-12 py-4 text-white text-sm outline-none focus:border-indigo-500 transition-all shadow-xl"
                disabled={loading}
              />

              <div className="absolute right-2 top-2 bottom-2 flex items-center gap-1">
                {appFeatures.voiceEnabled && (
                  <button
                    type="button"
                    className="h-10 w-10 flex items-center justify-center text-gray-500 hover:text-indigo-400 hover:bg-[#323235] rounded-xl transition-all"
                  >
                    <Mic className="w-5 h-5" />
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
