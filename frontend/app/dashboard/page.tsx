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
            <nav className="glass sticky top-0 z-[100] px-8 py-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center space-x-3 group cursor-pointer">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-emerald-500 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-slate-900 p-1.5 rounded-lg border border-white/10">
                            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                <path d="M20 5L5 15V25L20 35L35 25V15L20 5Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M20 12V28M13 18L20 25L27 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                    <span className="text-xl font-bold tracking-tighter uppercase">
                        Trade<span className="text-primary italic">Mentor</span> AI
                    </span>
                </div>

                <div className="flex items-center space-x-8">
                    <div className="hidden lg:flex items-center space-x-6 text-sm font-medium text-slate-400">
                        <a href="#" className="hover:text-white transition-colors">Academy</a>
                        <a href="#" className="hover:text-white transition-colors">Signals</a>
                    </div>

                    <div className="flex items-center space-x-4 border-l border-white/10 pl-6">
                        {/* Language Switcher */}
                        <div className="relative group/lang px-3 py-1.5 bg-slate-900 rounded-lg border border-white/5 flex items-center space-x-2 text-xs font-bold cursor-pointer hover:bg-slate-800 transition-all">
                            <span className="text-slate-400">RU</span>
                            <div className="hidden group-hover/lang:block absolute top-full right-0 mt-2 w-24 glass-card p-1 z-50 overflow-hidden">
                                <div className="px-3 py-2 hover:bg-white/5 rounded text-left">EN</div>
                                <div className="px-3 py-2 hover:bg-white/5 rounded text-left">UZ</div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 px-3 py-1 bg-slate-900 rounded-xl border border-white/5">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                                {user.name.charAt(0)}
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-xs font-bold leading-tight">{user.name}</p>
                                <p className="text-[9px] text-slate-500 uppercase tracking-tighter">Student</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors ml-2"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-12">
                {/* Welcome Section */}
                <section className="relative px-2">
                    <div className="space-y-2">
                        <motion.h2
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl font-bold tracking-tight text-white"
                        >
                            Welcome back, <span className="text-gradient font-extrabold">{user.name}</span>! 👋
                        </motion.h2>
                        <p className="text-slate-500 text-lg font-medium">Ready to sharpen your trading edge today?</p>
                    </div>

                    <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 p-8 shadow-2xl shadow-blue-500/20"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-1000" />
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="space-y-4">
                                    <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-white/20">
                                        AI ANALYST ACTIVE
                                    </span>
                                    <h3 className="text-3xl font-bold leading-tight">Master Market <br /> Structure with AI</h3>
                                    <p className="text-blue-100/70 text-sm max-w-[240px]">Get instant feedback on your charts and psychology.</p>
                                </div>
                                <button
                                    onClick={() => router.push('/ai')}
                                    className="mt-8 flex items-center justify-center w-full py-4 bg-white text-blue-900 font-black text-sm uppercase rounded-2xl hover:bg-blue-50 transition-all shadow-xl shadow-blue-950/20 active:scale-95"
                                >
                                    <MessageSquare className="mr-2" size={18} />
                                    Consult Mentor
                                </button>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="group relative overflow-hidden rounded-[2.5rem] bg-slate-900 border border-white/5 p-8"
                        >
                            <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mb-10" />
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="space-y-4">
                                    <span className="px-4 py-1.5 bg-emerald-500/10 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">
                                        QUICK START
                                    </span>
                                    <h3 className="text-3xl font-bold leading-tight">Your Progress <br /> Academy</h3>
                                    <p className="text-slate-500 text-sm max-w-[240px]">Resume your path to professional fund management.</p>
                                </div>
                                <button className="mt-8 flex items-center justify-center w-full py-4 bg-slate-800 text-white font-black text-sm uppercase rounded-2xl hover:bg-slate-700 transition-all border border-white/5 active:scale-95">
                                    <BookOpen className="mr-2" size={18} />
                                    View Modules
                                </button>
                            </div>
                        </motion.div>
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
