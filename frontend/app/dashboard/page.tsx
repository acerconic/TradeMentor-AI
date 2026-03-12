'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    MessageSquare,
    Search,
    TrendingUp,
    Award,
    Zap,
    Play,
    LogOut,
    Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export default function StudentDashboard() {
    const [user, setUser] = useState<any>(null);
    const [lang, setLang] = useState('EN');
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const router = useRouter();

    const fetchCourses = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/courses');
            setCourses(res.data);
        } catch (e) {
            console.error('Failed to fetch courses', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const userStr = Cookies.get('user');
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
        fetchCourses();
    }, []);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleFeatureSoon = (e: React.MouseEvent, feature: string) => {
        e.preventDefault();
        showToast(`${feature} feature is coming soon!`);
    };

    const changeLanguage = (newLang: string) => {
        setLang(newLang);
        showToast(`Language switched to ${newLang}`);
    };

    const handleLogout = () => {
        Cookies.remove('token');
        Cookies.remove('user');
        router.push('/login');
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col relative">
            {/* Toast Notification */}
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

            {/* Header */}
            <nav className="glass sticky top-0 z-[100] px-8 py-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => router.push('/dashboard')}>
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
                        <button onClick={() => router.push('/dashboard')} className="text-white hover:text-white transition-colors relative">
                            Academy
                            <div className="absolute -bottom-1.5 left-0 w-full h-[2px] bg-primary rounded-full"></div>
                        </button>
                        <button onClick={(e) => handleFeatureSoon(e, 'Signals')} className="hover:text-white transition-colors">Signals</button>
                        <button onClick={(e) => handleFeatureSoon(e, 'Profile')} className="hover:text-white transition-colors">Profile</button>
                    </div>

                    <div className="flex items-center space-x-4 border-l border-white/10 pl-6">
                        {/* Language Switcher */}
                        <div className="relative group/lang px-3 py-1.5 bg-slate-900 rounded-lg border border-white/5 flex items-center space-x-2 text-xs font-bold cursor-pointer hover:bg-slate-800 transition-all">
                            <span className="text-slate-400">{lang}</span>
                            <div className="hidden group-hover/lang:block absolute top-full right-0 mt-2 w-24 glass-card p-1 z-50 overflow-hidden">
                                {['EN', 'RU', 'UZ'].filter(l => l !== lang).map((l) => (
                                    <div key={l} onClick={() => changeLanguage(l)} className="px-3 py-2 hover:bg-white/5 rounded text-left transition-colors">{l}</div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 px-3 py-1 bg-slate-900 rounded-xl border border-white/5">
                            <div onClick={(e) => handleFeatureSoon(e, 'Profile')} className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-primary/30 transition-colors">
                                {user.name.charAt(0)}
                            </div>
                            <div className="hidden sm:block cursor-pointer" onClick={(e) => handleFeatureSoon(e, 'Profile')}>
                                <p className="text-xs font-bold leading-tight hover:text-primary transition-colors">{user.name}</p>
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
                                <button onClick={(e) => handleFeatureSoon(e, 'View Modules')} className="mt-8 flex items-center justify-center w-full py-4 bg-slate-800 text-white font-black text-sm uppercase rounded-2xl hover:bg-slate-700 transition-all border border-white/5 active:scale-95">
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
                            <button onClick={(e) => handleFeatureSoon(e, 'View All Courses')} className="text-primary text-sm font-bold hover:underline">View All</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {isLoading ? (
                                <div className="col-span-2 py-12 flex justify-center items-center text-slate-500">
                                    <Loader2 className="animate-spin mr-3 text-primary" size={24} />
                                    Loading your academy content...
                                </div>
                            ) : courses.length === 0 ? (
                                <div className="glass-card col-span-2 hover:border-primary/50 transition-all p-12 text-center space-y-4 border-dashed border-2 border-slate-800">
                                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-700">
                                        <BookOpen size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg">Нет доступных курсов</h3>
                                        <p className="text-slate-500 text-sm mt-1">Курсы пока не добавлены администратором.</p>
                                    </div>
                                </div>
                            ) : (
                                courses.map(course => (
                                    <div key={course.id} onClick={(e) => handleFeatureSoon(e, 'Course Details')} className="glass-card flex flex-col justify-between hover:border-primary/50 transition-all group overflow-hidden cursor-pointer h-full">
                                        <div className="h-32 bg-slate-900 relative overflow-hidden shrink-0">
                                            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 group-hover:scale-105 transition-transform duration-700" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                                            <div className="absolute bottom-3 left-4 flex gap-2">
                                                <span className={cn(
                                                    "px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider",
                                                    course.level === 'Beginner' ? "bg-emerald-500 text-slate-950" :
                                                        course.level === 'Intermediate' ? "bg-amber-500 text-slate-950" :
                                                            "bg-red-500 text-white"
                                                )}>{course.level}</span>
                                                <span className="px-2 py-1 bg-primary text-[10px] font-bold rounded uppercase tracking-wider text-white">
                                                    {course.language}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                            <div>
                                                <h3 className="font-bold text-lg leading-tight line-clamp-2">{course.title}</h3>
                                                <p className="text-slate-400 text-xs mt-2 line-clamp-2">{course.description || "No description provided."}</p>
                                            </div>
                                            <div className="space-y-2 pt-4 mt-auto">
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span>Progress / Draft</span>
                                                    <span>0%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: '0%' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
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
