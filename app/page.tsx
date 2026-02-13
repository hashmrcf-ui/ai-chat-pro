'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';
import { features } from '@/lib/features';
import { Logo } from '@/components/Logo';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(features.ai.models[0]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const newMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newMessage],
          model: selectedModel,
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content || 'حدث خطأ' }]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="h-16 border-b border-[#27272a] bg-[#18181b] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Logo iconSize="w-8 h-8" textSize="text-lg text-white" showText={true} />
          </div>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-[#27272a] border border-[#3f3f46] rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            {features.ai.models.map((model) => (
              <option key={model} value={model}>
                {model.split('/')[1] || model}
              </option>
            ))}
          </select>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md flex flex-col items-center">
                <div className="mb-6">
                  <Logo iconSize="w-20 h-20" showText={false} />
                </div>
                <h2 className="text-2xl font-bold mb-2">مرحباً بك في Vibe AI</h2>
                <p className="text-gray-400">كيف يمكنني مساعدتك اليوم؟</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#27272a] text-gray-200'
                      }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-[#27272a] bg-[#18181b] p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="flex-1 bg-[#27272a] border border-[#3f3f46] rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:opacity-50 text-white p-3 rounded-xl transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </SidebarLayout>
  );
}
