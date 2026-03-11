'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    MessageSquare,
    Search,
    TrendingUp,
    Award,
    Zap,
    Play,
    LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { cn } from '@/lib/utils';

export default function StudentDashboard() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const userStr = Cookies.get('user');
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
    }, []);

    const handleLogout = () => {
        Cookies.remove('token');
        Cookies.remove('user');
        router.push('/login');
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            {/* Header */}
            <nav className="glass sticky top-0 z-50 px-8 py-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2 text-2xl font-bold">
                    <Zap className="text-primary fill-primary" />
                    <span>TradeMentor</span>
                </div>

                <div className="flex items-center space-x-6">
                    <div className="hidden md:flex items-center space-x-1 px-4 py-2 bg-slate-900/50 rounded-full border border-slate-800 text-sm text-slate-400">
                        <Search size={16} className="mr-2" />
                        <span>Search knowledge base...</span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm font-bold">{user.name}</p>
                            <p className="text-[10px] text-emerald-500 uppercase tracking-widest">{user.role}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-12">
                {/* Welcome Banner */}
                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-900 p-10 shadow-2xl shadow-blue-500/10">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
                    <div className="relative z-10 space-y-6 max-w-2xl">
                        <div className="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/20 uppercase tracking-widest">
                            Current Level: Apprentice
                        </div>
                        <h1 className="text-5xl font-bold leading-tight">
                            Unlock Your Edge in <br />
                            <span className="text-blue-300 italic">Financial Markets.</span>
                        </h1>
                        <p className="text-blue-100/80 text-lg">
                            Your AI mentor is ready to analyze your trades and provide personalized market insights.
                        </p>
                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => router.push('/ai')}
                                className="flex items-center px-8 py-4 bg-white text-blue-900 font-bold rounded-2xl hover:bg-blue-50 transition-all shadow-xl shadow-blue-950/20 active:scale-95"
                            >
                                <MessageSquare className="mr-2" />
                                Ask AI Mentor
                            </button>
                            <button className="flex items-center px-8 py-4 bg-transparent border-2 border-white/30 text-white font-bold rounded-2xl hover:bg-white/10 transition-all active:scale-95">
                                <BookOpen className="mr-2" />
                                Continue Learning
                            </button>
                        </div>
                    </div>
                </section>

                {/* Stats & Progress */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold flex items-center">
                                <Play className="mr-3 text-primary" size={20} />
                                Current Courses
                            </h2>
                            <button className="text-primary text-sm font-bold hover:underline">View All</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Course Card 1 */}
                            <div className="glass-card hover:border-primary/50 transition-all group overflow-hidden cursor-pointer">
                                <div className="h-40 bg-slate-900 relative overflow-hidden">
                                    <img
                                        src="https://images.unsplash.com/photo-1611974717482-99933060a631?auto=format&fit=crop&q=80&w=600"
                                        className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                                        alt="Market Structure"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                                    <div className="absolute bottom-4 left-4">
                                        <span className="px-2 py-1 bg-primary text-[10px] font-bold rounded">BASIC</span>
                                    </div>
                                </div>
                                <div className="p-5 space-y-4">
                                    <h3 className="font-bold text-lg">Introduction to SMC</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Progress</span>
                                            <span>45%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: '45%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Course Card 2 */}
                            <div className="glass-card hover:border-emerald-500/50 transition-all group overflow-hidden cursor-pointer">
                                <div className="h-40 bg-slate-900 relative overflow-hidden">
                                    <img
                                        src="https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=600"
                                        className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                                        alt="Liquidity"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                                    <div className="absolute bottom-4 left-4">
                                        <span className="px-2 py-1 bg-emerald-500 text-[10px] font-bold rounded">INTERMEDIATE</span>
                                    </div>
                                </div>
                                <div className="p-5 space-y-4">
                                    <h3 className="font-bold text-lg">Liquidity Patterns</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Progress</span>
                                            <span>10%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: '10%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Sidebar */}
                    <div className="space-y-8">
                        <h2 className="text-2xl font-bold flex items-center">
                            <TrendingUp className="mr-3 text-accent" size={20} />
                            Performance
                        </h2>
                        <div className="glass-card p-6 space-y-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Global Rank</p>
                                    <p className="text-3xl font-bold mt-1">#1,242</p>
                                </div>
                                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                                    <Award size={28} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Skill Matrix</p>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Technical Analysis', val: 78, color: 'primary' },
                                        { label: 'Risk Management', val: 92, color: 'accent' },
                                        { label: 'Psychology', val: 65, color: 'amber-500' }
                                    ].map((skill, i) => (
                                        <div key={i} className="space-y-1.5">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-300">{skill.label}</span>
                                                <span className={`text-${skill.color}`}>{skill.val}%</span>
                                            </div>
                                            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full bg-${skill.color} rounded-full`} style={{ width: `${skill.val}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Floating Action Component for AI Chat */}
            <div className="fixed bottom-8 right-8 z-50">
                <button
                    onClick={() => router.push('/ai')}
                    className="w-16 h-16 bg-primary rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center text-white hover:scale-110 transition-all active:scale-95 group relative"
                >
                    <MessageSquare size={28} />
                    <div className="absolute right-full mr-4 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Ask TradeMentor AI
                    </div>
                </button>
            </div>
        </div>
    );
}
