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
      <Suspense>
        <ChatPageContent />
      </Suspense>
    );
  }
