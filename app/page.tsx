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
          window.history.pushState({}, '', `?id=${activeChatId}`);
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
    setCurrentChatId(null);
    setMessages([]);
    window.history.pushState({}, '', '/');
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
            <button onClick={handleNewChat} className="md:hidden p-2 hover:bg-gray-800 rounded-lg text-gray-400">
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
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="relative group">
              <input
                value={input}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                placeholder="اكتب رسالتك لـ Vibe AI..."
                className="w-full bg-[#27272a] border border-[#3f3f46] rounded-2xl pl-5 pr-32 py-4 text-white text-sm outline-none focus:border-indigo-500 transition-all shadow-inner"
                disabled={loading}
              />
              <div className="absolute right-2 top-2 flex items-center gap-1">
                {/* Voice Feature */}
                {appFeatures.voiceEnabled && (
                  <button
                    type="button"
                    className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-indigo-400 hover:bg-[#323235] rounded-xl transition-all"
                    title="Voice Chat (Coming Soon)"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}

                {/* Image Feature */}
                {appFeatures.imagesEnabled && (
                  <button
                    type="button"
                    className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-pink-400 hover:bg-[#323235] rounded-xl transition-all"
                    title="Generate Image (Coming Soon)"
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
