'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, ShieldCheck, User, Eye, X } from 'lucide-react';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminAIResponses() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const fetchAIHistory = async (query = '') => {
        setIsLoading(true);
        try {
            const res = await api.get('/admin/ai-requests', { params: query ? { search: query } : undefined });
            setLogs(res.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAIHistory();
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return logs;
        const s = search.toLowerCase();
        return logs.filter((log: any) =>
            String(log.user_login || '').toLowerCase().includes(s) ||
            String(log.message || '').toLowerCase().includes(s) ||
            String(log.response || '').toLowerCase().includes(s)
        );
    }, [logs, search]);

    const prettyMetadata = (raw: string | null | undefined) => {
        if (!raw) return '{}';
        try {
            return JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
            return String(raw);
        }
    };

    return (
        <div className="space-y-8 relative">
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-slate-900 border border-slate-700 text-white rounded-full shadow-2xl flex items-center space-x-3"
                    >
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-sm font-bold tracking-wide">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center">
                    <ShieldCheck size={32} className="mr-3 text-purple-500" />
                    AI Interaction Audit
                </h1>
                <p className="text-slate-400 mt-1">Monitor AI responses and mentor quality</p>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by user, prompt or response..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
                    />
                </div>
                <button
                    onClick={() => fetchAIHistory(search)}
                    className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white inline-flex items-center gap-2"
                >
                    <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
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
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={4} className="p-12 text-center text-slate-500 italic">No AI interactions recorded yet.</td></tr>
                            ) : filtered.map((log) => (
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
                                        <span className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md font-bold">{log.type || 'chat'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => setSelectedLog(log)} className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1">
                                            <Eye size={12} /> View full log
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {selectedLog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[220] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white">AI Request Details</h3>
                                <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-500">User</p>
                                    <p className="text-sm text-white">{selectedLog.user_login || 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-500">Prompt</p>
                                    <pre className="whitespace-pre-wrap text-sm text-slate-200 bg-slate-950 border border-slate-800 rounded-xl p-3">{selectedLog.message || ''}</pre>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-500">Response</p>
                                    <pre className="whitespace-pre-wrap text-sm text-slate-200 bg-slate-950 border border-slate-800 rounded-xl p-3">{selectedLog.response || ''}</pre>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-500">Metadata</p>
                                    <pre className="whitespace-pre-wrap text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-3">{prettyMetadata(selectedLog.metadata)}</pre>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
