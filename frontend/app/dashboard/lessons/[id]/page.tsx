'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Brain,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  LogOut as LogOutIcon,
  MessageSquare,
  Settings,
  User,
} from 'lucide-react';

type LessonDetails = {
  id: string;
  title: string;
  summary?: string | null;
  pdf_path?: string | null;
  course_id: string;
  course_title: string;
  module_id: string;
  module_title: string;
  next_lesson_id?: string | null;
  is_completed?: boolean;
  completed_at?: string | null;
};

export default function LessonPage({ params }: { params: { id: string } }) {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [lesson, setLesson] = useState<LessonDetails | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const pdfObjectUrlRef = useRef<string | null>(null);

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
    const fetchLesson = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/courses/lessons/${params.id}`);
        setLesson(res.data);
      } catch (e: any) {
        showToast(e.response?.data?.error || 'Failed to load lesson');
        setLesson(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLesson();
  }, [params.id]);

  useEffect(() => {
    const cleanup = () => {
      if (pdfObjectUrlRef.current) {
        URL.revokeObjectURL(pdfObjectUrlRef.current);
        pdfObjectUrlRef.current = null;
      }
    };
    return cleanup;
  }, []);

  useEffect(() => {
    const loadPdf = async () => {
      if (!lesson?.id) return;
      setIsLoadingPdf(true);
      try {
        const res = await api.get(`/courses/lessons/${lesson.id}/pdf`, { responseType: 'blob' });
        const blob = new Blob([res.data], { type: 'application/pdf' });

        if (pdfObjectUrlRef.current) URL.revokeObjectURL(pdfObjectUrlRef.current);
        const url = URL.createObjectURL(blob);
        pdfObjectUrlRef.current = url;
        setPdfUrl(url);
      } catch (e: any) {
        setPdfUrl(null);
        // If there's no PDF attached, don't treat as fatal.
        if (e.response?.status !== 404) {
          showToast(e.response?.data?.error || 'Failed to load PDF');
        }
      } finally {
        setIsLoadingPdf(false);
      }
    };
    loadPdf();
  }, [lesson?.id]);

  const firstName = useMemo(() => {
    if (!user) return '';
    return user.name?.split(' ')[0] || user.name;
  }, [user]);

  const askAiPrompt = useMemo(() => {
    if (!lesson) return '';
    return `Explain this lesson and give me 3 actionable takeaways:\n\nLesson: ${lesson.title}\nSummary: ${lesson.summary || ''}`;
  }, [lesson]);

  const markLessonCompleted = async () => {
    if (!lesson?.id || lesson.is_completed || isCompleting) return;
    setIsCompleting(true);
    try {
      await api.post(`/courses/lessons/${lesson.id}/complete`);
      setLesson((prev) => prev ? { ...prev, is_completed: true, completed_at: new Date().toISOString() } : prev);
      showToast('Lesson marked as completed');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to mark lesson as completed');
    } finally {
      setIsCompleting(false);
    }
  };

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

      <main className="flex-1 px-6 md:px-10 py-10 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <button
            onClick={() => lesson ? router.push(`/dashboard/courses/${lesson.course_id}`) : router.push('/dashboard/academy')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.2)', color: '#A87BFF' }}
          >
            <ArrowLeft size={16} /> {t('common.back')}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={markLessonCompleted}
              disabled={!lesson || !!lesson.is_completed || isCompleting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: '#111A2F', border: '1px solid rgba(16,185,129,0.4)', color: '#6EE7B7' }}
            >
              {isCompleting ? <Loader2 size={16} className="animate-spin" /> : null}
              {lesson?.is_completed ? 'Completed' : 'Mark complete'}
            </button>
            <button
              onClick={() => {
                // open AI and prefill via localStorage (no dead buttons)
                localStorage.setItem('ai_prefill', askAiPrompt);
                if (lesson) {
                  localStorage.setItem('ai_lesson_context', JSON.stringify({
                    courseId: lesson.course_id,
                    courseTitle: lesson.course_title,
                    moduleTitle: lesson.module_title,
                    lessonId: lesson.id,
                    lessonTitle: lesson.title,
                    lessonSummary: lesson.summary || '',
                  }));
                }
                router.push('/ai');
              }}
              disabled={!lesson}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)', boxShadow: '0 4px 20px rgba(123,63,228,0.35)' }}
            >
              <Brain size={16} /> {t('common.askAI')}
            </button>
            {lesson?.next_lesson_id && (
              <button
                onClick={() => router.push(`/dashboard/lessons/${lesson.next_lesson_id}`)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.25)', color: '#A87BFF' }}
              >
                Next lesson <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 gap-3" style={{ color: '#7B8CA6' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: '#7B3FE4' }} />
            Loading lesson...
          </div>
        ) : !lesson ? (
          <div className="glass-card p-10 text-center" style={{ border: '2px dashed rgba(123,63,228,0.2)' }}>
            <FileText size={30} style={{ color: '#7B3FE4' }} className="mx-auto mb-3" />
            <p className="text-white font-bold">Lesson not found</p>
            <p className="text-sm mt-1" style={{ color: '#7B8CA6' }}>
              Please go back to Academy.
            </p>
          </div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#7B8CA6' }}>
                {lesson.course_title} · {lesson.module_title}
              </p>
              <h1 className="text-3xl md:text-4xl font-black leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>
                {lesson.title}
              </h1>
              {lesson.summary && (
                <p className="mt-3 text-sm" style={{ color: '#7B8CA6' }}>
                  {lesson.summary}
                </p>
              )}
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: lesson.is_completed ? 'rgba(16,185,129,0.12)' : 'rgba(123,63,228,0.12)', border: `1px solid ${lesson.is_completed ? 'rgba(16,185,129,0.35)' : 'rgba(123,63,228,0.25)'}` }}>
                <span className="text-xs font-bold" style={{ color: lesson.is_completed ? '#6EE7B7' : '#A87BFF' }}>
                  {lesson.is_completed ? 'Lesson completed' : 'In progress'}
                </span>
              </div>
            </motion.div>

            <div className="glass-card overflow-hidden" style={{ border: '1px solid rgba(123,63,228,0.15)' }}>
              <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(123,63,228,0.12)', background: 'rgba(11,18,32,0.4)' }}>
                <div className="flex items-center gap-2">
                  <FileText size={16} style={{ color: '#2AA9FF' }} />
                  <span className="text-sm font-bold text-white">PDF Viewer</span>
                </div>
                {isLoadingPdf && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#7B8CA6' }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: '#7B3FE4' }} />
                    Loading PDF...
                  </div>
                )}
              </div>

              <div className="p-0" style={{ background: '#0A1020' }}>
                {pdfUrl ? (
                  <iframe
                    title="Lesson PDF"
                    src={pdfUrl}
                    className="w-full"
                    style={{ height: '80vh', border: 'none' }}
                  />
                ) : (
                  <div className="p-10 text-center">
                    <FileText size={32} style={{ color: '#7B8CA6' }} className="mx-auto mb-2" />
                    <p className="text-white font-bold">PDF not available</p>
                    <p className="text-sm mt-1" style={{ color: '#7B8CA6' }}>
                      This lesson does not have a PDF attached yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
