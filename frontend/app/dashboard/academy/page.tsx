'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  Loader2,
  LogOut as LogOutIcon,
  MessageSquare,
  Play,
  Settings,
  TrendingUp,
  User,
  Zap,
  BarChart2,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export default function AcademyPage() {
  const { t, language, setLanguage } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const router = useRouter();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    router.push('/login');
  };

  useEffect(() => {
    const userStr = Cookies.get('user');
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/courses');
        setCourses(res.data || []);
      } catch {
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const firstName = useMemo(() => {
    if (!user) return '';
    return user.name?.split(' ')[0] || user.name;
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: '#0B1220' }}>
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            className="fixed top-5 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-white text-sm font-semibold"
            style={{
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)',
              boxShadow: '0 8px 32px rgba(123,63,228,0.4)',
            }}
          >
            <Zap size={16} fill="white" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        className="sticky top-0 z-[100] px-6 md:px-10 py-4 flex items-center justify-between"
        style={{ background: 'rgba(11,18,32,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(123,63,228,0.12)' }}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="TradeMentor AI"
            width={150}
            height={40}
            className="object-contain cursor-pointer"
            priority
            onClick={() => router.push('/dashboard/academy')}
          />
        </div>

        <div className="hidden md:flex items-center gap-1">
          {[
            { label: t('common.academy'), active: true, href: '/dashboard/academy' },
            { label: t('common.progress'), active: false, href: '/dashboard/profile' }, // временно ведём на профиль (реальная страница)
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => item.href ? router.push(item.href) : null}
              className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all text-slate-400 hover:text-white")}
              style={
                item.active
                  ? {
                      background: 'linear-gradient(135deg, rgba(123,63,228,0.2), rgba(42,169,255,0.1))',
                      color: '#A87BFF',
                      border: '1px solid rgba(123,63,228,0.3)',
                    }
                  : {}
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#111A2F] rounded-xl p-1 border border-white/5">
            <button
              onClick={() => setLanguage('RU')}
              className={cn("px-2 py-1 rounded-lg text-[10px] font-bold transition-all", language === 'RU' ? "bg-purple-600 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              RU
            </button>
            <button
              onClick={() => setLanguage('UZ')}
              className={cn("px-2 py-1 rounded-lg text-[10px] font-bold transition-all", language === 'UZ' ? "bg-purple-600 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              UZ
            </button>
          </div>

          <div className="relative group">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer" style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.15)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}>
                {firstName.charAt(0)}
              </div>
              <span className="hidden sm:block text-sm font-semibold text-white">{firstName}</span>
              <ChevronDown size={14} className="text-slate-500 group-hover:text-white transition-colors" />
            </div>

            <div
              className="absolute right-0 mt-2 w-48 rounded-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[110]"
              style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.2)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
            >
              <button onClick={() => router.push('/dashboard/profile')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left">
                <User size={16} /> {t('common.profile')}
              </button>
              <button onClick={() => router.push('/dashboard/settings')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left">
                <Settings size={16} /> {t('common.settings')}
              </button>
              <div className="h-px bg-white/5 my-1" />
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-all text-left">
                <LogOutIcon size={16} /> {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
        <section className="mb-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-4xl font-black leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>
              {t('common.academy')}
            </h1>
            <p className="mt-2 text-sm" style={{ color: '#7B8CA6' }}>
              {t('common.availableCourses')}
            </p>
          </motion.div>
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3" style={{ color: '#7B8CA6' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: '#7B3FE4' }} />
            Loading your academy...
          </div>
        ) : courses.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-16 text-center" style={{ border: '2px dashed rgba(123,63,228,0.2)' }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'rgba(123,63,228,0.1)', boxShadow: '0 0 30px rgba(123,63,228,0.15)' }}>
              <BookOpen size={32} style={{ color: '#7B3FE4' }} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t('common.noCourses')}</h3>
            <p className="text-sm mt-1" style={{ color: '#3D4D63' }}>
              Пока что ты можешь использовать AI Mentor!
            </p>
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
                <div
                  className="h-28 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${['#3B1F7A', '#0F3460', '#1A3A2A', '#3A1A0F'][i % 4]} 0%, #0B1220 100%)` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-15 transition-opacity">
                    <BarChart2 size={80} />
                  </div>
                  <div className="absolute bottom-3 left-4 flex gap-2">
                    {course.category && <span className="badge-purple px-2.5 py-1 rounded-full text-[10px] font-black uppercase">{course.category}</span>}
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase",
                        course.level === 'Beginner' ? 'badge-green' : course.level === 'Intermediate' ? 'badge-amber' : 'badge-blue'
                      )}
                    >
                      {course.level || 'Beginner'}
                    </span>
                  </div>
                </div>

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
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => router.push('/ai')}
          className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl group transition-all hover:scale-110 active:scale-95 relative"
          style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)', boxShadow: '0 8px 40px rgba(123,63,228,0.5)' }}
        >
          <MessageSquare size={26} />
        </button>
      </div>
    </div>
  );
}

