'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    User, Mail, Shield, Calendar,
    ArrowLeft, Camera, Edit3, Settings,
    ChevronRight, Award, Zap, Star
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Image from 'next/image';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const userStr = Cookies.get('user');
        if (userStr) setUser(JSON.parse(userStr));
        else router.push('/login');
    }, [router]);

    if (!user) return null;

    return (
        <div className="min-h-screen text-white pb-20" style={{ background: '#0B1220' }}>
            {/* Header / Cover */}
            <div className="h-48 w-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1A0F3E 0%, #0D1A3A 100%)' }}>
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #7B3FE4 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                <button
                    onClick={() => router.back()}
                    className="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10"
                >
                    <ArrowLeft size={16} /> Back
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-6 -mt-20 relative z-20">
                {/* Profile Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 mb-8"
                >
                    <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                        <div className="relative group/avatar">
                            <div className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl relative overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}>
                                {user.name?.charAt(0)}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <Camera size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>{user.name}</h1>
                            <div className="flex flex-wrap gap-4 items-center">
                                <span className="flex items-center gap-2 text-sm text-slate-400">
                                    <Mail size={14} className="text-purple-500" /> {user.email}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-slate-700 hidden md:block" />
                                <span className="flex items-center gap-2 text-sm text-slate-400">
                                    <Shield size={14} className="text-blue-500" /> Student Account
                                </span>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-[0_0_20px_rgba(123,63,228,0.4)]">
                                    Edit Profile
                                </button>
                                <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-slate-400">
                                    <Settings size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="hidden lg:block w-px h-32 bg-white/5" />

                        <div className="hidden lg:grid grid-cols-2 gap-4">
                            <div className="text-center p-4">
                                <p className="text-2xl font-black text-white">0%</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Progress</p>
                            </div>
                            <div className="text-center p-4">
                                <p className="text-2xl font-black text-white">0</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">lessons</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Stats */}
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass-card p-6"
                        >
                            <h3 className="text-sm font-black uppercase tracking-wider mb-6 text-slate-500">Badges</h3>
                            <div className="grid grid-cols-4 gap-3">
                                {[1, 2, 3].map(id => (
                                    <div key={id} className="aspect-square rounded-xl bg-white/5 flex items-center justify-center text-slate-600 grayscale opacity-30">
                                        <Award size={20} />
                                    </div>
                                ))}
                                <div className="aspect-square rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
                                    <Star size={20} fill="currentColor" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card p-6"
                        >
                            <h3 className="text-sm font-black uppercase tracking-wider mb-4 text-slate-500">Active Streaks</h3>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-orange-500/20 text-orange-500">
                                    <Zap size={24} fill="currentColor" />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-white">1 Day</p>
                                    <p className="text-xs text-slate-500">Next milestone: 7 days</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Main Settings/Info */}
                    <div className="md:col-span-2 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 }}
                            className="glass-card p-6"
                        >
                            <h3 className="text-lg font-bold text-white mb-6">Account Details</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Member Since</p>
                                            <p className="text-sm font-semibold">March 2026</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-600" />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500">
                                            <Shield size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Security Level</p>
                                            <p className="text-sm font-semibold">Two-factor: Disabled</p>
                                        </div>
                                    </div>
                                    <button className="text-xs font-bold text-purple-500 hover:text-purple-400">Enable</button>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.25 }}
                            className="glass-card p-6"
                        >
                            <h3 className="text-lg font-bold text-white mb-6">My Learning Path</h3>
                            <div className="flex flex-col items-center justify-center py-10">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-600 mb-4">
                                    <Award size={32} />
                                </div>
                                <p className="text-slate-500 text-sm text-center">You haven't completed any courses yet.<br />Start your trading journey now!</p>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="mt-6 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold transition-all"
                                >
                                    Browse Academy
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
