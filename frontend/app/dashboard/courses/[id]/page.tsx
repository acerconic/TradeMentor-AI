'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Cookies from 'js-cookie';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  Loader2,
  LogOut as LogOutIcon,
  Play,
  Settings,
  User,
} from 'lucide-react';

type Lesson = { id: string; title: string; summary?: string; pdf_path?: string; sort_order?: number; position?: number; is_completed?: boolean };
type Module = { id: string; title: string; sort_order?: number; lessons?: Lesson[] };

export default function CoursePage({ params }: { params: { id: string } }) {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [courseRes, modulesRes] = await Promise.all([
          api.get(`/courses/${params.id}`),
          api.get(`/courses/${params.id}/lessons`),
        ]);
        setCourse(courseRes.data);
        setModules(modulesRes.data || []);
        // Expand first module by default
        const firstMod = (modulesRes.data || [])[0];
        if (firstMod?.id) setExpanded((p) => ({ ...p, [firstMod.id]: true }));
      } catch (e: any) {
        showToast(e.response?.data?.error || 'Failed to load course');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const firstName = useMemo(() => {
    if (!user) return '';
    return user.name?.split(' ')[0] || user.name;
  }, [user]);

  const firstLessonId = useMemo(() => {
    for (const m of modules) {
      const first = (m.lessons || [])[0];
      if (first?.id) return first.id;
    }
    return null;
  }, [modules]);

  const progress = useMemo(() => {
    let total = 0;
    let completed = 0;
    for (const courseModule of modules) {
      for (const lesson of (courseModule.lessons || [])) {
        total += 1;
        if (lesson.is_completed) completed += 1;
      }
    }
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [modules]);

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
            style={{ transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)', boxShadow: '0 8px 32px rgba(123,63,228,0.4)' }}
          >
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
              <button onClick={() => router.push('/dashboard/faq')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left">
                <BookOpen size={16} /> {t('common.faq')}
              </button>
              <div className="h-px bg-white/5 my-1" />
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-all text-left">
                <LogOutIcon size={16} /> {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 px-6 md:px-10 py-10 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/dashboard/academy')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.2)', color: '#A87BFF' }}
          >
            <ArrowLeft size={16} /> {t('common.back')}
          </button>

          {firstLessonId && (
            <button
              onClick={() => router.push(`/dashboard/lessons/${firstLessonId}`)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)', boxShadow: '0 4px 20px rgba(123,63,228,0.35)' }}
            >
              <Play size={16} fill="white" /> {t('common.start')}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 gap-3" style={{ color: '#7B8CA6' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: '#7B3FE4' }} />
            Loading course...
          </div>
        ) : !course ? (
          <div className="glass-card p-10 text-center" style={{ border: '2px dashed rgba(123,63,228,0.2)' }}>
            <BookOpen size={30} style={{ color: '#7B3FE4' }} className="mx-auto mb-3" />
            <p className="text-white font-bold">Course not found</p>
            <p className="text-sm mt-1" style={{ color: '#7B8CA6' }}>
              Please go back to Academy.
            </p>
          </div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <h1 className="text-3xl md:text-4xl font-black leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>
                {course.title}
              </h1>
              {course.description && (
                <p className="mt-2 text-sm" style={{ color: '#7B8CA6' }}>
                  {course.description}
                </p>
              )}
              <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(17,26,47,0.7)', border: '1px solid rgba(123,63,228,0.15)' }}>
                <div className="flex items-center justify-between text-xs" style={{ color: '#7B8CA6' }}>
                  <span>Progress: {progress.completed}/{progress.total} lessons</span>
                  <span className="font-bold" style={{ color: '#A87BFF' }}>{progress.percent}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full" style={{ background: 'rgba(123,63,228,0.15)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress.percent}%`, background: 'linear-gradient(90deg, #7B3FE4, #2AA9FF)' }} />
                </div>
              </div>
            </motion.div>

            <div className="space-y-3">
              {modules.length === 0 ? (
                <div className="glass-card p-10 text-center" style={{ border: '2px dashed rgba(123,63,228,0.2)' }}>
                  <Layers size={28} style={{ color: '#2AA9FF' }} className="mx-auto mb-2" />
                  <p className="text-white font-bold">No modules yet</p>
                  <p className="text-sm mt-1" style={{ color: '#7B8CA6' }}>
                    Import PDFs to auto-create lessons.
                  </p>
                </div>
              ) : (
                modules.map((mod, idx) => {
                  const isOpen = !!expanded[mod.id];
                  const lessons = mod.lessons || [];
                  return (
                    <div key={mod.id} className="glass-card overflow-hidden">
                      <button
                        onClick={() => setExpanded((p) => ({ ...p, [mod.id]: !p[mod.id] }))}
                        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(42,169,255,0.15)' }}>
                            <Layers size={18} style={{ color: '#2AA9FF' }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black uppercase tracking-wider" style={{ color: '#7B8CA6' }}>
                              Module {idx + 1}
                            </p>
                            <p className="text-white font-bold leading-tight">{mod.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#3D4D63' }}>
                              {lessons.length} lessons
                            </p>
                          </div>
                        </div>
                        {isOpen ? <ChevronDown size={18} style={{ color: '#7B3FE4' }} /> : <ChevronRight size={18} style={{ color: '#7B8CA6' }} />}
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-5 pb-5 space-y-2" style={{ borderTop: '1px solid rgba(123,63,228,0.1)' }}>
                              {lessons.length === 0 ? (
                                <p className="text-sm py-4 text-center" style={{ color: '#7B8CA6' }}>
                                  No lessons in this module yet
                                </p>
                              ) : (
                                lessons.map((lesson, li) => (
                                  <button
                                    key={lesson.id}
                                    onClick={() => router.push(`/dashboard/lessons/${lesson.id}`)}
                                    className="w-full flex items-start gap-3 py-3 px-3 rounded-xl hover:bg-white/[0.03] transition-colors text-left"
                                  >
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0" style={{ background: 'rgba(123,63,228,0.2)', color: '#A87BFF' }}>
                                      {li + 1}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white leading-tight">{lesson.title}</p>
                                      {lesson.summary && (
                                        <p className="text-xs mt-1 line-clamp-2" style={{ color: '#7B8CA6' }}>
                                          {lesson.summary}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-3 mt-1">
                                        {lesson.is_completed ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: '#10B981' }}>
                                            <CheckCircle2 size={11} /> Completed
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: '#7B8CA6' }}>
                                            <Circle size={11} /> Not completed
                                          </span>
                                        )}
                                      </div>
                                      {lesson.pdf_path && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <FileText size={11} style={{ color: '#7B3FE4' }} />
                                          <span className="text-[10px]" style={{ color: '#7B3FE4' }}>
                                            PDF attached
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
