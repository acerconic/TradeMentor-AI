'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, Search, RefreshCw, Trash2, ShieldCheck, User } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function AdminAIResponses() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAIHistory = async () => {
        setIsLoading(true);
        try {
            // In a real app, we might have a specific endpoint for AI requests
            // For now, we filter audit logs where action contains AI
            const res = await api.get('/admin/logs');
            setLogs(res.data.filter((l: any) => l.action === 'AI_REQUEST' || l.action === 'CHAT'));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAIHistory();
    }, []);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center">
                    <ShieldCheck size={32} className="mr-3 text-purple-500" />
                    AI Interaction Audit
                </h1>
                <p className="text-slate-400 mt-1">Monitor AI responses and mentor quality</p>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/50 border-b border-slate-800">
                            <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4 text-right">Review</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {isLoading ? (
                                <tr><td colSpan={4} className="p-12 text-center text-slate-500">Loading AI history...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={4} className="p-12 text-center text-slate-500 italic">No AI interactions recorded yet.</td></tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                                                {log.user_login?.charAt(0) || 'S'}
                                            </div>
                                            <span className="text-sm text-white font-medium">{log.user_login}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md font-bold">MODE: MENTOR</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-xs text-primary hover:underline font-bold">View full log</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
