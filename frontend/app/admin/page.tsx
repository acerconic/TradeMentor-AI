'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    BookOpen,
    MessageCircle,
    ShieldAlert,
    TrendingUp,
    UserPlus
} from 'lucide-react';
import { api } from '@/lib/api';

const StatCard = ({ icon: Icon, label, value, color, delay }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="glass-card p-6 flex items-start space-x-4"
    >
        <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-slate-400 text-sm font-medium">{label}</p>
            <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
        </div>
    </motion.div>
);

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeCourses: 0,
        aiRequests: 0,
        errorLogs: 0
    });

    useEffect(() => {
        // Fetch initial stats
        const fetchStats = async () => {
            try {
                const usersRes = await api.get('/admin/users');
                const logsRes = await api.get('/admin/logs');

                setStats({
                    totalUsers: usersRes.data.length,
                    activeCourses: 0, // Placeholder
                    aiRequests: logsRes.data.filter((l: any) => l.action === 'AI_REQUEST').length,
                    errorLogs: logsRes.data.filter((l: any) => l.details?.includes('ERROR')).length
                });
            } catch (e) {
                console.error('Failed to fetch stats', e);
            }
        };
        fetchStats();
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
                        <button className="text-primary text-sm font-medium hover:underline">View All</button>
                    </div>

                    <div className="space-y-4">
                        <p className="text-slate-500 text-sm italic py-8 text-center bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                            Data integration in progress...
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-card p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
                    <div className="space-y-3">
                        <button className="w-full flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-primary/50 rounded-xl transition-all group">
                            <div className="flex items-center space-x-3 text-slate-300 group-hover:text-white transition-colors">
                                <UserPlus size={20} className="text-primary" />
                                <span className="font-medium">Direct Create User</span>
                            </div>
                        </button>
                        <button className="w-full flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl transition-all group">
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
