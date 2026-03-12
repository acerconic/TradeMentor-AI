'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2, ChevronRight, ExternalLink } from 'lucide-react';

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
};

export default function AdminLessonPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonDetails | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const pdfObjectUrlRef = useRef<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
        if (e.response?.status !== 404) showToast(e.response?.data?.error || 'Failed to load PDF');
      } finally {
        setIsLoadingPdf(false);
      }
    };
    loadPdf();
  }, [lesson?.id]);

  const title = useMemo(() => lesson?.title || 'Lesson', [lesson]);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-white text-sm font-semibold"
            style={{ transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)', boxShadow: '0 8px 32px rgba(123,63,228,0.4)' }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => lesson ? router.push(`/admin/courses`) : router.push('/admin/courses')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.2)', color: '#A87BFF' }}
        >
          <ArrowLeft size={16} /> Back to Courses
        </button>

        <div className="flex items-center gap-2">
          {lesson?.course_id && (
            <button
              onClick={() => router.push(`/dashboard/courses/${lesson.course_id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: '#0B1220', border: '1px solid rgba(42,169,255,0.25)', color: '#2AA9FF' }}
            >
              Open as student <ExternalLink size={14} />
            </button>
          )}
          {lesson?.next_lesson_id && (
            <button
              onClick={() => router.push(`/admin/lessons/${lesson.next_lesson_id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.25)', color: '#A87BFF' }}
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3" style={{ color: '#7B8CA6' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#7B3FE4' }} />
          Loading lesson...
        </div>
      ) : !lesson ? (
        <div className="glass-card p-10 text-center" style={{ border: '2px dashed rgba(123,63,228,0.2)' }}>
          <FileText size={30} style={{ color: '#7B3FE4' }} className="mx-auto mb-3" />
          <p className="text-white font-bold">Lesson not found</p>
        </div>
      ) : (
        <>
          <div className="glass-card p-6">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#7B8CA6' }}>
              {lesson.course_title} · {lesson.module_title}
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-white mt-2">{title}</h1>
            {lesson.summary && <p className="text-sm mt-3" style={{ color: '#7B8CA6' }}>{lesson.summary}</p>}
          </div>

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
            <div style={{ background: '#0A1020' }}>
              {pdfUrl ? (
                <iframe title="Lesson PDF" src={pdfUrl} className="w-full" style={{ height: '80vh', border: 'none' }} />
              ) : (
                <div className="p-10 text-center">
                  <FileText size={32} style={{ color: '#7B8CA6' }} className="mx-auto mb-2" />
                  <p className="text-white font-bold">PDF not available</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

