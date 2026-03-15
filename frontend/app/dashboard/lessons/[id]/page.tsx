'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PT_Sans, PT_Serif } from 'next/font/google';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Languages,
  Loader2,
  MessageCircleQuestion,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

const headingFont = PT_Serif({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700'],
  variable: '--font-lesson-heading',
});

const bodyFont = PT_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700'],
  variable: '--font-lesson-body',
});

type UiLanguage = 'RU' | 'UZ';

type QuizItem = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

type LessonPageBlock = {
  page_number: number;
  page_image?: string;
  page_text: string;
  ai_explanation: string;
  alternative_explanation?: string;
  notes?: string;
  practical_interpretation?: string;
  key_terms?: string[];
  common_mistakes?: string[];
};

type LessonDetails = {
  id: string;
  title: string;
  summary?: string | null;
  summary_ru?: string | null;
  summary_uz?: string | null;
  content?: string | null;
  content_source?: string | null;
  content_ru?: string | null;
  content_uz?: string | null;
  source_language?: string | null;
  glossary_json?: unknown;
  practice_notes?: unknown;
  common_mistakes_json?: unknown;
  self_check_questions_json?: unknown;
  homework_json?: unknown;
  quiz_json?: unknown;
  lesson_pages_json?: unknown;
  lesson_steps_json?: unknown;
  lesson_test_json?: unknown;
  lesson_type?: string | null;
  source_section?: string | null;
  difficulty_level?: string | null;
  pdf_path?: string | null;
  course_id: string;
  course_title: string;
  course_level?: string | null;
  module_id: string;
  module_title: string;
  next_lesson_id?: string | null;
  is_completed?: boolean;
};

const COPY = {
  RU: {
    loadingTitle: 'Собираем lesson reading mode',
    loadingHint: 'TradeMentor AI поднимает страницы книги и объяснения наставника.',
    notFound: 'Урок не найден',
    notFoundHint: 'Вернитесь в курс и откройте урок заново.',
    back: 'Назад к курсу',
    page: 'Страница',
    of: 'из',
    readingMode: 'AI tutor reading mode',
    aiVoice: 'AI-наставник',
    pageLoading: 'Загружаем изображение страницы...',
    pageMissing: 'Не удалось показать страницу книги.',
    sourceText: 'Что видно на странице',
    explanationTitle: 'Разбор страницы',
    alternativeTitle: 'Объяснение проще',
    keyIdeas: 'Коротко, что важно заметить',
    practice: 'Как переносить на график',
    terms: 'Термины страницы',
    mistakes: 'Где чаще ошибаются',
    understood: '✅ Всё понятно, идём дальше',
    explainAgain: '📖 Не понял, объясни иначе',
    askQuestion: '❓ У меня вопрос',
    pagePrev: 'Предыдущая страница',
    pageNext: 'Следующая страница',
    pagesDone: 'Страницы закончились. Переходим к мини-тесту.',
    movedNext: 'Открыта следующая страница.',
    movedPrev: 'Открыта предыдущая страница.',
    alternativeReady: 'Показано альтернативное объяснение.',
    alternativeLoading: 'Готовим более простое объяснение...',
    alternativeError: 'Не удалось получить альтернативное объяснение.',
    askPrefill: 'Разберите этот урок как AI-наставник по трейдингу и дайте практичный план применения.',
    askPagePrefill: 'У меня вопрос по конкретной странице урока. Разберите её глубоко, понятно и практично.',
    quizTitle: 'Мини-тест в конце урока',
    quizHint: 'Проверьте, как вы поняли страницы и логику автора.',
    quizBack: 'Вернуться к последней странице',
    quizCheck: 'Проверить результат',
    quizReset: 'Сбросить ответы',
    quizScore: 'Результат',
    quizNeedAll: 'Ответьте на все вопросы, чтобы получить результат.',
    completeLesson: 'Отметить урок завершенным',
    completed: 'Урок завершен',
    completeSuccess: 'Урок отмечен завершенным.',
    completeError: 'Не удалось отметить урок.',
    nextLesson: 'К следующему уроку',
    noNextLesson: 'Это последний урок в текущей последовательности.',
    course: 'Курс',
    module: 'Модуль',
    section: 'Раздел',
    language: 'Язык',
  },
  UZ: {
    loadingTitle: 'Lesson reading mode tayyorlanmoqda',
    loadingHint: 'TradeMentor AI kitob sahifalari va mentor tushuntirishlarini yuklamoqda.',
    notFound: 'Dars topilmadi',
    notFoundHint: 'Kursga qayting va darsni qayta oching.',
    back: 'Kursga qaytish',
    page: 'Sahifa',
    of: 'dan',
    readingMode: 'AI tutor reading mode',
    aiVoice: 'AI mentor',
    pageLoading: 'Sahifa rasmi yuklanmoqda...',
    pageMissing: 'Kitob sahifasini ko‘rsatib bo‘lmadi.',
    sourceText: 'Sahifada nima bor',
    explanationTitle: 'Sahifa tahlili',
    alternativeTitle: 'Soddaroq tushuntirish',
    keyIdeas: 'Qisqa asosiy nuqtalar',
    practice: 'Chartda qanday qo‘llash',
    terms: 'Sahifa terminlari',
    mistakes: 'Ko‘p xato qilinadigan joy',
    understood: '✅ Hammasi tushunarli, keyingisiga o‘tamiz',
    explainAgain: '📖 Tushunmadim, boshqacha tushuntir',
    askQuestion: '❓ Savolim bor',
    pagePrev: 'Oldingi sahifa',
    pageNext: 'Keyingi sahifa',
    pagesDone: 'Sahifalar tugadi. Mini-testga o‘tamiz.',
    movedNext: 'Keyingi sahifa ochildi.',
    movedPrev: 'Oldingi sahifa ochildi.',
    alternativeReady: 'Soddaroq tushuntirish ko‘rsatildi.',
    alternativeLoading: 'Soddaroq tushuntirish tayyorlanmoqda...',
    alternativeError: 'Soddaroq tushuntirishni olib bo‘lmadi.',
    askPrefill: 'Ushbu darsni AI mentor sifatida tahlil qiling va amaliy qo‘llash rejasini bering.',
    askPagePrefill: 'Darsdagi aniq sahifa bo‘yicha savolim bor. Uni chuqur, sodda va amaliy tushuntiring.',
    quizTitle: 'Dars oxiridagi mini-test',
    quizHint: 'Sahifalar va muallif logikasini qanchalik tushunganingizni tekshiring.',
    quizBack: 'Oxirgi sahifaga qaytish',
    quizCheck: 'Natijani tekshirish',
    quizReset: 'Javoblarni tozalash',
    quizScore: 'Natija',
    quizNeedAll: 'Natijani ko‘rish uchun barcha savollarga javob bering.',
    completeLesson: 'Darsni yakunlangan deb belgilash',
    completed: 'Dars yakunlangan',
    completeSuccess: 'Dars yakunlangan deb belgilandi.',
    completeError: 'Darsni yakunlashda xatolik.',
    nextLesson: 'Keyingi darsga o‘tish',
    noNextLesson: 'Bu ketma-ketlikdagi oxirgi dars.',
    course: 'Kurs',
    module: 'Modul',
    section: 'Bo‘lim',
    language: 'Til',
  },
} as const;

function normalizeText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function pickLocalized(raw: unknown, language: UiLanguage): unknown {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'object') return raw;

  const source = raw as Record<string, unknown>;
  return source[language]
    ?? source[language.toLowerCase()]
    ?? source[language === 'RU' ? 'UZ' : 'RU']
    ?? source[language === 'RU' ? 'uz' : 'ru']
    ?? null;
}

function splitIntoParagraphs(text: string): string[] {
  const normalized = String(text || '').replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  const blocks = normalized
    .split(/\n\s*\n|(?=(?:🧠|💡|⚠️|🔥|📌))/g)
    .map((part) => normalizeText(part))
    .filter(Boolean);

  if (blocks.length >= 3) return blocks;

  const sentences = normalized
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length <= 2) return [normalizeText(normalized)];

  const paragraphs: string[] = [];
  let bucket = '';
  for (const sentence of sentences) {
    const candidate = bucket ? `${bucket} ${sentence}` : sentence;
    if (candidate.length > 380 && bucket) {
      paragraphs.push(bucket);
      bucket = sentence;
    } else {
      bucket = candidate;
    }
  }
  if (bucket) paragraphs.push(bucket);

  return paragraphs.slice(0, 8);
}

function parseBullets(text: string, max = 6): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const pipeParts = normalized
    .split('|')
    .map((item) => normalizeText(item))
    .filter(Boolean);

  if (pipeParts.length > 1) return pipeParts.slice(0, max);

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, max);
}

function parsePracticalSteps(text: string, max = 5): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const numbered = normalized.match(/\d+\.\s*[^\d]+?(?=(?:\s+\d+\.\s)|$)/g);
  if (Array.isArray(numbered) && numbered.length > 0) {
    return numbered
      .map((item) => normalizeText(item.replace(/^\d+\.\s*/, '')))
      .filter(Boolean)
      .slice(0, max);
  }

  return parseBullets(normalized, max);
}

function normalizeQuiz(raw: unknown): QuizItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const source = item as Record<string, unknown>;
      const question = normalizeText(source?.question);
      const options = Array.isArray(source?.options)
        ? source.options.map((option) => normalizeText(option)).filter(Boolean).slice(0, 6)
        : [];

      if (!question || options.length < 2) return null;

      const correctRaw = Number(source?.correct_index);
      const correct_index = Number.isInteger(correctRaw)
        ? Math.max(0, Math.min(options.length - 1, correctRaw))
        : 0;

      return {
        question,
        options,
        correct_index,
        explanation: normalizeText(source?.explanation),
      } as QuizItem;
    })
    .filter(Boolean)
    .slice(0, 8) as QuizItem[];
}

function normalizeLessonPages(raw: unknown): LessonPageBlock[] {
  if (!Array.isArray(raw)) return [];

  const pages = raw
    .map((item, index) => {
      const source = item as Record<string, unknown>;
      const pageRaw = Number(source?.page_number ?? source?.page ?? source?.page_from);
      const page_number = Number.isInteger(pageRaw) ? Math.max(1, pageRaw) : index + 1;

      return {
        page_number,
        page_image: normalizeText(source?.page_image || `page:${page_number}`),
        page_text: normalizeText(source?.page_text || source?.source_excerpt),
        ai_explanation: normalizeText(source?.ai_explanation || source?.explanation),
        alternative_explanation: normalizeText(source?.alternative_explanation || source?.alt_explanation || source?.simple_explanation),
        notes: normalizeText(source?.notes),
        practical_interpretation: normalizeText(source?.practical_interpretation || source?.practical_application),
        key_terms: Array.isArray(source?.key_terms)
          ? source.key_terms.map((term) => normalizeText(term)).filter(Boolean).slice(0, 8)
          : [],
        common_mistakes: Array.isArray(source?.common_mistakes)
          ? source.common_mistakes.map((term) => normalizeText(term)).filter(Boolean).slice(0, 8)
          : [],
      } as LessonPageBlock;
    })
    .filter((page) => page.page_number >= 1 && page.ai_explanation)
    .sort((a, b) => a.page_number - b.page_number);

  const unique: LessonPageBlock[] = [];
  const seen = new Set<number>();
  for (const page of pages) {
    if (seen.has(page.page_number)) continue;
    seen.add(page.page_number);
    unique.push(page);
  }

  return unique;
}

function fallbackPagesFromSteps(raw: unknown): LessonPageBlock[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      const source = item as Record<string, unknown>;
      const pageRaw = Number(source?.page_number ?? source?.page_from);
      const page_number = Number.isInteger(pageRaw) ? Math.max(1, pageRaw) : index + 1;

      return {
        page_number,
        page_image: normalizeText(source?.page_image || `page:${page_number}`),
        page_text: normalizeText(source?.page_text || source?.source_excerpt),
        ai_explanation: normalizeText(source?.ai_explanation || source?.explanation),
        alternative_explanation: normalizeText(source?.alternative_explanation || source?.alt_explanation || source?.simple_explanation),
        notes: normalizeText(source?.notes || source?.what_to_notice),
        practical_interpretation: normalizeText(source?.practical_interpretation),
        key_terms: [],
        common_mistakes: [],
      } as LessonPageBlock;
    })
    .filter((page) => page.ai_explanation)
    .sort((a, b) => a.page_number - b.page_number);
}

function fallbackQuiz(language: UiLanguage): QuizItem[] {
  if (language === 'UZ') {
    return [
      {
        question: 'Setupni baholashda birinchi navbatda nimaga qaraladi?',
        options: ['Faqat bitta signalga', 'Bozor konteksti va strukturasiga', 'Faqat indikatorga'],
        correct_index: 1,
        explanation: 'To‘g‘ri javob: avval kontekst va struktura, keyin trigger.',
      },
      {
        question: 'Likvidlik olingandan keyin eng sog‘lom harakat qaysi?',
        options: ['Darhol kirish', 'Tasdiqni kutish', 'Rejasiz kirish'],
        correct_index: 1,
        explanation: 'Tasdiqni kutish false entry xavfini kamaytiradi.',
      },
      {
        question: 'Risk management bo‘yicha to‘g‘ri qoida qaysi?',
        options: ['Stopni olib tashlash', 'Riskni oldindan belgilash', 'Hissiyot bilan lotni oshirish'],
        correct_index: 1,
        explanation: 'Risk oldindan aniqlanmasa tizim izchil ishlamaydi.',
      },
    ];
  }

  return [
    {
      question: 'Что проверяется первым перед входом?',
      options: ['Один сигнал', 'Контекст и структура', 'Только индикатор'],
      correct_index: 1,
      explanation: 'Сначала оценивается контекст, потом точка входа.',
    },
    {
      question: 'Как действовать после снятия ликвидности?',
      options: ['Входить сразу', 'Ждать подтверждение', 'Входить без плана'],
      correct_index: 1,
      explanation: 'Подтверждение снижает вероятность ложного сценария.',
    },
    {
      question: 'Какой риск-подход корректный?',
      options: ['Убирать стоп', 'Фиксировать риск заранее', 'Увеличивать объем по эмоциям'],
      correct_index: 1,
      explanation: 'Риск задается до открытия позиции, а не во время стресса.',
    },
  ];
}

function isInlineImageSource(value: string): boolean {
  const normalized = normalizeText(value);
  return normalized.startsWith('data:image/') || normalized.startsWith('blob:');
}

function isRemoteImageSource(value: string): boolean {
  return /^https?:\/\//i.test(normalizeText(value));
}

function isApiImageSource(value: string): boolean {
  return normalizeText(value).startsWith('/');
}

function resolvePageNumberToken(value: string, fallbackPage: number): number {
  const normalized = normalizeText(value).toLowerCase();
  const match = normalized.match(/^(?:page|pdf)\s*[:#-]?\s*(\d{1,4})$/i);
  if (!match) return fallbackPage;
  return Math.max(1, Number(match[1]) || fallbackPage);
}

function buildImageRequestPath(lessonId: string, page: LessonPageBlock): string {
  const source = normalizeText(page.page_image);
  if (isApiImageSource(source)) return source;
  const pageNumber = resolvePageNumberToken(source, page.page_number);
  return `/courses/lessons/${lessonId}/pages/${pageNumber}/image`;
}

export default function LessonPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const [lesson, setLesson] = useState<LessonDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isQuizMode, setIsQuizMode] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [pageImageByPage, setPageImageByPage] = useState<Record<number, string>>({});
  const [pageImageLoadingByPage, setPageImageLoadingByPage] = useState<Record<number, boolean>>({});
  const [pageImageErrorByPage, setPageImageErrorByPage] = useState<Record<number, string>>({});
  const objectUrlsRef = useRef<string[]>([]);

  const [alternativeByPage, setAlternativeByPage] = useState<Record<number, string>>({});
  const [isShowingAlternativeByPage, setIsShowingAlternativeByPage] = useState<Record<number, boolean>>({});
  const [isGeneratingAlternativeByPage, setIsGeneratingAlternativeByPage] = useState<Record<number, boolean>>({});

  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const uiLanguage: UiLanguage = language === 'UZ' ? 'UZ' : 'RU';
  const copy = COPY[uiLanguage];

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 3200);
  }, []);

  const revokePageUrls = useCallback(() => {
    for (const url of objectUrlsRef.current) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore cleanup issues
      }
    }
    objectUrlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      revokePageUrls();
    };
  }, [revokePageUrls]);

  useEffect(() => {
    let cancelled = false;

    const loadLesson = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const response = await api.get(`/courses/lessons/${params.id}`);
        if (cancelled) return;
        setLesson(response.data as LessonDetails);
      } catch (error: any) {
        if (cancelled) return;
        setLesson(null);
        setLoadError(error.response?.data?.error || 'Failed to load lesson');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadLesson();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    revokePageUrls();
    setCurrentPageIndex(0);
    setIsQuizMode(false);
    setPageImageByPage({});
    setPageImageLoadingByPage({});
    setPageImageErrorByPage({});
    setAlternativeByPage({});
    setIsShowingAlternativeByPage({});
    setIsGeneratingAlternativeByPage({});
    setQuizAnswers({});
    setQuizSubmitted(false);
  }, [lesson?.id, revokePageUrls]);

  const localizedSummary = useMemo(() => {
    if (!lesson) return '';
    if (uiLanguage === 'UZ') return normalizeText(lesson.summary_uz || lesson.summary_ru || lesson.summary);
    return normalizeText(lesson.summary_ru || lesson.summary_uz || lesson.summary);
  }, [lesson, uiLanguage]);

  const localizedContent = useMemo(() => {
    if (!lesson) return '';
    if (uiLanguage === 'UZ') return normalizeText(lesson.content_uz || lesson.content_source || lesson.content_ru || lesson.content);
    return normalizeText(lesson.content_ru || lesson.content_source || lesson.content_uz || lesson.content);
  }, [lesson, uiLanguage]);

  const glossaryTerms = useMemo(() => {
    const raw = pickLocalized(lesson?.glossary_json, uiLanguage);
    if (!Array.isArray(raw)) return [] as string[];
    return raw
      .map((item) => normalizeText((item as Record<string, unknown>)?.term))
      .filter(Boolean)
      .slice(0, 8);
  }, [lesson?.glossary_json, uiLanguage]);

  const fallbackMistakes = useMemo(() => {
    if (uiLanguage === 'UZ') {
      return [
        'Signalni kontekstdan ajratib ko‘rish.',
        'Tasdiqsiz kirish.',
        'Risk qoidalarini buzish.',
      ];
    }

    return [
      'Интерпретация сигнала без контекста.',
      'Вход без подтверждения.',
      'Нарушение риск-дисциплины.',
    ];
  }, [uiLanguage]);

  const lessonPages = useMemo(() => {
    const fromPageJson = normalizeLessonPages(pickLocalized(lesson?.lesson_pages_json, uiLanguage));
    if (fromPageJson.length > 0) return fromPageJson;

    const fromSteps = fallbackPagesFromSteps(pickLocalized(lesson?.lesson_steps_json, uiLanguage));
    if (fromSteps.length > 0) return fromSteps;

    return [{
      page_number: 1,
      page_image: `page:1`,
      page_text: localizedSummary,
      ai_explanation: localizedContent || localizedSummary,
      alternative_explanation: '',
      notes: '',
      practical_interpretation: '',
      key_terms: glossaryTerms,
      common_mistakes: fallbackMistakes,
    }] as LessonPageBlock[];
  }, [lesson?.lesson_pages_json, lesson?.lesson_steps_json, uiLanguage, localizedSummary, localizedContent, glossaryTerms, fallbackMistakes]);

  useEffect(() => {
    if (lessonPages.length === 0) {
      setCurrentPageIndex(0);
      return;
    }
    setCurrentPageIndex((prev) => Math.max(0, Math.min(prev, lessonPages.length - 1)));
  }, [lessonPages.length]);

  const quizItems = useMemo(() => {
    const fromLessonTest = normalizeQuiz(pickLocalized(lesson?.lesson_test_json, uiLanguage));
    if (fromLessonTest.length > 0) return fromLessonTest;

    const fromLegacy = normalizeQuiz(pickLocalized(lesson?.quiz_json, uiLanguage));
    if (fromLegacy.length > 0) return fromLegacy;

    return fallbackQuiz(uiLanguage);
  }, [lesson?.lesson_test_json, lesson?.quiz_json, uiLanguage]);

  const currentPage = lessonPages[currentPageIndex] || null;
  const isLastPage = lessonPages.length > 0 && currentPageIndex === lessonPages.length - 1;
  const progressPercent = lessonPages.length > 0
    ? Math.round(((isQuizMode ? lessonPages.length : currentPageIndex + 1) / lessonPages.length) * 100)
    : 0;

  const currentPageImage = currentPage ? pageImageByPage[currentPage.page_number] || '' : '';
  const currentPageError = currentPage ? pageImageErrorByPage[currentPage.page_number] || '' : '';
  const isCurrentPageLoading = currentPage ? Boolean(pageImageLoadingByPage[currentPage.page_number]) : false;
  const currentParagraphs = currentPage ? splitIntoParagraphs(currentPage.ai_explanation) : [];
  const currentAlternative = currentPage
    ? normalizeText(alternativeByPage[currentPage.page_number] || currentPage.alternative_explanation || '')
    : '';
  const currentNotes = currentPage ? parseBullets(currentPage.notes || '', 6) : [];
  const currentPractice = currentPage ? parsePracticalSteps(currentPage.practical_interpretation || '', 5) : [];
  const currentTerms = currentPage
    ? (Array.isArray(currentPage.key_terms) && currentPage.key_terms.length > 0
      ? currentPage.key_terms.slice(0, 8)
      : glossaryTerms)
    : [];
  const currentMistakes = currentPage
    ? (Array.isArray(currentPage.common_mistakes) && currentPage.common_mistakes.length > 0
      ? currentPage.common_mistakes.slice(0, 6)
      : fallbackMistakes)
    : [];
  const isShowingCurrentAlternative = currentPage ? Boolean(isShowingAlternativeByPage[currentPage.page_number]) : false;
  const isGeneratingCurrentAlternative = currentPage ? Boolean(isGeneratingAlternativeByPage[currentPage.page_number]) : false;

  const ensurePageImage = useCallback(async (page: LessonPageBlock) => {
    if (!lesson?.id) return;

    const pageNumber = page.page_number;
    if (pageImageByPage[pageNumber] || pageImageLoadingByPage[pageNumber]) return;

    const source = normalizeText(page.page_image);

    if (isInlineImageSource(source) || isRemoteImageSource(source)) {
      setPageImageByPage((prev) => ({ ...prev, [pageNumber]: source }));
      return;
    }

    setPageImageLoadingByPage((prev) => ({ ...prev, [pageNumber]: true }));
    setPageImageErrorByPage((prev) => ({ ...prev, [pageNumber]: '' }));

    try {
      const response = await api.get(buildImageRequestPath(lesson.id, page), { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data as Blob);
      objectUrlsRef.current.push(objectUrl);
      setPageImageByPage((prev) => ({ ...prev, [pageNumber]: objectUrl }));
    } catch (error: any) {
      setPageImageErrorByPage((prev) => ({
        ...prev,
        [pageNumber]: error.response?.data?.error || copy.pageMissing,
      }));
    } finally {
      setPageImageLoadingByPage((prev) => ({ ...prev, [pageNumber]: false }));
    }
  }, [lesson?.id, pageImageByPage, pageImageLoadingByPage, copy.pageMissing]);

  useEffect(() => {
    if (!currentPage) return;
    void ensurePageImage(currentPage);

    const nextPage = lessonPages[currentPageIndex + 1];
    if (nextPage) void ensurePageImage(nextPage);
  }, [currentPage, currentPageIndex, lessonPages, ensurePageImage]);

  const buildLessonContext = useCallback((page?: LessonPageBlock) => {
    if (!lesson) return undefined;

    return {
      courseId: lesson.course_id,
      courseTitle: lesson.course_title,
      courseLevel: lesson.course_level || lesson.difficulty_level || 'Beginner',
      moduleTitle: lesson.module_title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonType: lesson.lesson_type || 'theory',
      lessonLanguage: uiLanguage,
      sourceLanguage: lesson.source_language || null,
      lessonSummary: localizedSummary,
      lessonContent: localizedContent.slice(0, 4500),
      glossary: currentTerms.map((term) => ({ term, definition: term })),
      commonMistakes: currentMistakes,
      currentPageNumber: page?.page_number,
      currentPageText: page?.page_text,
      currentPageExplanation: page?.ai_explanation,
      currentPageAlternative: page?.alternative_explanation,
      lessonPages: lessonPages.slice(0, 14),
    };
  }, [lesson, uiLanguage, localizedSummary, localizedContent, currentTerms, currentMistakes, lessonPages]);

  const pushAiWithContext = useCallback((prefill: string, page?: LessonPageBlock) => {
    const context = buildLessonContext(page);
    localStorage.setItem('ai_prefill', prefill);
    localStorage.setItem('ai_lesson_context', JSON.stringify(context));
    router.push('/ai');
  }, [buildLessonContext, router]);

  const handleAskPageQuestion = useCallback((page: LessonPageBlock) => {
    const prefill = [
      copy.askPagePrefill,
      `${copy.page}: ${page.page_number}`,
      `Page text: ${page.page_text}`,
      `Current explanation: ${page.ai_explanation}`,
    ].join('\n');

    pushAiWithContext(prefill, page);
  }, [copy.askPagePrefill, copy.page, pushAiWithContext]);

  const handleExplainAgain = useCallback(async (page: LessonPageBlock) => {
    const pageNumber = page.page_number;
    const existing = normalizeText(alternativeByPage[pageNumber] || page.alternative_explanation || '');

    if (existing) {
      setIsShowingAlternativeByPage((prev) => ({ ...prev, [pageNumber]: true }));
      showToast(copy.alternativeReady);
      return;
    }

    if (isGeneratingAlternativeByPage[pageNumber]) return;

    setIsGeneratingAlternativeByPage((prev) => ({ ...prev, [pageNumber]: true }));
    showToast(copy.alternativeLoading);

    try {
      const message = uiLanguage === 'UZ'
        ? `Ushbu darsning ${pageNumber}-sahifasini sodda, ammo chuqur tarzda qayta tushuntiring. 4-6 paragrafda yozing: sahifada nima bor, asosiy konsept, Smart Money va likvidlik mantig‘i, oddiy analogiya, yangi boshlovchi xatosi, chartda qo‘llash. Emoji ishlating: 🧠 💡 ⚠️ 🔥 📌.`
        : `Объясни ${pageNumber}-ю страницу этого урока проще, но глубоко. Дай 4-6 абзацев: что на странице, основную концепцию, механику Smart Money и ликвидности, простую аналогию, ошибку новичка, применение на графике. Используй эмодзи: 🧠 💡 ⚠️ 🔥 📌.`;

      const response = await api.post('/ai/chat', {
        message,
        context: buildLessonContext(page),
      });

      const generated = normalizeText(response?.data?.response || '');
      if (!generated) throw new Error('Empty AI response');

      setAlternativeByPage((prev) => ({ ...prev, [pageNumber]: generated }));
      setIsShowingAlternativeByPage((prev) => ({ ...prev, [pageNumber]: true }));
      showToast(copy.alternativeReady);
    } catch (error: any) {
      showToast(error?.response?.data?.error || copy.alternativeError);
    } finally {
      setIsGeneratingAlternativeByPage((prev) => ({ ...prev, [pageNumber]: false }));
    }
  }, [alternativeByPage, buildLessonContext, copy.alternativeError, copy.alternativeLoading, copy.alternativeReady, isGeneratingAlternativeByPage, showToast, uiLanguage]);

  const handleUnderstood = useCallback(() => {
    if (!currentPage) return;

    if (!isLastPage) {
      setCurrentPageIndex((prev) => Math.min(prev + 1, lessonPages.length - 1));
      setIsShowingAlternativeByPage((prev) => ({ ...prev, [currentPage.page_number]: false }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(copy.movedNext);
      return;
    }

    setIsQuizMode(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(copy.pagesDone);
  }, [copy.movedNext, copy.pagesDone, currentPage, isLastPage, lessonPages.length, showToast]);

  const goToPreviousPage = useCallback(() => {
    if (currentPageIndex <= 0) return;
    setCurrentPageIndex((prev) => Math.max(0, prev - 1));
    setIsQuizMode(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(copy.movedPrev);
  }, [copy.movedPrev, currentPageIndex, showToast]);

  const goToNextPage = useCallback(() => {
    if (isLastPage) {
      setIsQuizMode(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(copy.pagesDone);
      return;
    }

    setCurrentPageIndex((prev) => Math.min(prev + 1, lessonPages.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(copy.movedNext);
  }, [copy.movedNext, copy.pagesDone, isLastPage, lessonPages.length, showToast]);

  const markLessonCompleted = useCallback(async () => {
    if (!lesson?.id || lesson.is_completed || isCompleting) return;

    setIsCompleting(true);
    try {
      await api.post(`/courses/lessons/${lesson.id}/complete`);
      setLesson((prev) => (prev ? { ...prev, is_completed: true } : prev));
      showToast(copy.completeSuccess);
    } catch (error: any) {
      showToast(error.response?.data?.error || copy.completeError);
    } finally {
      setIsCompleting(false);
    }
  }, [copy.completeError, copy.completeSuccess, isCompleting, lesson?.id, lesson?.is_completed, showToast]);

  const quizScore = useMemo(() => {
    if (!quizSubmitted || quizItems.length === 0) return null;

    let score = 0;
    quizItems.forEach((item, index) => {
      if (Number(quizAnswers[index]) === Number(item.correct_index)) score += 1;
    });
    return score;
  }, [quizAnswers, quizItems, quizSubmitted]);

  const rootStyle: React.CSSProperties = {
    backgroundColor: '#04070d',
    backgroundImage: 'radial-gradient(circle at top, rgba(24,46,89,0.28), transparent 42%), radial-gradient(circle at 85% 10%, rgba(12,86,120,0.18), transparent 28%)',
    color: '#eef2ff',
    fontFamily: 'var(--font-lesson-body)',
  };

  return (
    <div className={cn(headingFont.variable, bodyFont.variable, 'min-h-screen')} style={rootStyle}>
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full border px-4 py-2 text-xs font-medium text-slate-100"
            style={{ background: 'rgba(8,13,24,0.92)', borderColor: 'rgba(148,163,184,0.16)' }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ background: 'rgba(4,7,13,0.74)', borderColor: 'rgba(148,163,184,0.08)' }}>
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <button
            onClick={() => router.push(lesson ? `/dashboard/courses/${lesson.course_id}` : '/dashboard/academy')}
            className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            {copy.back}
          </button>

          <div className="hidden text-center md:block">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.readingMode}</p>
            <p className="mt-1 text-sm text-slate-200">{lesson?.title || 'Lesson'}</p>
          </div>

          <div className="flex items-center gap-2 rounded-full border p-1" style={{ borderColor: 'rgba(148,163,184,0.14)' }}>
            <button
              onClick={() => setLanguage('RU')}
              className={cn('rounded-full px-3 py-1 text-[11px] font-semibold transition', uiLanguage === 'RU' ? 'text-white' : 'text-slate-400')}
              style={uiLanguage === 'RU' ? { background: '#10203b' } : undefined}
            >
              RU
            </button>
            <button
              onClick={() => setLanguage('UZ')}
              className={cn('rounded-full px-3 py-1 text-[11px] font-semibold transition', uiLanguage === 'UZ' ? 'text-white' : 'text-slate-400')}
              style={uiLanguage === 'UZ' ? { background: '#10203b' } : undefined}
            >
              UZ
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-10 md:px-8 md:pt-14">
        {isLoading ? (
          <section className="mx-auto max-w-2xl py-24 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-200" />
            <h1 className="mt-6 text-4xl text-slate-50" style={{ fontFamily: 'var(--font-lesson-heading)' }}>{copy.loadingTitle}</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">{copy.loadingHint}</p>
          </section>
        ) : !lesson ? (
          <section className="mx-auto max-w-2xl py-24 text-center">
            <h1 className="text-4xl text-slate-50" style={{ fontFamily: 'var(--font-lesson-heading)' }}>{copy.notFound}</h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-400">{loadError || copy.notFoundHint}</p>
          </section>
        ) : (
          <>
            <section className="mx-auto max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{copy.aiVoice}</p>
              <h1 className="mt-3 text-4xl leading-tight text-slate-50 md:text-6xl" style={{ fontFamily: 'var(--font-lesson-heading)' }}>
                {lesson.title}
              </h1>
              <p className="mt-6 text-base leading-8 text-slate-300 md:text-lg md:leading-9">{localizedSummary}</p>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                <span>{copy.course}: {lesson.course_title}</span>
                <span>{copy.module}: {lesson.module_title}</span>
                {lesson.source_section && <span>{copy.section}: {lesson.source_section}</span>}
                <span>{copy.language}: {uiLanguage}</span>
              </div>

              <div className="mt-10 border-t pt-6" style={{ borderColor: 'rgba(148,163,184,0.1)' }}>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  <span>{isQuizMode ? copy.quizTitle : `${copy.page} ${Math.min(currentPageIndex + 1, lessonPages.length)} ${copy.of} ${lessonPages.length}`}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="mt-3 h-px w-full bg-white/10">
                  <div className="h-px bg-gradient-to-r from-sky-300 via-cyan-200 to-blue-400 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </section>

            {!isQuizMode && currentPage && (
              <AnimatePresence mode="wait">
                <motion.section
                  key={`page-${currentPage.page_number}`}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="mx-auto mt-14 max-w-3xl"
                >
                  <div className="border-t pt-10" style={{ borderColor: 'rgba(148,163,184,0.1)' }}>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{copy.page} {currentPage.page_number}</p>

                    <div className="mt-8 overflow-hidden rounded-[28px] bg-[#07101d] p-3 shadow-[0_20px_80px_rgba(0,0,0,0.28)] md:p-5">
                      <div className="overflow-hidden rounded-[22px] bg-[#0b1422]">
                        {isCurrentPageLoading && !currentPageImage ? (
                          <div className="flex min-h-[340px] items-center justify-center text-sm text-slate-400 md:min-h-[520px]">
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            {copy.pageLoading}
                          </div>
                        ) : currentPageImage ? (
                          <img
                            src={currentPageImage}
                            alt={`Page ${currentPage.page_number}`}
                            className="w-full"
                            style={{ objectFit: 'contain', background: '#0b1422' }}
                          />
                        ) : (
                          <div className="flex min-h-[340px] items-center justify-center px-8 text-center text-sm text-slate-500 md:min-h-[520px]">
                            {currentPageError || copy.pageMissing}
                          </div>
                        )}
                      </div>
                    </div>

                    {currentPage.page_text && (
                      <div className="mt-8 border-l pl-5 text-sm leading-8 text-slate-400" style={{ borderColor: 'rgba(103,232,249,0.18)' }}>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.sourceText}</p>
                        <p className="mt-3">📌 {currentPage.page_text}</p>
                      </div>
                    )}

                    <div className="mt-12">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200">{copy.explanationTitle}</p>
                      <div className="mt-5 space-y-5 text-[16px] leading-8 text-slate-100 md:text-[17px] md:leading-9">
                        {currentParagraphs.map((paragraph, index) => (
                          <p key={`paragraph-${currentPage.page_number}-${index}`}>{paragraph}</p>
                        ))}
                      </div>
                    </div>

                    {isShowingCurrentAlternative && currentAlternative && (
                      <div className="mt-10 border-l pl-5" style={{ borderColor: 'rgba(125,211,252,0.26)' }}>
                        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">{copy.alternativeTitle}</p>
                        <div className="mt-4 space-y-4 text-sm leading-8 text-cyan-50 md:text-[15px]">
                          {splitIntoParagraphs(currentAlternative).map((paragraph, index) => (
                            <p key={`alternative-${currentPage.page_number}-${index}`}>{paragraph}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentNotes.length > 0 && (
                      <div className="mt-10 border-t pt-8" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.keyIdeas}</p>
                        <div className="mt-4 space-y-2 text-sm leading-8 text-slate-300">
                          {currentNotes.map((note, index) => (
                            <p key={`note-${currentPage.page_number}-${index}`}>- {note}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentPractice.length > 0 && (
                      <div className="mt-10 border-t pt-8" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.practice}</p>
                        <div className="mt-4 space-y-2 text-sm leading-8 text-slate-300">
                          {currentPractice.map((step, index) => (
                            <p key={`practice-${currentPage.page_number}-${index}`}>{index + 1}. {step}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {(currentTerms.length > 0 || currentMistakes.length > 0) && (
                      <div className="mt-10 grid gap-8 border-t pt-8 md:grid-cols-2" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.terms}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {currentTerms.slice(0, 8).map((term, index) => (
                              <span
                                key={`term-${currentPage.page_number}-${index}`}
                                className="rounded-full border px-3 py-1 text-xs text-slate-300"
                                style={{ borderColor: 'rgba(148,163,184,0.14)' }}
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.mistakes}</p>
                          <div className="mt-4 space-y-2 text-sm leading-8 text-rose-100">
                            {currentMistakes.slice(0, 5).map((mistake, index) => (
                              <p key={`mistake-${currentPage.page_number}-${index}`}>⚠️ {mistake}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-12 flex flex-wrap gap-3 border-t pt-8" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
                      <button
                        onClick={handleUnderstood}
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
                        style={{ background: 'linear-gradient(135deg, #134e4a 0%, #0f172a 100%)' }}
                      >
                        {copy.understood}
                      </button>

                      <button
                        onClick={() => handleExplainAgain(currentPage)}
                        disabled={isGeneratingCurrentAlternative}
                        className="rounded-full border px-4 py-2.5 text-sm font-semibold text-slate-200 transition disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ borderColor: 'rgba(148,163,184,0.16)', background: 'rgba(15,23,42,0.78)' }}
                      >
                        {isGeneratingCurrentAlternative ? copy.alternativeLoading : copy.explainAgain}
                      </button>

                      <button
                        onClick={() => handleAskPageQuestion(currentPage)}
                        className="rounded-full border px-4 py-2.5 text-sm font-semibold text-slate-200 transition"
                        style={{ borderColor: 'rgba(148,163,184,0.16)', background: 'rgba(9,15,26,0.78)' }}
                      >
                        {copy.askQuestion}
                      </button>
                    </div>

                    <div className="mt-10 flex items-center justify-between border-t pt-6" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
                      <button
                        onClick={goToPreviousPage}
                        disabled={currentPageIndex <= 0}
                        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                        {copy.pagePrev}
                      </button>

                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        {copy.page} {currentPage.page_number}
                      </p>

                      <button
                        onClick={goToNextPage}
                        className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
                      >
                        {isLastPage ? copy.quizTitle : copy.pageNext}
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </motion.section>
              </AnimatePresence>
            )}

            {isQuizMode && (
              <section className="mx-auto mt-14 max-w-3xl border-t pt-10" style={{ borderColor: 'rgba(148,163,184,0.1)' }}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{copy.quizTitle}</p>
                    <h2 className="mt-3 text-3xl text-slate-50 md:text-5xl" style={{ fontFamily: 'var(--font-lesson-heading)' }}>
                      {copy.quizTitle}
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-400">{copy.quizHint}</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsQuizMode(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="rounded-full border px-4 py-2 text-sm text-slate-200"
                    style={{ borderColor: 'rgba(148,163,184,0.14)' }}
                  >
                    {copy.quizBack}
                  </button>
                </div>

                <div className="mt-10 space-y-8">
                  {quizItems.map((item, quizIndex) => {
                    const selected = quizAnswers[quizIndex];
                    const isAnswered = typeof selected === 'number';
                    const isCorrect = isAnswered && selected === item.correct_index;

                    return (
                      <div key={`quiz-${quizIndex}`} className="border-t pt-7" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
                        <p className="text-lg leading-8 text-slate-100">{quizIndex + 1}. {item.question}</p>

                        <div className="mt-5 space-y-3">
                          {item.options.map((option, optionIndex) => {
                            const selectedThis = selected === optionIndex;
                            const correctOption = quizSubmitted && optionIndex === item.correct_index;
                            const wrongSelection = quizSubmitted && selectedThis && optionIndex !== item.correct_index;

                            let style: React.CSSProperties = {
                              borderColor: 'rgba(148,163,184,0.14)',
                              background: 'rgba(7,12,22,0.72)',
                              color: '#cbd5e1',
                            };

                            if (selectedThis) {
                              style = {
                                borderColor: 'rgba(125,211,252,0.34)',
                                background: 'rgba(14,30,54,0.82)',
                                color: '#f8fafc',
                              };
                            }
                            if (correctOption) {
                              style = {
                                borderColor: 'rgba(74,222,128,0.32)',
                                background: 'rgba(5,46,22,0.66)',
                                color: '#dcfce7',
                              };
                            }
                            if (wrongSelection) {
                              style = {
                                borderColor: 'rgba(251,113,133,0.32)',
                                background: 'rgba(69,10,10,0.58)',
                                color: '#ffe4e6',
                              };
                            }

                            return (
                              <button
                                key={`quiz-${quizIndex}-option-${optionIndex}`}
                                onClick={() => {
                                  if (quizSubmitted) return;
                                  setQuizAnswers((prev) => ({ ...prev, [quizIndex]: optionIndex }));
                                }}
                                className="w-full rounded-2xl border px-4 py-3 text-left text-sm leading-7 transition"
                                style={style}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>

                        {quizSubmitted && (
                          <p className="mt-4 text-sm leading-7" style={{ color: isCorrect ? '#86efac' : '#fca5a5' }}>
                            {item.explanation || (isCorrect ? 'Correct' : 'Review this answer again')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-12 flex flex-wrap items-center gap-3 border-t pt-8" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
                  <button
                    onClick={() => setQuizSubmitted(true)}
                    disabled={quizSubmitted || Object.keys(quizAnswers).length < quizItems.length}
                    className="rounded-full px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)' }}
                  >
                    {copy.quizCheck}
                  </button>

                  <button
                    onClick={() => {
                      setQuizAnswers({});
                      setQuizSubmitted(false);
                    }}
                    className="rounded-full border px-4 py-2.5 text-sm font-semibold text-slate-200"
                    style={{ borderColor: 'rgba(148,163,184,0.14)' }}
                  >
                    {copy.quizReset}
                  </button>

                  {quizSubmitted && typeof quizScore === 'number' ? (
                    <p className="text-sm font-semibold text-emerald-300">
                      {copy.quizScore}: {quizScore}/{quizItems.length}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">{copy.quizNeedAll}</p>
                  )}
                </div>

                <div className="mt-12 border-t pt-8" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={markLessonCompleted}
                      disabled={lesson.is_completed || isCompleting}
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: lesson.is_completed ? '#0f5132' : 'linear-gradient(135deg, #065f46 0%, #0f172a 100%)' }}
                    >
                      {isCompleting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      {lesson.is_completed ? copy.completed : copy.completeLesson}
                    </button>

                    {lesson.next_lesson_id ? (
                      <button
                        onClick={() => router.push(`/dashboard/lessons/${lesson.next_lesson_id}`)}
                        className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold text-slate-200"
                        style={{ borderColor: 'rgba(148,163,184,0.14)' }}
                      >
                        <Sparkles size={15} />
                        {copy.nextLesson}
                      </button>
                    ) : (
                      <p className="text-sm text-slate-500">{copy.noNextLesson}</p>
                    )}
                  </div>
                </div>
              </section>
            )}

            <footer className="mx-auto mt-16 flex max-w-3xl items-center justify-between border-t pt-6 text-xs text-slate-500" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
              <span>{copy.language}: {uiLanguage}</span>
              <span className="inline-flex items-center gap-2">
                <Languages size={12} />
                TradeMentor AI
              </span>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
