'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Award, BookOpen, Calendar, Settings, User, GraduationCap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

type Course = {
    id: string;
    title: string;
    progress_percent?: number;
    completed_lessons?: number;
    lessons_count?: number;
};

export default function ProfilePage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [user, setUser] = useState<any>(null);
    const [courses, setCourses] = useState<Course[]>([]);

    useEffect(() => {
        const userStr = Cookies.get('user');
        if (!userStr) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(userStr));

        api.get('/courses').then((res) => setCourses(res.data || [])).catch(() => setCourses([]));
    }, [router]);

    const stats = useMemo(() => {
        const totalCourses = courses.length;
        const totalLessons = courses.reduce((sum, c) => sum + Number(c.lessons_count || 0), 0);
        const completedLessons = courses.reduce((sum, c) => sum + Number(c.completed_lessons || 0), 0);
        const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        return { totalCourses, totalLessons, completedLessons, progress };
    }, [courses]);

    if (!user) return null;

    return (
        <div className="min-h-screen text-white pb-16" style={{ background: '#0B1220' }}>
            <div className="max-w-5xl mx-auto px-6 pt-10">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="btn-secondary px-4 py-2 text-sm font-bold inline-flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> {t('common.back')}
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/settings')}
                        className="btn-primary px-4 py-2 text-sm font-bold inline-flex items-center gap-2"
                    >
                        <Settings size={16} /> {t('common.settings')}
                    </button>
                </div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-7">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white" style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}>
                            {String(user.name || 'U').charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>{user.name}</h1>
                            <p className="text-sm mt-1" style={{ color: '#7B8CA6' }}>{user.login}</p>
                            <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: '#7B8CA6' }}>
                                <span className="inline-flex items-center gap-1"><GraduationCap size={12} /> {user.tradingLevel || 'Beginner'}</span>
                                <span className="inline-flex items-center gap-1"><Calendar size={12} /> {new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="glass-card p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500">{t('common.courses')}</p>
                        <p className="text-2xl font-black mt-1">{stats.totalCourses}</p>
                    </div>
                    <div className="glass-card p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500">{t('common.lessons')}</p>
                        <p className="text-2xl font-black mt-1">{stats.totalLessons}</p>
                    </div>
                    <div className="glass-card p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500">{t('common.completed')}</p>
                        <p className="text-2xl font-black mt-1">{stats.completedLessons}</p>
                    </div>
                    <div className="glass-card p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500">{t('common.progress')}</p>
                        <p className="text-2xl font-black mt-1">{stats.progress}%</p>
                    </div>
                </div>

                <div className="glass-card p-6 mt-6">
                    <h2 className="text-lg font-bold mb-4">{t('profile.learningPath')}</h2>
                    {courses.length === 0 ? (
                        <div className="text-center py-10">
                            <BookOpen size={32} className="mx-auto mb-3" style={{ color: '#7B8CA6' }} />
                            <p className="text-sm" style={{ color: '#7B8CA6' }}>{t('common.noCourses')}</p>
                            <button onClick={() => router.push('/dashboard/academy')} className="btn-secondary mt-4 px-4 py-2 text-sm font-bold">{t('profile.browseAcademy')}</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {courses.map((course) => (
                                <button
                                    key={course.id}
                                    onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                                    className="w-full text-left rounded-xl p-4 hover:bg-white/[0.02] transition-colors"
                                    style={{ border: '1px solid rgba(123,63,228,0.12)', background: 'rgba(11,18,32,0.55)' }}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="text-sm font-semibold text-white">{course.title}</p>
                                        <span className="text-xs font-bold" style={{ color: '#A87BFF' }}>{Number(course.progress_percent || 0)}%</span>
                                    </div>
                                    <div className="mt-2 h-1.5 rounded-full" style={{ background: 'rgba(123,63,228,0.14)' }}>
                                        <div className="h-1.5 rounded-full" style={{ width: `${Number(course.progress_percent || 0)}%`, background: 'linear-gradient(90deg, #7B3FE4, #2AA9FF)' }} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <button onClick={() => router.push('/dashboard/assessment')} className="btn-secondary px-4 py-2 text-sm font-bold inline-flex items-center gap-2">
                        <Award size={14} /> Re-take assessment
                    </button>
                </div>
            </div>
        </div>
    );
}
