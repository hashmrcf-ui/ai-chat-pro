'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Workflow, Code, Bot, Settings } from 'lucide-react';
import { ReactNode } from 'react';

interface SidebarLayoutProps {
    children: ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
    const pathname = usePathname();

    const tools = [
        { icon: MessageSquare, label: 'Chat', href: '/' },
        { icon: Code, label: 'Website', href: '/website-builder' },
        { icon: Workflow, label: 'Workflow', href: '/workflow/generate' },
        { icon: Bot, label: 'AI Tools', href: '/tools' },
    ];

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
            {/* Compact Sidebar */}
            <aside className="w-20 bg-[#18181b] border-r border-[#27272a] flex flex-col items-center py-6 gap-8">
                {/* Logo */}
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-xl font-bold">V</span>
                </div>

                {/* Tools */}
                <nav className="flex flex-col gap-6 flex-1">
                    {tools.map((tool) => {
                        const Icon = tool.icon;
                        const isActive = pathname === tool.href;

                        return (
                            <Link
                                key={tool.href}
                                href={tool.href}
                                className={`
                                    group flex flex-col items-center gap-1 transition-all
                                    ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-100'}
                                `}
                            >
                                <div className={`
                                    p-3 rounded-xl transition-all
                                    ${isActive
                                        ? 'bg-indigo-600/20 border border-indigo-500/50'
                                        : 'hover:bg-[#27272a] border border-transparent'
                                    }
                                `}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-medium">{tool.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Settings at bottom */}
                <button className="p-3 rounded-xl hover:bg-[#27272a] transition-all opacity-50 hover:opacity-100">
                    <Settings className="w-5 h-5" />
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
