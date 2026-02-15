'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare, Workflow, Code, Bot, Settings, Plus, LogOut, Loader2, Home, ShoppingBag } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Logo } from './Logo';
import MemorySidebar from './MemorySidebar';
import OrderTracking from './OrderTracking';
import { getCurrentUser, logoutUser, UserProfile } from '@/lib/auth';
import { getUserChats, Chat } from '@/lib/db';

interface SidebarLayoutProps {
    children: ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentChatId = searchParams.get('id');

    const [user, setUser] = useState<UserProfile | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSidebarData = async () => {
            const currentUser = await getCurrentUser();
            if (!currentUser) return;
            setUser(currentUser);

            const userChats = await getUserChats(currentUser.id);
            setChats(userChats);
            setIsLoading(false);
        };

        loadSidebarData();
    }, [pathname, currentChatId]);

    const handleLogout = async () => {
        await logoutUser();
        router.push('/login');
    };

    const handleNewChat = () => {
        router.push('/');
    };

    const tools = [
        { icon: MessageSquare, label: 'Chat', href: '/' },
        { icon: Code, label: 'Website', href: '/website-builder' },
        { icon: Workflow, label: 'Workflow', href: '/workflow/generate' },
        { icon: Bot, label: 'AI Tools', href: '/tools' },
    ];

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
            {/* 1. Compact Tools Sidebar */}
            <aside className="w-16 md:w-20 bg-[#18181b] border-r border-[#27272a] flex flex-col items-center py-6 gap-8 shrink-0">
                <div
                    onClick={() => router.push('/')}
                    className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-lg shadow-indigo-500/20"
                >
                    <span className="text-xl font-bold">V</span>
                </div>

                <nav className="flex flex-col gap-6 flex-1">
                    {tools.map((tool) => {
                        const Icon = tool.icon;
                        const isActive = pathname === tool.href && !currentChatId;

                        return (
                            <Link
                                key={tool.href}
                                href={tool.href}
                                className={`
                                    group flex flex-col items-center gap-1 transition-all
                                    ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-100'}
                                `}
                            >
                                <div className={`
                                    p-3 rounded-xl transition-all
                                    ${isActive
                                        ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-400'
                                        : 'hover:bg-[#27272a] border border-transparent'
                                    }
                                `}>
                                    <Icon className="w-5 h-5" />
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={handleLogout}
                    className="p-3 rounded-xl hover:bg-red-900/10 text-gray-500 hover:text-red-500 transition-all"
                    title="Logout"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </aside>

            {/* 2. History Sidebar (Contextual) */}
            <aside className="w-64 bg-[#111111] border-r border-[#27272a] flex flex-col hidden lg:flex shrink-0">
                <div className="p-4 border-b border-[#27272a]">
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#27272a] hover:bg-[#323235] border border-[#3f3f46] rounded-xl text-sm font-medium transition-all group"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        محادثة جديدة
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {/* Shopping & Discovery Section (Top for visibility) */}
                    <div className="px-3 mb-6 space-y-1">
                        <div className="mb-2">
                            <p className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">التجارة والتبادل</p>
                        </div>

                        <Link
                            href="/marketplace"
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-xl transition-all group"
                        >
                            <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span>قائمة التسوق الموحدة</span>
                        </Link>

                        <Link
                            href="/upgrade"
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-indigo-400 bg-indigo-500/5 border border-indigo-500/20 hover:bg-indigo-500/10 rounded-xl transition-all group mt-2"
                        >
                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                            <span>أضف متجرك لـ Vibe AI</span>
                        </Link>
                    </div>

                    <h3 className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-white/5 pt-6 mt-4">المحادثات الأخيرة</h3>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="px-3 py-8 text-center">
                            <p className="text-xs text-gray-600 italic">لا توجد محادثات سابقة</p>
                        </div>
                    ) : (
                        chats.map((chat) => (
                            <Link
                                key={chat.id}
                                href={`/?id=${chat.id}`}
                                className={`
                                    flex items-center gap-3 px-3 py-3 rounded-xl transition-all group
                                    ${currentChatId === chat.id
                                        ? 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-400'
                                        : 'text-gray-400 hover:bg-[#27272a] hover:text-white border border-transparent'
                                    }
                                `}
                            >
                                <MessageSquare className={`w-4 h-4 ${currentChatId === chat.id ? 'text-indigo-400' : 'text-gray-600 group-hover:text-gray-300'}`} />
                                <span className="text-sm truncate font-medium">{chat.title || 'محادثة بلا عنوان'}</span>
                            </Link>
                        ))
                    )}

                    {/* Shopping & Discovery Section */}
                    <div className="mt-8 px-3 space-y-1">
                        <div className="px-3 mb-2">
                            <p className="text-[10px] uppercase tracking-widest font-black text-gray-500">التجارة والتبادل</p>
                        </div>

                        <Link
                            href="/marketplace"
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all group"
                        >
                            <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span>قائمة التسوق الموحدة</span>
                        </Link>

                        <Link
                            href="/upgrade"
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-indigo-400 bg-indigo-500/5 border border-indigo-500/20 hover:bg-indigo-500/10 rounded-xl transition-all group mt-2"
                        >
                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                            <span>أضف متجرك لـ Vibe AI</span>
                        </Link>
                    </div>

                    {/* Simulation Button (Classic Style) */}
                    <div className="px-3 pt-4">
                        <button
                            onClick={async () => {
                                const { triggerSimulationOrder } = await import('@/lib/simulation');
                                const res = await triggerSimulationOrder();
                                if (res.success) {
                                    alert(`تمت المحاكاة: ${res.product} من ${res.customerName}`);
                                }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-xl text-[10px] font-bold text-indigo-400 uppercase tracking-widest transition-all group"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            محاكاة طلب وهمي
                        </button>
                    </div>

                    {/* Memory Sidebar Section (High Impact Observability) */}
                    {user?.id && <MemorySidebar userId={user.id} />}
                </div>

                {/* User Profile Info */}
                {user && (
                    <div className="p-4 border-t border-[#27272a] bg-[#1a1a1a]/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
                                {user.full_name?.[0] || user.email[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.full_name || 'User'}</p>
                                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                            </div>
                            {user.is_admin && (
                                <Link href="/admin" title="Admin Dashboard">
                                    <Settings className="w-4 h-4 text-gray-600 hover:text-indigo-400 transition-colors" />
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </aside>

            {/* 3. Main Content Area */}
            <main className="flex-1 overflow-hidden relative">
                {children}
            </main>
        </div>
    );
}
