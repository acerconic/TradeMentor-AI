'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    MessageSquare,
    TrendingUp,
    Award,
    Play,
    Radio,
    Settings,
    User,
    Languages,
    LogOut as LogOutIcon,
    ChevronDown,
    Zap,
    Brain,
    ChevronRight,
    Loader2,
    BarChart2
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export default function StudentDashboard() {
    const { t, language, setLanguage } = useLanguage();
    const [user, setUser] = useState<any>(null);
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
            // ignore
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const userStr = Cookies.get('user');
        if (userStr) setUser(JSON.parse(userStr));
        fetchCourses();
    }, []);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleLogout = () => {
        Cookies.remove('token');
        Cookies.remove('user');
        router.push('/login');
    };

    if (!user) return null;

    const totalLessons = courses.reduce((sum, c) => sum + Number(c.lessons_count || 0), 0);
    const completedLessons = courses.reduce((sum, c) => sum + Number(c.completed_lessons || 0), 0);
    const inProgressLessons = Math.max(0, totalLessons - completedLessons);
    const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const firstName = user.name?.split(' ')[0] || user.name;

    return (
        <div className="min-h-screen text-white flex flex-col" style={{ background: '#0B1220' }}>
            {/* Toast */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -60 }}
                        className="fixed top-5 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-white text-sm font-semibold"
                        style={{ transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)', boxShadow: '0 8px 32px rgba(123,63,228,0.4)' }}
                    >
                        <Zap size={16} fill="white" />
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navbar */}
            <nav className="sticky top-0 z-[100] px-6 md:px-10 py-4 flex items-center justify-between"
                style={{ background: 'rgba(11,18,32,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(123,63,228,0.12)' }}>
                <div className="flex items-center gap-3">
                    <Image
                        src="/logo.png"
                        alt="TradeMentor AI"
                        width={150}
                        height={40}
                        className="object-contain cursor-pointer"
                        priority
                        onClick={() => router.push('/dashboard')}
                    />
                </div>

                <div className="hidden md:flex items-center gap-1">
                    {[
                        { label: t('common.academy'), active: true, href: '/dashboard/academy' },
                        { label: t('common.progress'), active: false, href: '/dashboard/profile' },
                        { label: t('common.faq'), active: false, href: '/dashboard/faq' },
                    ].map(item => (
                        <button
                            key={item.label}
                            onClick={() => {
                                if (item.href) router.push(item.href);
                            }}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-medium transition-all text-slate-400 hover:text-white"
                            )}
                            style={item.active ? {
                                background: 'linear-gradient(135deg, rgba(123,63,228,0.2), rgba(42,169,255,0.1))',
                                color: '#A87BFF',
                                border: '1px solid rgba(123,63,228,0.3)'
                            } : {}}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    {/* Language Switcher */}
                    <div className="flex items-center bg-[#111A2F] rounded-xl p-1 border border-white/5">
                        <button
                            onClick={() => setLanguage('RU')}
                            className={cn(
                                "px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                                language === 'RU' ? "bg-purple-600 text-white" : "text-slate-500 hover:text-slate-300"
                            )}
                        >RU</button>
                        <button
                            onClick={() => setLanguage('UZ')}
                            className={cn(
                                "px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                                language === 'UZ' ? "bg-purple-600 text-white" : "text-slate-500 hover:text-slate-300"
                            )}
                        >UZ</button>
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative group">
                        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer"
                            style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.15)' }}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}>
                                {firstName.charAt(0)}
                            </div>
                            <span className="hidden sm:block text-sm font-semibold text-white">{firstName}</span>
                            <ChevronDown size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                        </div>

                        {/* Dropdown Menu */}
                        <div className="absolute right-0 mt-2 w-48 rounded-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[110]"
                            style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.2)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                            <button
                                onClick={() => router.push('/dashboard/profile')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left"
                            >
                                <User size={16} /> {t('common.profile')}
                            </button>
                            <button
                                onClick={() => router.push('/dashboard/settings')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left"
                            >
                                <Settings size={16} /> {t('common.settings')}
                            </button>
                            <button
                                onClick={() => router.push('/dashboard/faq')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left"
                            >
                                <BookOpen size={16} /> {t('common.faq')}
                            </button>
                            <div className="h-px bg-white/5 my-1" />
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-all text-left"
                            >
                                <LogOutIcon size={16} /> {t('common.logout')}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main */}
            <main className="flex-1 px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">

                {/* Hero */}
                <section className="mb-12">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                        <p className="text-sm font-semibold mb-2" style={{ color: '#7B3FE4' }}>
                            👋 {t('common.welcomeBack')}
                        </p>
                        <h1 className="text-4xl md:text-5xl font-black leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>
                            {new Date().getHours() < 12 ? t('common.goodMorning') : new Date().getHours() < 18 ? t('common.goodAfternoon') : t('common.goodEvening')},{' '}
                            <span style={{ background: 'linear-gradient(135deg, #7B3FE4 0%, #2AA9FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {firstName}
                            </span>
                        </h1>
                        <p className="mt-3 text-lg" style={{ color: '#7B8CA6' }}>
                            {t('common.aiGuidance')}
                        </p>
                        <p className="mt-2 text-sm" style={{ color: '#A87BFF' }}>
                            Level: <strong>{user.tradingLevel || 'Beginner'}</strong>
                        </p>
                    </motion.div>

                    {/* Hero Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* AI Mentor Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="relative overflow-hidden rounded-[1.75rem] p-8 cursor-pointer group"
                            style={{
                                background: 'linear-gradient(135deg, #3B2070 0%, #1A0F3E 60%, #0D1A3A 100%)',
                                border: '1px solid rgba(123,63,228,0.3)',
                                boxShadow: '0 20px 60px rgba(123,63,228,0.2)'
                            }}
                            onClick={() => router.push('/ai')}
                        >
                            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-700"
                                style={{ background: 'radial-gradient(circle, #7B3FE4 0%, transparent 70%)' }} />
                            <div className="absolute bottom-0 left-0 w-full h-1/2 opacity-30"
                                style={{ background: 'linear-gradient(to top, rgba(123,63,228,0.15), transparent)' }} />

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168,123,255,0.2)' }}>
                                        <Brain size={18} style={{ color: '#A87BFF' }} />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#A87BFF' }}>{t('common.activeMentor')}</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white leading-tight mb-3">
                                    {t('common.masterMarkets')}
                                </h3>
                                <p className="text-sm mb-8" style={{ color: 'rgba(168,123,255,0.7)' }}>
                                    {t('common.aiGuidance')}
                                </p>
                                <button className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all"
                                    style={{ background: 'linear-gradient(135deg, #7B3FE4, #5B2DB0)', boxShadow: '0 4px 20px rgba(123,63,228,0.4)' }}>
                                    <MessageSquare size={16} />
                                    {t('common.consultAI')}
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </motion.div>

                        {/* Progress Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="relative overflow-hidden rounded-[1.75rem] p-8"
                            style={{ background: '#111A2F', border: '1px solid rgba(42,169,255,0.15)' }}
                        >
                            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full"
                                style={{ background: 'radial-gradient(circle, rgba(42,169,255,0.12) 0%, transparent 70%)' }} />
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(42,169,255,0.15)' }}>
                                            <TrendingUp size={18} style={{ color: '#2AA9FF' }} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#2AA9FF' }}>{t('common.yourProgress')}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white leading-tight mb-5">
                                        {t('common.skillMatrix')}
                                    </h3>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Technical Analysis', val: Math.max(20, overallProgress), color: '#7B3FE4' },
                                            { label: 'Risk Management', val: Math.max(20, Math.min(100, overallProgress + 10)), color: '#10B981' },
                                            { label: 'Psychology', val: Math.max(20, Math.min(100, overallProgress - 5)), color: '#2AA9FF' }
                                        ].map(skill => (
                                            <div key={skill.label}>
                                                <div className="flex justify-between text-xs mb-1.5">
                                                    <span style={{ color: '#7B8CA6' }}>{skill.label}</span>
                                                    <span className="font-bold" style={{ color: skill.color }}>{skill.val}%</span>
                                                </div>
                                                <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                    <div className="h-full rounded-full transition-all duration-1000"
                                                        style={{ width: `${skill.val}%`, background: `linear-gradient(90deg, ${skill.color}, ${skill.color}88)` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-6 pt-4" style={{ borderTop: '1px solid rgba(42,169,255,0.1)' }}>
                                    <Award size={16} style={{ color: '#F9A825' }} />
                                    <span className="text-xs font-semibold" style={{ color: '#7B8CA6' }}>Global rank: <strong className="text-white">#1,242</strong></span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Quick Stats */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {[
                        { icon: BookOpen, label: t('common.courses'), value: courses.length, color: '#7B3FE4', sub: 'available' },
                        { icon: Play, label: t('common.inProgress'), value: inProgressLessons, color: '#2AA9FF', sub: t('common.lessons') },
                        { icon: Award, label: t('common.completed'), value: completedLessons, color: '#10B981', sub: t('common.lessons') },
                        { icon: Brain, label: 'AI Sessions', value: '∞', color: '#F59E0B', sub: 'unlimited' },
                    ].map(({ icon: Icon, label, value, color, sub }) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card p-5 text-center"
                        >
                            <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${color}20` }}>
                                <Icon size={20} style={{ color }} />
                            </div>
                            <p className="text-2xl font-black text-white">{value}</p>
                            <p className="text-xs font-semibold mt-0.5" style={{ color }}>{label}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: '#3D4D63' }}>{sub}</p>
                        </motion.div>
                    ))}
                </section>

                {/* Courses Section */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <BookOpen size={20} style={{ color: '#7B3FE4' }} />
                            {t('common.availableCourses')}
                        </h2>
                        <span className="text-xs px-3 py-1 rounded-full badge-purple font-bold">{courses.length} {t('common.courses')}</span>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20 gap-3" style={{ color: '#7B8CA6' }}>
                            <Loader2 size={24} className="animate-spin" style={{ color: '#7B3FE4' }} />
                            Loading your academy...
                        </div>
                    ) : courses.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="glass-card p-16 text-center"
                            style={{ border: '2px dashed rgba(123,63,228,0.2)' }}
                        >
                            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                                style={{ background: 'rgba(123,63,228,0.1)', boxShadow: '0 0 30px rgba(123,63,228,0.15)' }}>
                                <BookOpen size={32} style={{ color: '#7B3FE4' }} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{t('common.noCourses')}</h3>
                            <p className="text-sm mt-1" style={{ color: '#3D4D63' }}>Пока что ты можешь использовать AI Mentor!</p>
                            <button
                                onClick={() => router.push('/ai')}
                                className="mt-6 px-6 py-3 text-white font-bold rounded-xl text-sm transition-all"
                                style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)', boxShadow: '0 4px 20px rgba(123,63,228,0.35)' }}
                            >
                                <Brain size={16} className="inline-block mr-2" />
                                {t('common.askAI')}
                            </button>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {courses.map((course, i) => (
                                <motion.div
                                    key={course.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="glass-card overflow-hidden cursor-pointer group"
                                    onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                                >
                                    {/* Course header */}
                                    <div className="h-28 relative overflow-hidden"
                                        style={{ background: `linear-gradient(135deg, ${['#3B1F7A', '#0F3460', '#1A3A2A', '#3A1A0F'][i % 4]} 0%, #0B1220 100%)` }}>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-15 transition-opacity">
                                            <BarChart2 size={80} />
                                        </div>
                                        <div className="absolute bottom-3 left-4 flex gap-2">
                                            {course.category && (
                                                <span className="badge-purple px-2.5 py-1 rounded-full text-[10px] font-black uppercase">{course.category}</span>
                                            )}
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase",
                                                course.level === 'Beginner' ? "badge-green" : course.level === 'Intermediate' ? "badge-amber" : "badge-blue"
                                            )}>{course.level || 'Beginner'}</span>
                                        </div>
                                    </div>

                                    {/* Course body */}
                                    <div className="p-5">
                                        <h3 className="font-bold text-white leading-tight line-clamp-2 mb-1">{course.title}</h3>
                                        <p className="text-xs line-clamp-2 mb-5" style={{ color: '#7B8CA6' }}>
                                            {course.description || 'Professional trading course material'}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs" style={{ color: '#3D4D63' }}>
                                                {course.lessons_count || 0} {t('common.lessons')}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#7B3FE4' }}>
                                                <Play size={12} fill="currentColor" />
                                                {t('common.start')}
                                                <ChevronRight size={12} />
                                            </div>
                                        </div>
                                        {/* Progress bar */}
                                            <div className="mt-4">
                                                <div className="h-1 w-full rounded-full" style={{ background: 'rgba(123,63,228,0.15)' }}>
                                                    <div className="h-full rounded-full" style={{ width: `${Number(course.progress_percent || 0)}%`, background: 'linear-gradient(90deg, #7B3FE4, #2AA9FF)' }} />
                                                </div>
                                            </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Floating AI button */}
            <div className="fixed bottom-8 right-8 z-50">
                <button
                    onClick={() => router.push('/ai')}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl group transition-all hover:scale-110 active:scale-95 relative"
                    style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)', boxShadow: '0 8px 40px rgba(123,63,228,0.5)' }}
                >
                    <Brain size={26} />
                    <div className="absolute right-full mr-4 px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
                        style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.2)' }}>
                        {t('common.askAI')}
                    </div>
                    {/* Pulse ring */}
                    <div className="absolute inset-0 rounded-full animate-pulse-ring" style={{ border: '2px solid rgba(123,63,228,0.4)' }} />
                </button>
            </div>
        </div>
    );
}
