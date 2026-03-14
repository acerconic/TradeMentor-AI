'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  Languages,
  Layers,
  Loader2,
  Sparkles,
  Trash2,
  TriangleAlert,
} from 'lucide-react';

type LessonDetails = {
  id: string;
  title: string;
  summary?: string | null;
  summary_ru?: string | null;
  summary_uz?: string | null;
  content_source?: string | null;
  content_ru?: string | null;
  content_uz?: string | null;
  source_language?: string | null;
  key_points_json?: any;
  glossary_json?: any;
  practice_notes?: any;
  common_mistakes_json?: any;
  self_check_questions_json?: any;
  homework_json?: any;
  quiz_json?: any;
  lesson_steps_json?: any;
  visual_blocks_json?: any;
  lesson_test_json?: any;
  lesson_type?: string | null;
  source_section?: string | null;
  difficulty_level?: string | null;
  conclusion_json?: any;
  additional_notes_json?: any;
  pdf_path?: string | null;
  course_id: string;
  course_title: string;
  module_id: string;
  module_title: string;
  next_lesson_id?: string | null;
};

type Material = {
  id: string;
  original_name: string;
  detected_category: string | null;
  status: 'pending' | 'processed' | 'failed';
  error_message: string | null;
  course_id: string | null;
  lesson_id: string | null;
  ai_metadata?: string | null;
  created_at: string;
};

function normalizeText(value: any): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function pickLocalized(raw: any, language: 'RU' | 'UZ'): any {
  if (!raw || typeof raw !== 'object') return null;
  return raw[language] ?? raw[language.toLowerCase()] ??
    raw[language === 'RU' ? 'UZ' : 'RU'] ?? raw[language === 'RU' ? 'uz' : 'ru'] ?? null;
}

function parseMetadata(raw: string | null | undefined): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function AdminLessonPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const [lesson, setLesson] = useState<LessonDetails | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pdfObjectUrlRef = useRef<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [lessonRes, materialsRes] = await Promise.all([
          api.get(`/courses/lessons/${params.id}`),
          api.get('/admin/materials'),
        ]);
        setLesson(lessonRes.data);
        setMaterials(materialsRes.data || []);
      } catch (e: any) {
        showToast(e.response?.data?.error || 'Failed to load lesson');
        setLesson(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  useEffect(() => {
    return () => {
      if (pdfObjectUrlRef.current) {
        URL.revokeObjectURL(pdfObjectUrlRef.current);
        pdfObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const loadPdf = async () => {
      if (!lesson?.id || !lesson.pdf_path) return;
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
  }, [lesson?.id, lesson?.pdf_path]);

  const relatedMaterial = useMemo(() => {
    if (!lesson) return null;

    const exact = materials.find((item) => item.lesson_id === lesson.id);
    if (exact) return exact;

    const byCourse = materials
      .filter((item) => item.course_id && item.course_id === lesson.course_id)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

    return byCourse[0] || null;
  }, [lesson, materials]);

  const metadata = useMemo(() => parseMetadata(relatedMaterial?.ai_metadata), [relatedMaterial]);

  const generatedLessonTitles = useMemo<string[]>(() => {
    if (!metadata || !Array.isArray(metadata.lesson_titles)) return [];
    return metadata.lesson_titles.map((item: any) => normalizeText(item)).filter(Boolean).slice(0, 25);
  }, [metadata]);

  const sectionStats = useMemo(() => {
    if (!lesson) return null;

    const keyRu = Array.isArray(pickLocalized(lesson.key_points_json, 'RU')) ? pickLocalized(lesson.key_points_json, 'RU').length : 0;
    const keyUz = Array.isArray(pickLocalized(lesson.key_points_json, 'UZ')) ? pickLocalized(lesson.key_points_json, 'UZ').length : 0;

    const glossaryRu = Array.isArray(pickLocalized(lesson.glossary_json, 'RU')) ? pickLocalized(lesson.glossary_json, 'RU').length : 0;
    const glossaryUz = Array.isArray(pickLocalized(lesson.glossary_json, 'UZ')) ? pickLocalized(lesson.glossary_json, 'UZ').length : 0;

    const mistakesRu = Array.isArray(pickLocalized(lesson.common_mistakes_json, 'RU')) ? pickLocalized(lesson.common_mistakes_json, 'RU').length : 0;
    const mistakesUz = Array.isArray(pickLocalized(lesson.common_mistakes_json, 'UZ')) ? pickLocalized(lesson.common_mistakes_json, 'UZ').length : 0;

    const selfCheckRu = Array.isArray(pickLocalized(lesson.self_check_questions_json, 'RU')) ? pickLocalized(lesson.self_check_questions_json, 'RU').length : 0;
    const selfCheckUz = Array.isArray(pickLocalized(lesson.self_check_questions_json, 'UZ')) ? pickLocalized(lesson.self_check_questions_json, 'UZ').length : 0;

    const quizRu = Array.isArray(pickLocalized(lesson.quiz_json, 'RU')) ? pickLocalized(lesson.quiz_json, 'RU').length : 0;
    const quizUz = Array.isArray(pickLocalized(lesson.quiz_json, 'UZ')) ? pickLocalized(lesson.quiz_json, 'UZ').length : 0;

    const stepsRu = Array.isArray(pickLocalized(lesson.lesson_steps_json, 'RU')) ? pickLocalized(lesson.lesson_steps_json, 'RU').length : 0;
    const stepsUz = Array.isArray(pickLocalized(lesson.lesson_steps_json, 'UZ')) ? pickLocalized(lesson.lesson_steps_json, 'UZ').length : 0;
    const visualBlocks = Array.isArray(lesson.visual_blocks_json) ? lesson.visual_blocks_json.length : 0;

    const lessonTestRu = Array.isArray(pickLocalized(lesson.lesson_test_json, 'RU')) ? pickLocalized(lesson.lesson_test_json, 'RU').length : 0;
    const lessonTestUz = Array.isArray(pickLocalized(lesson.lesson_test_json, 'UZ')) ? pickLocalized(lesson.lesson_test_json, 'UZ').length : 0;

    return {
      keyRu,
      keyUz,
      glossaryRu,
      glossaryUz,
      mistakesRu,
      mistakesUz,
      selfCheckRu,
      selfCheckUz,
      quizRu,
      quizUz,
      stepsRu,
      stepsUz,
      visualBlocks,
      lessonTestRu,
      lessonTestUz,
    };
  }, [lesson]);

  const ruSummary = normalizeText(lesson?.summary_ru || lesson?.summary || lesson?.content_source || '');
  const uzSummary = normalizeText(lesson?.summary_uz || lesson?.summary || lesson?.content_source || '');
  const ruContent = normalizeText(lesson?.content_ru || lesson?.content_source || '');
  const uzContent = normalizeText(lesson?.content_uz || lesson?.content_source || '');

  const ruStepsPreview = useMemo(() => {
    const raw = pickLocalized(lesson?.lesson_steps_json, 'RU');
    if (!Array.isArray(raw)) return [] as any[];
    return raw.slice(0, 8);
  }, [lesson?.lesson_steps_json]);

  const uzStepsPreview = useMemo(() => {
    const raw = pickLocalized(lesson?.lesson_steps_json, 'UZ');
    if (!Array.isArray(raw)) return [] as any[];
    return raw.slice(0, 8);
  }, [lesson?.lesson_steps_json]);

  const visualBlocksPreview = useMemo(() => {
    const raw = Array.isArray(lesson?.visual_blocks_json) ? lesson?.visual_blocks_json : [];
    return raw.slice(0, 8);
  }, [lesson?.visual_blocks_json]);

  const handleDeleteLesson = async () => {
    if (!lesson) return;
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;

    try {
      await api.delete(`/admin/courses/lessons/${lesson.id}`);
      showToast('Lesson deleted');
      setTimeout(() => router.push('/admin/courses'), 500);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to delete lesson');
    }
  };

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
          onClick={() => router.push('/admin/courses')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.2)', color: '#A87BFF' }}
        >
          <ArrowLeft size={16} /> Back to Courses
        </button>

        <div className="flex items-center gap-2">
          {lesson?.id && (
            <button
              onClick={handleDeleteLesson}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}
            >
              <Trash2 size={14} /> Delete lesson
            </button>
          )}
          {lesson?.course_id && (
            <button
              onClick={() => router.push(`/dashboard/lessons/${lesson.id}`)}
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
          <section className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(123,63,228,0.2), rgba(42,169,255,0.12))', border: '1px solid rgba(123,63,228,0.3)' }}>
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#9AB1D2' }}>
              {lesson.course_title} · {lesson.module_title}
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-white mt-2">{lesson.title}</h1>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ background: 'rgba(42,169,255,0.12)', border: '1px solid rgba(42,169,255,0.3)', color: '#67D5FF' }}>
                Type: {lesson.lesson_type || 'theory'}
              </span>
              <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#6EE7B7' }}>
                Difficulty: {lesson.difficulty_level || 'Beginner'}
              </span>
              <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ background: 'rgba(123,63,228,0.12)', border: '1px solid rgba(123,63,228,0.3)', color: '#D8CCFF' }}>
                <Languages size={12} className="inline mr-1" /> Source: {lesson.source_language || 'UNKNOWN'}
              </span>
              {lesson.source_section && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(123,140,166,0.28)', color: '#B8C8DE' }}>
                  {lesson.source_section}
                </span>
              )}
            </div>

            <p className="text-sm mt-4" style={{ color: '#DCE7F7' }}>
              {lesson.summary || lesson.summary_ru || lesson.summary_uz || 'No lesson summary'}
            </p>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-card p-5" style={{ border: '1px solid rgba(123,63,228,0.18)' }}>
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#A87BFF' }}>
                AI Processing Status
              </p>
              {relatedMaterial ? (
                <div className="mt-3 space-y-2 text-sm" style={{ color: '#C8D4E8' }}>
                  <p>Status: <strong className="text-white">{relatedMaterial.status}</strong></p>
                  <p>Category: <strong className="text-white">{relatedMaterial.detected_category || 'n/a'}</strong></p>
                  <p>Lessons created: <strong className="text-white">{Number(metadata?.lessons_created || 1)}</strong></p>
                  <p>Imported: <strong className="text-white">{new Date(relatedMaterial.created_at).toLocaleString()}</strong></p>
                  {relatedMaterial.error_message && (
                    <p className="text-xs" style={{ color: '#FCA5A5' }}>
                      <TriangleAlert size={12} className="inline mr-1" /> {relatedMaterial.error_message}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm mt-3" style={{ color: '#7B8CA6' }}>
                  No linked import record found for this lesson.
                </p>
              )}
            </div>

            <div className="glass-card p-5" style={{ border: '1px solid rgba(42,169,255,0.2)' }}>
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#67D5FF' }}>
                Source PDF
              </p>
              {relatedMaterial ? (
                <div className="mt-3 space-y-2 text-sm" style={{ color: '#C8D4E8' }}>
                  <p className="font-semibold text-white break-all">{relatedMaterial.original_name}</p>
                  <p>Source language: <strong className="text-white">{String(metadata?.source_language || lesson.source_language || 'UNKNOWN')}</strong></p>
                  <p>Module generated: <strong className="text-white">{String(metadata?.module_title || lesson.module_title || 'n/a')}</strong></p>
                </div>
              ) : (
                <p className="text-sm mt-3" style={{ color: '#7B8CA6' }}>Import metadata not available.</p>
              )}
            </div>

            <div className="glass-card p-5" style={{ border: '1px solid rgba(16,185,129,0.22)' }}>
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#6EE7B7' }}>
                Generated Structure Health
              </p>
              {sectionStats ? (
                <div className="mt-3 space-y-1.5 text-xs" style={{ color: '#C8D4E8' }}>
                  <p>Key points RU/UZ: <strong className="text-white">{sectionStats.keyRu}/{sectionStats.keyUz}</strong></p>
                  <p>Glossary RU/UZ: <strong className="text-white">{sectionStats.glossaryRu}/{sectionStats.glossaryUz}</strong></p>
                  <p>Mistakes RU/UZ: <strong className="text-white">{sectionStats.mistakesRu}/{sectionStats.mistakesUz}</strong></p>
                  <p>Self-check RU/UZ: <strong className="text-white">{sectionStats.selfCheckRu}/{sectionStats.selfCheckUz}</strong></p>
                  <p>Quiz RU/UZ: <strong className="text-white">{sectionStats.quizRu}/{sectionStats.quizUz}</strong></p>
                  <p>Step blocks RU/UZ: <strong className="text-white">{sectionStats.stepsRu}/{sectionStats.stepsUz}</strong></p>
                  <p>Visual blocks: <strong className="text-white">{sectionStats.visualBlocks}</strong></p>
                  <p>Lesson test RU/UZ: <strong className="text-white">{sectionStats.lessonTestRu}/{sectionStats.lessonTestUz}</strong></p>
                </div>
              ) : (
                <p className="text-sm mt-3" style={{ color: '#7B8CA6' }}>No structure stats.</p>
              )}
            </div>
          </section>

          <section className="glass-card p-5" style={{ border: '1px solid rgba(123,63,228,0.16)' }}>
            <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#C6ADFF' }}>
              <Layers size={13} className="inline mr-1" />
              Generated lesson structure from import
            </p>

            {generatedLessonTitles.length === 0 ? (
              <p className="text-sm mt-3" style={{ color: '#7B8CA6' }}>
                No lesson_titles array in metadata. This can happen for legacy imports.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {generatedLessonTitles.map((item: string, index: number) => (
                  <div key={`${index}-${item}`} className="rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(11,18,32,0.6)', border: '1px solid rgba(123,63,228,0.14)', color: '#D8CCFF' }}>
                    <span className="font-black mr-2">{index + 1}.</span>{item}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5" style={{ border: '1px solid rgba(123,63,228,0.2)' }}>
              <p className="text-xs uppercase font-black tracking-wider" style={{ color: '#A87BFF' }}>
                RU generated version
              </p>
              <p className="text-xs mt-2" style={{ color: '#9AB1D2' }}>
                Summary
              </p>
              <p className="text-sm mt-1 leading-6" style={{ color: '#D5E2F4' }}>
                {ruSummary || 'No RU summary'}
              </p>
              <p className="text-xs mt-4" style={{ color: '#9AB1D2' }}>
                Main explanation
              </p>
              <p className="text-sm mt-1 whitespace-pre-wrap leading-6" style={{ color: '#C8D4E8' }}>
                {(ruContent || 'No generated RU content').slice(0, 2200)}
              </p>
            </div>

            <div className="glass-card p-5" style={{ border: '1px solid rgba(42,169,255,0.2)' }}>
              <p className="text-xs uppercase font-black tracking-wider" style={{ color: '#67D5FF' }}>
                UZ generated version
              </p>
              <p className="text-xs mt-2" style={{ color: '#9AB1D2' }}>
                Summary
              </p>
              <p className="text-sm mt-1 leading-6" style={{ color: '#D5E2F4' }}>
                {uzSummary || 'No UZ summary'}
              </p>
              <p className="text-xs mt-4" style={{ color: '#9AB1D2' }}>
                Main explanation
              </p>
              <p className="text-sm mt-1 whitespace-pre-wrap leading-6" style={{ color: '#C8D4E8' }}>
                {(uzContent || 'No generated UZ content').slice(0, 2200)}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5" style={{ border: '1px solid rgba(123,63,228,0.18)' }}>
              <p className="text-xs uppercase font-black tracking-wider" style={{ color: '#C6ADFF' }}>
                RU step-based flow preview
              </p>
              {ruStepsPreview.length === 0 ? (
                <p className="text-sm mt-3" style={{ color: '#7B8CA6' }}>No RU step blocks</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {ruStepsPreview.map((step: any, idx: number) => (
                    <div key={`ru-step-${idx}`} className="rounded-lg p-3" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(123,63,228,0.12)' }}>
                      <p className="text-[11px] font-black uppercase" style={{ color: '#A87BFF' }}>
                        {step.step_type || 'step'} · p.{step.page_from || 1}-{step.page_to || step.page_from || 1}
                      </p>
                      <p className="text-sm font-semibold text-white mt-1">{String(step.title || '')}</p>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: '#C8D4E8' }}>
                        {String(step.explanation || '')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-5" style={{ border: '1px solid rgba(42,169,255,0.2)' }}>
              <p className="text-xs uppercase font-black tracking-wider" style={{ color: '#67D5FF' }}>
                UZ step-based flow preview
              </p>
              {uzStepsPreview.length === 0 ? (
                <p className="text-sm mt-3" style={{ color: '#7B8CA6' }}>No UZ step blocks</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {uzStepsPreview.map((step: any, idx: number) => (
                    <div key={`uz-step-${idx}`} className="rounded-lg p-3" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(42,169,255,0.12)' }}>
                      <p className="text-[11px] font-black uppercase" style={{ color: '#67D5FF' }}>
                        {step.step_type || 'step'} · p.{step.page_from || 1}-{step.page_to || step.page_from || 1}
                      </p>
                      <p className="text-sm font-semibold text-white mt-1">{String(step.title || '')}</p>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: '#C8D4E8' }}>
                        {String(step.explanation || '')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="glass-card p-5" style={{ border: '1px solid rgba(16,185,129,0.24)' }}>
            <p className="text-xs uppercase font-black tracking-wider" style={{ color: '#6EE7B7' }}>
              Visual blocks from PDF/page fragments
            </p>
            {visualBlocksPreview.length === 0 ? (
              <p className="text-sm mt-3" style={{ color: '#7B8CA6' }}>No visual blocks generated</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {visualBlocksPreview.map((item: any, idx: number) => (
                  <div key={`vb-${idx}`} className="rounded-lg p-3" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-[11px] font-black uppercase" style={{ color: '#6EE7B7' }}>
                      {String(item.visual_kind || 'page_fragment')} · p.{item.page_from || 1}-{item.page_to || item.page_from || 1}
                    </p>
                    <p className="text-sm font-semibold text-white mt-1">{String(item.caption_ru || item.caption_uz || 'Visual block')}</p>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: '#C8D4E8' }}>
                      {String(item.importance_ru || item.importance_uz || '')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="glass-card overflow-hidden" style={{ border: '1px solid rgba(123,63,228,0.15)' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(123,63,228,0.12)', background: 'rgba(11,18,32,0.4)' }}>
              <div className="flex items-center gap-2">
                <FileText size={16} style={{ color: '#2AA9FF' }} />
                <span className="text-sm font-bold text-white">Source PDF Viewer</span>
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
                  {!lesson.pdf_path && (
                    <p className="text-xs mt-2" style={{ color: '#7B8CA6' }}>
                      This lesson has no attached source PDF path.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {relatedMaterial?.status === 'processed' && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)' }}>
              <p className="text-sm font-semibold" style={{ color: '#6EE7B7' }}>
                <CheckCircle2 size={14} className="inline mr-1" />
                AI generation is linked and visible in admin: source + multilingual + structure + status.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
