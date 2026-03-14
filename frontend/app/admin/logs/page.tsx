'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    Search,
    RefreshCw,
    Clock,
    User,
    Activity,
    ChevronLeft,
    ChevronRight,
    Filter
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

function LogsPageContent() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('ALL');
    const [page, setPage] = useState(1);
    const pageSize = 25;
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const searchParamsValue = searchParams.toString();

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const fetchLogs = async (override?: { search?: string; action?: string }) => {
        setIsLoading(true);
        try {
            const params: any = {};
            const effectiveSearch = (override?.search ?? searchQuery).trim();
            const effectiveAction = override?.action ?? actionFilter;

            if (effectiveSearch) params.search = effectiveSearch;
            if (effectiveAction !== 'ALL') params.action = effectiveAction;
            params.limit = 500;
            const res = await api.get('/admin/logs', { params });
            setLogs(res.data);
            setPage(1);
        } catch (e) {
            console.error('Failed to fetch logs', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const presetSearch = searchParams.get('search') || '';
        setSearchQuery(presetSearch);
        fetchLogs({ search: presetSearch, action: actionFilter });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParamsValue]);

    const filtered = logs.filter((log) => {
        const search = searchQuery.trim().toLowerCase();
        const matchesSearch = !search ||
            String(log.user_login || '').toLowerCase().includes(search) ||
            String(log.action || '').toLowerCase().includes(search) ||
            String(log.details || '').toLowerCase().includes(search);
        const matchesAction = actionFilter === 'ALL' || String(log.action) === actionFilter;
        return matchesSearch && matchesAction;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

    const getActionColor = (action: string) => {
        switch (action) {
            case 'LOGIN': return 'text-emerald-500 bg-emerald-500/10';
            case 'LOGOUT': return 'text-slate-500 bg-slate-500/10';
            case 'AI_REQUEST': return 'text-purple-500 bg-purple-500/10';
            case 'ERROR': return 'text-red-500 bg-red-500/10';
            default: return 'text-blue-500 bg-blue-500/10';
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
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm font-bold tracking-wide">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center">
                        <Shield size={32} className="mr-3 text-primary" />
                        Audit Security Logs
                    </h1>
                    <p className="text-slate-400 mt-1">Track system activity and user actions</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchLogs()} className="flex items-center px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-all text-sm">
                        <Filter size={16} className="mr-2" />
                        Apply Filters
                    </button>
                    <button
                        onClick={() => fetchLogs()}
                        className="flex items-center px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-all text-sm"
                    >
                        <RefreshCw size={16} className={cn("mr-2", isLoading && "animate-spin")} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex bg-slate-900/40">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Filter logs by user or action..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border-none text-sm text-white focus:ring-0 placeholder-slate-600 pl-10"
                        />
                    </div>
                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="ml-3 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300"
                    >
                        <option value="ALL">All actions</option>
                        <option value="LOGIN">LOGIN</option>
                        <option value="AI_REQUEST">AI_REQUEST</option>
                        <option value="OPEN_LESSON">OPEN_LESSON</option>
                        <option value="COMPLETE_LESSON">COMPLETE_LESSON</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-800 bg-slate-900/20">
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {isLoading ? (
                                Array(10).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-6"><div className="h-4 bg-slate-800 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : pageItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No logs found in the system.</td>
                                </tr>
                            ) : pageItems.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-slate-300">
                                            <Clock size={14} className="mr-2 text-slate-500" />
                                            {new Date(log.created_at).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center mr-2">
                                                <User size={14} className="text-slate-300" />
                                            </div>
                                            <span className="text-sm font-semibold text-white">{log.user_login || 'System'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                            getActionColor(log.action)
                                        )}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate">
                                        {log.details ? <code>{String(log.details)}</code> : '---'}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                                        {log.ip_address || '---'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
                    <p className="text-xs text-slate-500">Showing {pageItems.length} of {filtered.length} entries</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="p-2 border border-slate-700 rounded-lg text-slate-500 hover:text-white transition-all disabled:opacity-30"
                            disabled={page <= 1}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="p-2 border border-slate-700 rounded-lg text-slate-500 hover:text-white transition-all disabled:opacity-30"
                            disabled={page >= totalPages}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LogsPage() {
    return (
        <Suspense fallback={<div className="py-16 text-center text-slate-500">Loading logs...</div>}>
            <LogsPageContent />
        </Suspense>
    );
}
