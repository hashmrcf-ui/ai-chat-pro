'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsAdmin, getAllUsers, UserProfile, toggleUserBan, toggleUserAdmin } from '@/lib/auth';
import { Loader2, Search, UserX, Shield, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Direct access for subscription if needed

export default function UserManagementPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const admin = await checkIsAdmin();
            if (!admin) {
                router.push('/');
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserEmail(user?.email || null);

            await refreshUsers();
        };

        init();
    }, [router]);

    const refreshUsers = async () => {
        setIsLoading(true);
        const allUsers = await getAllUsers();
        setUsers(allUsers);
        setIsLoading(false);
    };

    const handleBanToggle = async (user: UserProfile) => {
        if (!confirm(`Are you sure you want to ${user.is_banned ? 'UNBAN' : 'BAN'} this user?`)) return;

        const success = await toggleUserBan(user.id, !user.is_banned);
        if (success) refreshUsers();
    };

    const handleAdminToggle = async (user: UserProfile) => {
        if (user.email === currentUserEmail) {
            alert("You cannot remove your own admin status.");
            return;
        }

        if (!confirm(`Are you sure you want to ${user.is_admin ? 'REMOVE ADMIN' : 'MAKE ADMIN'} for this user?`)) return;

        const success = await toggleUserAdmin(user.id, !user.is_admin);
        if (success) refreshUsers();
    };

    const filteredUsers = users.filter(user =>
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#1a1a1a]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a] p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                            <UserX className="w-8 h-8 text-indigo-500" />
                            User Management
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Search, ban, or promote users.
                        </p>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-[#212121] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                </header>

                <div className="bg-white dark:bg-[#212121] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800">
                                <tr>
                                    <th className="p-4 font-medium text-gray-500 text-sm">User Details</th>
                                    <th className="p-4 font-medium text-gray-500 text-sm">Status</th>
                                    <th className="p-4 font-medium text-gray-500 text-sm">Role</th>
                                    <th className="p-4 font-medium text-gray-500 text-sm">Joined</th>
                                    <th className="p-4 font-medium text-gray-500 text-sm text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors ${user.is_banned ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                                    {user.full_name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{user.full_name || 'Anonymous'}</p>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {user.is_banned ? (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200">
                                                    BANNED
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200">
                                                    ACTIVE
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {user.is_admin ? (
                                                    <span className="flex items-center gap-1 text-indigo-600 font-medium text-sm">
                                                        <Shield className="w-4 h-4" /> Admin
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 text-sm">User</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleBanToggle(user)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${user.is_banned
                                                            ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                            : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100'
                                                        }`}
                                                >
                                                    {user.is_banned ? 'Unban User' : 'Ban User'}
                                                </button>

                                                <button
                                                    onClick={() => handleAdminToggle(user)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${user.is_admin
                                                            ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                            : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100'
                                                        }`}
                                                >
                                                    {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
