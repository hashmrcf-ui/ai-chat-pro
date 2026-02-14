'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsAdmin, getAllUsers, UserProfile, logoutUser } from '@/lib/auth';
import { getStatsAdmin, getAllChatsAdmin, getChatMessages, Message } from '@/lib/db';
import { getDailyMessageCounts, getTopUsers, DailyMessageStat, TopUserStat } from '@/lib/analytics';
import { LayoutDashboard, Users, MessageSquare, Shield, LogOut, Loader2, ArrowLeft, Eye, X, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function AdminDashboard() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ users: 0, chats: 0, messages: 0 });
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [chats, setChats] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // Analytics Data
    const [dailyStats, setDailyStats] = useState<DailyMessageStat[]>([]);
    const [topUsers, setTopUsers] = useState<TopUserStat[]>([]);

    useEffect(() => {
        const init = async () => {
            const admin = await checkIsAdmin();
            if (!admin) {
                router.push('/');
                return;
            }

            try {
                const [appStats, allUsers, allChats, dailyData, topUsersData] = await Promise.all([
                    getStatsAdmin(),
                    getAllUsers(),
                    getAllChatsAdmin(),
                    getDailyMessageCounts(30),
                    getTopUsers(5)
                ]);
                setStats(appStats);
                setUsers(allUsers);
                setChats(allChats);
                setDailyStats(dailyData || []);
                setTopUsers(topUsersData || []);
            } catch (error) {
                console.error('Failed to fetch admin data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, [router]);

    const handleViewChat = async (chat: any) => {
        setSelectedChat(chat);
        setIsLoadingMessages(true);
        try {
            const messages = await getChatMessages(chat.id);
            setChatMessages(messages);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleLogout = async () => {
        await logoutUser();
        router.push('/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#212121]">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 relative">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-[#212121] border-r border-gray-200 dark:border-gray-800 z-10 hidden md:block">
                <div className="p-6">
                    <Logo className="w-10 h-10 mb-8" showText={true} />
                    <nav className="space-y-2">
                        <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium">
                            <LayoutDashboard className="w-5 h-5" />
                            Dashboard
                        </Link>
                        <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <Users className="w-5 h-5" />
                            User Management
                        </Link>
                        <Link href="/admin/alerts" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <Shield className="w-5 h-5" />
                            Security Alerts
                        </Link>
                        <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <div className="w-5 h-5" /> {/* Placeholder icon */}
                            Settings
                        </Link>
                        <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            Return to App
                        </Link>
                    </nav>
                </div>
                <div className="absolute bottom-0 w-full p-6">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="md:ml-64 p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400">Overview of system performance and user activity.</p>
                </header>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-6 rounded-2xl bg-white dark:bg-[#212121] border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="font-semibold">Total Users</h3>
                        </div>
                        <p className="text-4xl font-bold">{stats.users}</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white dark:bg-[#212121] border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <h3 className="font-semibold">Total Chats</h3>
                        </div>
                        <p className="text-4xl font-bold">{stats.chats}</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white dark:bg-[#212121] border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="font-semibold">Total Messages</h3>
                        </div>
                        <p className="text-4xl font-bold">{stats.messages}</p>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                    {/* Activity Chart */}
                    <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#212121] border border-gray-200 dark:border-gray-800 shadow-sm">
                        <h3 className="text-lg font-bold mb-6">Message Activity (30 Days)</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyStats}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="day"
                                        tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        stroke="#9CA3AF"
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="#9CA3AF"
                                        tickLine={false}
                                        axisLine={false}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Users Chart */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-[#212121] border border-gray-200 dark:border-gray-800 shadow-sm">
                        <h3 className="text-lg font-bold mb-6">Top Active Users</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topUsers} layout="vertical" margin={{ left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="email"
                                        width={100}
                                        tickFormatter={(val) => val.split('@')[0]}
                                        stroke="#9CA3AF"
                                        tick={{ fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Bar dataKey="message_count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={32}>
                                        {topUsers.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#facc15'][index % 5]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Users Table */}
                    <div className="rounded-2xl bg-white dark:bg-[#212121] border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                            <h2 className="text-xl font-bold">Recent Users</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-[#1a1a1a]">
                                    <tr>
                                        <th className="px-4 py-4 font-semibold">User</th>
                                        <th className="px-4 py-4 font-semibold">Role</th>
                                        <th className="px-4 py-4 font-semibold">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900 dark:text-white uppercase truncate max-w-[150px]">{user.full_name || 'Anonymous'}</span>
                                                    <span className="text-xs text-gray-500 truncate max-w-[150px]">{user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 font-medium">
                                                {user.is_admin ? 'Admin' : 'User'}
                                            </td>
                                            <td className="px-4 py-4 text-gray-400">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Chats Table */}
                    <div className="rounded-2xl bg-white dark:bg-[#212121] border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                            <h2 className="text-xl font-bold">Global Chat History</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-[#1a1a1a]">
                                    <tr>
                                        <th className="px-4 py-4 font-semibold">User</th>
                                        <th className="px-4 py-4 font-semibold">Chat Title</th>
                                        <th className="px-4 py-4 font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                                    {chats.map((chat) => (
                                        <tr key={chat.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <span className="text-xs text-gray-500 truncate max-w-[100px]">{chat.users?.email || 'Unknown'}</span>
                                            </td>
                                            <td className="px-4 py-4 font-medium truncate max-w-[200px]">{chat.title}</td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => handleViewChat(chat)}
                                                    className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-600 rounded-lg transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Message Modal */}
            {selectedChat && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#212121] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#1a1a1a]/50">
                            <div>
                                <h3 className="font-bold text-lg">{selectedChat.title}</h3>
                                <p className="text-xs text-gray-500">User: {selectedChat.users?.email}</p>
                            </div>
                            <button
                                onClick={() => setSelectedChat(null)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {isLoadingMessages ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                                </div>
                            ) : chatMessages.length === 0 ? (
                                <p className="text-center text-gray-500 py-12 italic">No messages found in this chat.</p>
                            ) : (
                                chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                {msg.role === 'user' ? (selectedChat.users?.full_name || 'USER') : 'AI ASSISTANT'}
                                            </span>
                                        </div>
                                        <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-gray-100 dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-200 rounded-tl-none'
                                            }`}>
                                            {msg.content}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1 px-1">{new Date(msg.created_at).toLocaleString()}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
