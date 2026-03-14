'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
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

type Lesson = {
  id: string;
  title: string;
  summary?: string;
  pdf_path?: string;
  is_completed?: boolean;
};

type Module = {
  id: string;
  title: string;
  lessons?: Lesson[];
};

type Course = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  level?: string;
  language?: 'RU' | 'UZ';
  lessons_count?: number;
  completed_lessons?: number;
  progress_percent?: number;
  preferred_language?: 'RU' | 'UZ';
  is_fallback_language?: boolean;
};

export default function AcademyPage() {
  const { t, language, setLanguage } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [courseModules, setCourseModules] = useState<Record<string, Module[]>>({});
  const [loadingCourseId, setLoadingCourseId] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState<'RU' | 'UZ'>('RU');
  const [isLanguageFallback, setIsLanguageFallback] = useState(false);
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
        const fetched = (res.data || []) as Course[];
        setCourses(fetched);
        if (fetched.length > 0) {
          const preferred = fetched[0]?.preferred_language;
          if (preferred === 'UZ' || preferred === 'RU') setPreferredLanguage(preferred);
          setIsLanguageFallback(Boolean(fetched[0]?.is_fallback_language));
        } else {
          setIsLanguageFallback(false);
        }
      } catch {
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, [language]);

  const toggleCourse = async (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      return;
    }

    setExpandedCourse(courseId);
    if (courseModules[courseId]) return;

    setLoadingCourseId(courseId);
    try {
      const res = await api.get(`/courses/${courseId}/lessons`);
      setCourseModules((prev) => ({ ...prev, [courseId]: (res.data || []) as Module[] }));
    } catch {
      setCourseModules((prev) => ({ ...prev, [courseId]: [] }));
      showToast('Failed to load lesson structure');
    } finally {
      setLoadingCourseId(null);
    }
  };

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
            { label: t('common.faq'), active: false, href: '/dashboard/faq' },
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
          <div className="space-y-4">
            {isLanguageFallback && (
              <div className="glass-card p-4" style={{ border: '1px solid rgba(245,158,11,0.35)', background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(17,26,47,0.85))' }}>
                <p className="text-sm font-bold" style={{ color: '#FCD34D' }}>
                  Courses on {preferredLanguage} are not available yet. Showing courses in other languages.
                </p>
              </div>
            )}
            {courses.map((course, i) => {
              const progress = Number(course.progress_percent || 0);
              const completed = Number(course.completed_lessons || 0);
              const totalLessons = Number(course.lessons_count || 0);
              const modules = courseModules[course.id] || [];
              const isExpanded = expandedCourse === course.id;

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card overflow-hidden"
                >
                  <button
                    onClick={() => toggleCourse(course.id)}
                    className="w-full text-left p-5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-white">{course.title}</h3>
                          {course.category && <span className="badge-purple px-2 py-0.5 rounded-full text-[10px] font-black uppercase">{course.category}</span>}
                          {course.language && (
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-black uppercase',
                              course.language === preferredLanguage ? 'badge-green' : 'badge-amber'
                            )}>
                              {course.language}
                            </span>
                          )}
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-black uppercase',
                            course.level === 'Beginner' ? 'badge-green' : course.level === 'Intermediate' ? 'badge-amber' : 'badge-blue'
                          )}>{course.level || 'Beginner'}</span>
                        </div>
                        <p className="text-sm mt-1 line-clamp-2" style={{ color: '#7B8CA6' }}>
                          {course.description || 'Professional trading course material'}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: '#7B8CA6' }}>
                          <span><Layers size={12} className="inline mr-1" />{modules.length || 0} modules</span>
                          <span><FileText size={12} className="inline mr-1" />{totalLessons} lessons</span>
                          <span>{completed}/{totalLessons} completed</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/courses/${course.id}`); }}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                          style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}
                        >
                          Open Course
                        </button>
                        {loadingCourseId === course.id
                          ? <Loader2 size={18} className="animate-spin" style={{ color: '#7B3FE4' }} />
                          : isExpanded
                            ? <ChevronDown size={18} style={{ color: '#7B3FE4' }} />
                            : <ChevronRight size={18} style={{ color: '#7B8CA6' }} />}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="h-2 rounded-full" style={{ background: 'rgba(123,63,228,0.12)' }}>
                        <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7B3FE4, #2AA9FF)' }} />
                      </div>
                      <p className="text-[11px] mt-1" style={{ color: '#7B8CA6' }}>Progress: {progress}%</p>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid rgba(123,63,228,0.1)' }}>
                          {modules.length === 0 ? (
                            <div className="py-6 text-center">
                              <p className="text-sm font-semibold" style={{ color: '#7B8CA6' }}>No modules yet</p>
                              <p className="text-xs mt-1" style={{ color: '#3D4D63' }}>This course does not have lessons yet.</p>
                            </div>
                          ) : (
                            modules.map((module, moduleIndex) => (
                              <div key={module.id} className="rounded-xl p-4" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(123,63,228,0.1)' }}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#7B8CA6' }}>Module {moduleIndex + 1}</p>
                                    <p className="text-sm font-bold text-white mt-1">{module.title}</p>
                                  </div>
                                  <span className="text-xs badge-blue px-2 py-0.5 rounded-full">{(module.lessons || []).length} lessons</span>
                                </div>

                                <div className="mt-3 space-y-2">
                                  {(module.lessons || []).length === 0 ? (
                                    <p className="text-xs" style={{ color: '#3D4D63' }}>No lessons in this module yet.</p>
                                  ) : (
                                    (module.lessons || []).map((lesson, lessonIndex) => (
                                      <button
                                        key={lesson.id}
                                        onClick={() => router.push(`/dashboard/lessons/${lesson.id}`)}
                                        className="w-full flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
                                      >
                                        <div className="flex items-start gap-3 min-w-0">
                                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: 'rgba(123,63,228,0.2)', color: '#A87BFF' }}>
                                            {lessonIndex + 1}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-sm font-semibold text-white line-clamp-1">{lesson.title}</p>
                                            {lesson.summary && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#7B8CA6' }}>{lesson.summary}</p>}
                                          </div>
                                        </div>
                                        <div className="shrink-0 mt-0.5">
                                          {lesson.is_completed ? (
                                            <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                                          ) : (
                                            <Circle size={16} style={{ color: '#3D4D63' }} />
                                          )}
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
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
