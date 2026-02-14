'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsAdmin } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldAlert, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface SecurityLog {
    id: string;
    content: string;
    violation_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    created_at: string;
    is_resolved: boolean;
    user_id: string | null;
}

export default function SecurityAlertsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [logs, setLogs] = useState<SecurityLog[]>([]);

    useEffect(() => {
        const init = async () => {
            const admin = await checkIsAdmin();
            if (!admin) {
                router.push('/');
                return;
            }
            fetchLogs();
        };

        init();
    }, [router]);

    const fetchLogs = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('security_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) {
            setLogs(data as SecurityLog[]);
        }
        setIsLoading(false);
    };

    const markResolved = async (id: string) => {
        await supabase.from('security_logs').update({ is_resolved: true }).eq('id', id);
        fetchLogs(); // Refresh
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
        }
    };

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
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                            <ShieldAlert className="w-8 h-8 text-red-500" />
                            Security Alerts
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Monitor and manage flagged content and security risks.
                        </p>
                    </div>
                    <button onClick={fetchLogs} className="px-4 py-2 bg-white dark:bg-[#212121] border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
                        Refresh
                    </button>
                </header>

                <div className="bg-white dark:bg-[#212121] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {logs.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                            <p className="text-lg">All clear! No security alerts found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="p-4 font-medium text-gray-500 text-sm">Severity</th>
                                        <th className="p-4 font-medium text-gray-500 text-sm">Violation</th>
                                        <th className="p-4 font-medium text-gray-500 text-sm">Content</th>
                                        <th className="p-4 font-medium text-gray-500 text-sm">Time</th>
                                        <th className="p-4 font-medium text-gray-500 text-sm">Status</th>
                                        <th className="p-4 font-medium text-gray-500 text-sm">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                                                    {log.severity.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-900 dark:text-white font-medium">
                                                {log.violation_type}
                                            </td>
                                            <td className="p-4 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={log.content}>
                                                "{log.content}"
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="p-4">
                                                {log.is_resolved ? (
                                                    <span className="flex items-center gap-1 text-green-600 text-sm">
                                                        <CheckCircle className="w-4 h-4" /> Resolved
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-red-500 text-sm animate-pulse">
                                                        <AlertTriangle className="w-4 h-4" /> Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {!log.is_resolved && (
                                                    <button
                                                        onClick={() => markResolved(log.id)}
                                                        className="px-3 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
                                                    >
                                                        Resolve
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
