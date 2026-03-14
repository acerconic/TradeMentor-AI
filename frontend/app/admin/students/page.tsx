'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    RefreshCw,
    Users,
    CheckCircle2,
    Clock,
    X,
    Copy,
    Check,
    UserPlus,
    Loader2,
    Shield,
    RotateCcw,
    Trash2
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function StudentsPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Create User form state
    const [name, setName] = useState('');
    const [role, setRole] = useState<'student' | 'superadmin'>('student');
    const [isCreating, setIsCreating] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [resetCredentials, setResetCredentials] = useState<{ login: string; password: string } | null>(null);
    const router = useRouter();

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch (e) {
            console.error('Failed to fetch users', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const res = await api.post('/admin/create-user', { name, role });
            setCreatedCredentials(res.data);
            setName('');
            fetchUsers();
        } catch (e) {
            showToast('Failed to create user');
        } finally {
            setIsCreating(false);
        }
    };

    const copyToClipboard = () => {
        if (!createdCredentials) return;
        const text = `Login: ${createdCredentials.login}\nPassword: ${createdCredentials.password}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.login.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleResetPassword = async (user: any) => {
        if (user.role !== 'student') {
            showToast('Only students can be reset here');
            return;
        }
        if (!confirm(`Reset password for ${user.login}?`)) return;

        try {
            const res = await api.post(`/admin/users/${user.id}/reset-password`);
            setResetCredentials({ login: res.data.login, password: res.data.password });
            showToast('Password reset successfully');
        } catch (e: any) {
            showToast(e.response?.data?.error || 'Failed to reset password');
        }
    };

    const handleDeleteStudent = async (user: any) => {
        if (user.role !== 'student') {
            showToast('Only student accounts can be deleted here');
            return;
        }
        if (!confirm(`Delete student ${user.login}? This action cannot be undone.`)) return;

        try {
            await api.delete(`/admin/users/${user.id}`);
            showToast('Student deleted');
            setUsers(prev => prev.filter(u => u.id !== user.id));
        } catch (e: any) {
            showToast(e.response?.data?.error || 'Failed to delete student');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Student Management</h1>
                    <p className="text-slate-400 mt-1">Manage academy members and access</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center px-6 py-3 bg-primary hover:bg-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={20} className="mr-2" />
                    Add Student
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or login..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                </div>
                <button
                    onClick={fetchUsers}
                    className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                    <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/50">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Onboarding</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Level</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Sync</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-8"><div className="h-4 bg-slate-800 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <Users size={32} className="text-slate-600" />
                                            <p className="text-sm font-medium">No students found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{user.name}</p>
                                                <p className="text-xs text-slate-500">{user.login}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-xs font-medium",
                                            user.role === 'superadmin' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                                        )}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.onboarding_passed ? (
                                            <div className="flex items-center text-emerald-500 text-xs font-medium">
                                                <CheckCircle2 size={14} className="mr-1" /> Passed
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-slate-500 text-xs font-medium">
                                                <Clock size={14} className="mr-1" /> Pending
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-300">
                                        {user.trading_level || 'Beginner'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {user.last_login ? new Date(user.last_login).toLocaleTimeString() : 'Never'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(user.login);
                                                    showToast('Login copied');
                                                }}
                                                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-300 hover:text-white"
                                            >
                                                Copy login
                                            </button>
                                            <button
                                                onClick={() => router.push(`/admin/logs?search=${encodeURIComponent(user.login)}`)}
                                                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-300 hover:text-white inline-flex items-center gap-1"
                                            >
                                                <Shield size={12} /> Logs
                                            </button>
                                            <button
                                                onClick={() => handleResetPassword(user)}
                                                disabled={user.role !== 'student'}
                                                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 disabled:opacity-40"
                                            >
                                                <RotateCcw size={12} /> Reset
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStudent(user)}
                                                disabled={user.role !== 'student'}
                                                className="px-2.5 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-400 hover:text-red-300 inline-flex items-center gap-1 disabled:opacity-40"
                                            >
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal & Toasts */}
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
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { if (!createdCredentials) setIsModalOpen(false) }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md glass-card p-8 space-y-6"
                        >
                            {!createdCredentials ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-white flex items-center">
                                            <UserPlus size={24} className="mr-2 text-primary" />
                                            Add New Member
                                        </h2>
                                        <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <form onSubmit={handleCreateUser} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-400 ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                placeholder="e.g. Alex Trader"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-400 ml-1">Academy Role</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setRole('student')}
                                                    className={cn(
                                                        "py-3 rounded-xl border font-medium transition-all",
                                                        role === 'student'
                                                            ? "bg-primary/20 border-primary text-primary"
                                                            : "bg-slate-900 border-slate-700 text-slate-500"
                                                    )}
                                                >
                                                    Student
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRole('superadmin')}
                                                    className={cn(
                                                        "py-3 rounded-xl border font-medium transition-all",
                                                        role === 'superadmin'
                                                            ? "bg-purple-500/20 border-purple-500 text-purple-500"
                                                            : "bg-slate-900 border-slate-700 text-slate-500"
                                                    )}
                                                >
                                                    Admin
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isCreating}
                                            className="w-full py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 transition-all mt-6"
                                        >
                                            {isCreating ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Generate Login & Access'}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="space-y-6 text-center">
                                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Member Created</h2>
                                    <p className="text-slate-400">Provide these credentials to the user. They will only be shown once.</p>

                                    <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl space-y-3 text-left">
                                        <div>
                                            <label className="text-xs uppercase font-bold text-slate-500">Login ID</label>
                                            <p className="text-white font-mono text-lg">{createdCredentials.login}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase font-bold text-slate-500">Security Password</label>
                                            <p className="text-white font-mono text-lg">{createdCredentials.password}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={copyToClipboard}
                                            className="flex-1 flex items-center justify-center py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
                                        >
                                            {copied ? <Check size={18} className="mr-2 text-emerald-500" /> : <Copy size={18} className="mr-2" />}
                                            {copied ? 'Copied!' : 'Copy Info'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCreatedCredentials(null);
                                                setIsModalOpen(false);
                                            }}
                                            className="flex-1 py-3 bg-primary text-white font-bold rounded-xl"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}

                {resetCredentials && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setResetCredentials(null)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md glass-card p-8 space-y-6"
                        >
                            <h2 className="text-2xl font-bold text-white">Temporary Password</h2>
                            <p className="text-sm text-slate-400">Share this password with the student. It is shown only once.</p>

                            <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl space-y-3 text-left">
                                <div>
                                    <label className="text-xs uppercase font-bold text-slate-500">Login ID</label>
                                    <p className="text-white font-mono text-lg">{resetCredentials.login}</p>
                                </div>
                                <div>
                                    <label className="text-xs uppercase font-bold text-slate-500">New Temporary Password</label>
                                    <p className="text-white font-mono text-lg">{resetCredentials.password}</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`Login: ${resetCredentials.login}\nPassword: ${resetCredentials.password}`);
                                        showToast('Credentials copied');
                                    }}
                                    className="flex-1 flex items-center justify-center py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
                                >
                                    <Copy size={18} className="mr-2" /> Copy Info
                                </button>
                                <button
                                    onClick={() => setResetCredentials(null)}
                                    className="flex-1 py-3 bg-primary text-white font-bold rounded-xl"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
