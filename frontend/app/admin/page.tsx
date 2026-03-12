'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    BookOpen,
    MessageCircle,
    ShieldAlert,
    TrendingUp,
    UserPlus,
    Activity,
    Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const StatCard = ({ icon: Icon, label, value, color, delay }: any) => {
    // Map text color to tailwind class manually to avoid purged classes
    const colorClasses: Record<string, { bg: string, text: string }> = {
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="glass-card p-6 flex items-start space-x-4"
        >
            <div className={`p-3 rounded-xl ${colorClasses[color]?.bg || 'bg-slate-500/10'} ${colorClasses[color]?.text || 'text-slate-500'}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-slate-400 text-sm font-medium">{label}</p>
                <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
            </div>
        </motion.div>
    );
};

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeCourses: 0,
        aiRequests: 0,
        errorLogs: 0
    });
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStatsAndLogs = async () => {
            setIsLoading(true);
            try {
                const [statsRes, logsRes] = await Promise.all([
                    api.get('/admin/stats'),
                    api.get('/admin/logs')
                ]);

                setStats({
                    totalUsers: statsRes.data.totalStudents || 0,
                    activeCourses: statsRes.data.activeCourses || 0,
                    aiRequests: statsRes.data.aiInteractions || 0,
                    errorLogs: statsRes.data.systemAlerts || 0
                });
                setLogs(logsRes.data.slice(0, 5)); // Just take top 5 recent logs
            } catch (e) {
                console.error('Failed to fetch dashboard data', e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStatsAndLogs();
    }, []);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white">System Overview</h1>
                <p className="text-slate-400 mt-1">Platform analytics and quick actions</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Users}
                    label="Total Students"
                    value={stats.totalUsers}
                    color="blue"
                    delay={0.1}
                />
                <StatCard
                    icon={BookOpen}
                    label="Active Courses"
                    value={stats.activeCourses}
                    color="emerald"
                    delay={0.2}
                />
                <StatCard
                    icon={MessageCircle}
                    label="AI Interactions"
                    value={stats.aiRequests}
                    color="purple"
                    delay={0.3}
                />
                <StatCard
                    icon={ShieldAlert}
                    label="System Alerts"
                    value={stats.errorLogs}
                    color="amber"
                    delay={0.4}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                {/* Recent Activity */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <TrendingUp size={20} className="mr-2 text-primary" />
                            Recent Activity
                        </h2>
                        <button onClick={() => router.push('/admin/logs')} className="text-primary text-sm font-medium hover:underline">View All</button>
                    </div>

                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="py-12 flex justify-center items-center text-slate-500">
                                <Loader2 className="animate-spin mr-3 text-primary" size={24} />
                                Loading activity...
                            </div>
                        ) : logs.length === 0 ? (
                            <p className="text-slate-500 text-sm italic py-8 text-center bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                                No recent activity found.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {logs.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                                                <Activity size={18} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-white text-sm">{log.action}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">User: {log.user_login || 'Unknown'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">{new Date(log.created_at).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">{new Date(log.created_at).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-card p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
                    <div className="space-y-3">
                        <button onClick={() => router.push('/admin/students')} className="w-full flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-primary/50 rounded-xl transition-all group">
                            <div className="flex items-center space-x-3 text-slate-300 group-hover:text-white transition-colors">
                                <UserPlus size={20} className="text-primary" />
                                <span className="font-medium">Direct Create User</span>
                            </div>
                        </button>
                        <button onClick={() => router.push('/admin/courses')} className="w-full flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl transition-all group">
                            <div className="flex items-center space-x-3 text-slate-300 group-hover:text-white transition-colors">
                                <BookOpen size={20} className="text-emerald-500" />
                                <span className="font-medium">Add New Course</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
