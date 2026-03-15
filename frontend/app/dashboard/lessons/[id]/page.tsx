'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PT_Sans, PT_Serif } from 'next/font/google';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  Brain,
  CheckCircle2,
  ChevronRight,
  Languages,
  Loader2,
  MessageCircleQuestion,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

const serif = PT_Serif({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700'],
  variable: '--font-lesson-serif',
});

const sans = PT_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700'],
  variable: '--font-lesson-sans',
});

type UiLanguage = 'RU' | 'UZ';

type GlossaryItem = {
  term: string;
  definition: string;
};

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
  key_points_json?: unknown;
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
  conclusion_json?: unknown;
  additional_notes_json?: unknown;
  pdf_path?: string | null;
  course_id: string;
  course_title: string;
  course_level?: string | null;
  module_id: string;
  module_title: string;
  next_lesson_id?: string | null;
  is_completed?: boolean;
  completed_at?: string | null;
};

const COPY = {
  RU: {
    loadingTitle: 'Собираем page-by-page lesson',
    loadingHint: 'AI подготавливает разбор каждой страницы книги в формате premium reading.',
    lessonNotFound: 'Урок не найден',
    lessonNotFoundHint: 'Вернитесь в курс и откройте урок заново.',
    backToCourse: 'Назад к курсу',
    markComplete: 'Mark complete',
    completed: 'Урок завершен',
    askAi: 'Ask AI',
    addFavorite: 'Favorite',
    inFavorite: 'In favorite',
    topLanguage: 'Язык',
    heroBadge: 'AI-assisted book learning',
    source: 'Источник',
    section: 'Раздел',
    pageLabel: 'Страница',
    pageLoading: 'Рендерим страницу из PDF…',
    pageMissing: 'Не удалось получить изображение страницы',
    mentorTitle: 'AI-разбор страницы',
    notesTitle: 'Ключевые акценты',
    practicalTitle: 'Как применить в трейдинге',
    termsTitle: 'Термины страницы',
    mistakesTitle: 'Ошибки новичка',
    askPageQuestion: 'У меня вопрос по этой странице',
    quizTitle: 'Мини-тест по пройденным страницам',
    quizHint: 'Проверка понимания ключевых идей книги по этому уроку.',
    checkResult: 'Проверить результат',
    resetQuiz: 'Сбросить',
    score: 'Результат',
    answerAllHint: 'Ответьте на все вопросы, чтобы проверить результат.',
    nextTitle: 'Завершение урока',
    nextLesson: 'К следующему уроку',
    noNextLesson: 'Это последний урок в текущей последовательности.',
    completionToast: 'Урок отмечен завершенным',
    completionError: 'Не удалось отметить урок',
    favoriteAdded: 'Урок добавлен в избранное',
    favoriteRemoved: 'Урок удален из избранного',
    askPrefill: 'Разберите этот урок как наставник и дайте прикладной план по страницам книги.',
    askPagePrefill: 'У меня вопрос по конкретной странице урока. Объясни глубоко и практично.',
  },
  UZ: {
    loadingTitle: 'Page-by-page lesson tayyorlanmoqda',
    loadingHint: 'AI kitobning har bir sahifasini premium reading formatida tahlil qilmoqda.',
    lessonNotFound: 'Dars topilmadi',
    lessonNotFoundHint: 'Kursga qayting va darsni qayta oching.',
    backToCourse: 'Kursga qaytish',
    markComplete: 'Mark complete',
    completed: 'Dars yakunlangan',
    askAi: 'Ask AI',
    addFavorite: 'Favorite',
    inFavorite: 'In favorite',
    topLanguage: 'Til',
    heroBadge: 'AI-assisted book learning',
    source: 'Manba',
    section: 'Bo‘lim',
    pageLabel: 'Sahifa',
    pageLoading: 'PDFdan sahifa render qilinmoqda…',
    pageMissing: 'Sahifa rasmini olishning imkoni bo‘lmadi',
    mentorTitle: 'AI sahifa tahlili',
    notesTitle: 'Asosiy urg‘ular',
    practicalTitle: 'Tradingda qo‘llash',
    termsTitle: 'Sahifa terminlari',
    mistakesTitle: 'Yangi boshlovchi xatolari',
    askPageQuestion: 'Bu sahifa bo‘yicha savolim bor',
    quizTitle: 'O‘tilgan sahifalar bo‘yicha mini-test',
    quizHint: 'Ushbu darsdagi kitob g‘oyalarini tushunganingizni tekshiradi.',
    checkResult: 'Natijani tekshirish',
    resetQuiz: 'Qayta boshlash',
    score: 'Natija',
    answerAllHint: 'Natijani ko‘rish uchun barcha savollarga javob bering.',
    nextTitle: 'Darsni yakunlash',
    nextLesson: 'Keyingi darsga o‘tish',
    noNextLesson: 'Bu ketma-ketlikdagi oxirgi dars.',
    completionToast: 'Dars yakunlangan deb belgilandi',
    completionError: 'Darsni yakunlashda xatolik',
    favoriteAdded: 'Dars sevimlilarga qo‘shildi',
    favoriteRemoved: 'Dars sevimlilardan olib tashlandi',
    askPrefill: 'Ushbu darsni mentor uslubida sahifalar bo‘yicha amaliy tahlil qiling.',
    askPagePrefill: 'Darsdagi aniq sahifa bo‘yicha savolim bor. Iltimos, chuqur va amaliy tushuntiring.',
  },
} as const;

function normalizeText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function splitIntoParagraphs(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const markerParagraphs = normalized
    .split(/(?=(?:1️⃣|2️⃣|3️⃣|4️⃣|5️⃣))/g)
    .map((part) => normalizeText(part))
    .filter(Boolean);

  if (markerParagraphs.length >= 2) return markerParagraphs.slice(0, 8);

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length <= 2) return [normalized];

  const paragraphs: string[] = [];
  let chunk = '';
  for (const sentence of sentences) {
    const candidate = chunk ? `${chunk} ${sentence}` : sentence;
    if (candidate.length > 420 && chunk) {
      paragraphs.push(chunk);
      chunk = sentence;
    } else {
      chunk = candidate;
    }
  }
  if (chunk) paragraphs.push(chunk);

  return paragraphs.slice(0, 10);
}

function parseBullets(text: string, max = 6): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const byPipe = normalized
    .split('|')
    .map((item) => normalizeText(item))
    .filter(Boolean);

  if (byPipe.length > 1) return byPipe.slice(0, max);

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

function normalizeGlossary(raw: unknown): GlossaryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      term: normalizeText((item as Record<string, unknown>)?.term),
      definition: normalizeText((item as Record<string, unknown>)?.definition),
    }))
    .filter((item) => item.term && item.definition)
    .slice(0, 14);
}

function normalizeQuiz(raw: unknown): QuizItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const source = item as Record<string, unknown>;
      const question = normalizeText(source?.question);
      const optionsRaw = Array.isArray(source?.options) ? source.options : [];
      const options = optionsRaw.map((option) => normalizeText(option)).filter(Boolean).slice(0, 6);
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
      const keyTerms = Array.isArray(source?.key_terms)
        ? source.key_terms.map((term) => normalizeText(term)).filter(Boolean).slice(0, 8)
        : [];
      const commonMistakes = Array.isArray(source?.common_mistakes)
        ? source.common_mistakes.map((mistake) => normalizeText(mistake)).filter(Boolean).slice(0, 8)
        : [];

      return {
        page_number,
        page_image: normalizeText(source?.page_image || `page:${page_number}`),
        page_text: normalizeText(source?.page_text || source?.source_excerpt),
        ai_explanation: normalizeText(source?.ai_explanation || source?.explanation),
        notes: normalizeText(source?.notes),
        practical_interpretation: normalizeText(source?.practical_interpretation || source?.practical_application),
        key_terms: keyTerms,
        common_mistakes: commonMistakes,
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
    if (unique.length >= 24) break;
  }

  return unique;
}

function fallbackPagesFromSteps(raw: unknown): LessonPageBlock[] {
  if (!Array.isArray(raw)) return [];

  const pages = raw
    .map((item, index) => {
      const source = item as Record<string, unknown>;
      const pageFromRaw = Number(source?.page_from);
      const pageRaw = Number(source?.page_number);
      const page_number = Number.isInteger(pageRaw)
        ? Math.max(1, pageRaw)
        : Number.isInteger(pageFromRaw)
          ? Math.max(1, pageFromRaw)
          : index + 1;

      return {
        page_number,
        page_image: normalizeText(source?.page_image || `page:${page_number}`),
        page_text: normalizeText(source?.page_text || source?.source_excerpt),
        ai_explanation: normalizeText(source?.ai_explanation || source?.explanation),
        notes: normalizeText(source?.notes || source?.what_to_notice),
        practical_interpretation: normalizeText(source?.practical_interpretation),
        key_terms: [],
        common_mistakes: [],
      } as LessonPageBlock;
    })
    .filter((page) => page.ai_explanation)
    .sort((a, b) => a.page_number - b.page_number);

  const unique: LessonPageBlock[] = [];
  const seen = new Set<number>();
  for (const page of pages) {
    if (seen.has(page.page_number)) continue;
    seen.add(page.page_number);
    unique.push(page);
    if (unique.length >= 24) break;
  }

  return unique;
}

function fallbackQuiz(language: UiLanguage): QuizItem[] {
  if (language === 'UZ') {
    return [
      {
        question: 'Setupni baholashda birinchi navbatda nimaga qaraysiz?',
        options: ['Faqat bitta signalga', 'Bozor konteksti va strukturasiga', 'Faqat indikatorga'],
        correct_index: 1,
        explanation: 'To‘g‘ri javob: kontekst va struktura. Alohida signal yetarli emas.',
      },
      {
        question: 'Likvidlik olinishidan keyin to‘g‘ri harakat qaysi?',
        options: ['Darhol kirish', 'Tasdiq signalini kutish', 'Rejasiz kirish'],
        correct_index: 1,
        explanation: 'Tasdiqni kutish false entry xavfini kamaytiradi.',
      },
      {
        question: 'Risk management bo‘yicha to‘g‘ri qoida qaysi?',
        options: ['Stopni bekor qilish', 'Riskni oldindan belgilash', 'Hissiyot bilan lotni oshirish'],
        correct_index: 1,
        explanation: 'Risk oldindan aniqlanmasa tizim barqaror bo‘lmaydi.',
      },
    ];
  }

  return [
    {
      question: 'Что проверяется первым перед входом?',
      options: ['Один сигнал', 'Контекст и структура', 'Только индикатор'],
      correct_index: 1,
      explanation: 'Верно: сначала контекст и структура, потом точка входа.',
    },
    {
      question: 'Как действовать после снятия ликвидности?',
      options: ['Входить сразу', 'Ждать подтверждение', 'Входить без плана'],
      correct_index: 1,
      explanation: 'Подтверждение снижает вероятность ложного входа.',
    },
    {
      question: 'Какой подход к риску корректный?',
      options: ['Убирать стоп', 'Фиксировать риск заранее', 'Увеличивать объем по эмоциям'],
      correct_index: 1,
      explanation: 'Риск задается до открытия позиции.',
    },
  ];
}

function fallbackCommonMistakes(language: UiLanguage): string[] {
  if (language === 'UZ') {
    return [
      'Signalni kontekstdan ajratib ko‘rish.',
      'Tasdiqsiz kirish.',
      'Risk qoidalarini buzib lotni oshirish.',
    ];
  }

  return [
    'Интерпретация сигнала без контекста.',
    'Вход без подтверждения.',
    'Нарушение риск-дисциплины через увеличение объема.',
  ];
}

export default function LessonPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const [user, setUser] = useState<any>(null);
  const [lesson, setLesson] = useState<LessonDetails | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isCompleting, setIsCompleting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isRenderingPageImage, setIsRenderingPageImage] = useState(false);
  const [pageImageByPage, setPageImageByPage] = useState<Record<number, string>>({});
  const pageImageByPageRef = useRef<Record<number, string>>({});
  const [pageRenderError, setPageRenderError] = useState<string | null>(null);

  const pdfBinaryRef = useRef<ArrayBuffer | null>(null);
  const pdfDocumentRef = useRef<any>(null);
  const renderingPagesRef = useRef<Set<number>>(new Set());

  const uiLanguage: UiLanguage = language === 'UZ' ? 'UZ' : 'RU';
  const copy = COPY[uiLanguage];

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const userCookie = Cookies.get('user');
    if (!userCookie) return;
    try {
      setUser(JSON.parse(userCookie));
    } catch {
      setUser(null);
    }
  }, []);

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
    if (!lesson?.id) return;
    const key = `lesson_favorite_${lesson.id}`;
    setIsFavorite(localStorage.getItem(key) === '1');
    setQuizAnswers({});
    setQuizSubmitted(false);
    setPageImageByPage({});
    pageImageByPageRef.current = {};
    setPageRenderError(null);
    pdfBinaryRef.current = null;
    pdfDocumentRef.current = null;
    renderingPagesRef.current.clear();
  }, [lesson?.id]);

  useEffect(() => {
    return () => {
      pdfBinaryRef.current = null;
      pdfDocumentRef.current = null;
      renderingPagesRef.current.clear();
    };
  }, []);

  useEffect(() => {
    pageImageByPageRef.current = pageImageByPage;
  }, [pageImageByPage]);

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

  const glossary = useMemo(() => {
    const raw = pickLocalized(lesson?.glossary_json, uiLanguage);
    const normalized = normalizeGlossary(raw);
    if (normalized.length > 0) return normalized;
    if (uiLanguage === 'UZ') {
      return [
        { term: 'Liquidity', definition: 'Buyurtmalar to‘plangan zona.' },
        { term: 'Break of Structure', definition: 'Muhim maksimum/minimum buzilishi.' },
        { term: 'Order Block', definition: 'Yirik ishtirokchi izi bo‘lgan zona.' },
      ];
    }
    return [
      { term: 'Liquidity', definition: 'Зона концентрации ордеров.' },
      { term: 'Break of Structure', definition: 'Пробой ключевого экстремума.' },
      { term: 'Order Block', definition: 'Зона активности крупного капитала.' },
    ];
  }, [lesson?.glossary_json, uiLanguage]);

  const practical = useMemo(() => {
    const raw = normalizeText(pickLocalized(lesson?.practice_notes, uiLanguage));
    if (raw) return raw;
    if (uiLanguage === 'UZ') {
      return 'Har setupda kirish, stop va targetni oldindan yozing. Tasdiqsiz savdo qilmang.';
    }
    return 'Для каждого сетапа заранее фиксируйте вход, стоп и цель. Не входите без подтверждения.';
  }, [lesson?.practice_notes, uiLanguage]);

  const commonMistakes = useMemo(() => {
    const raw = pickLocalized(lesson?.common_mistakes_json, uiLanguage);
    const normalized = Array.isArray(raw)
      ? raw.map((item) => normalizeText(item)).filter(Boolean).slice(0, 8)
      : [];
    return normalized.length > 0 ? normalized : fallbackCommonMistakes(uiLanguage);
  }, [lesson?.common_mistakes_json, uiLanguage]);

  const selfCheck = useMemo(() => {
    const raw = pickLocalized(lesson?.self_check_questions_json, uiLanguage);
    const normalized = Array.isArray(raw)
      ? raw.map((item) => normalizeText(item)).filter(Boolean).slice(0, 5)
      : [];

    if (normalized.length > 0) return normalized;
    if (uiLanguage === 'UZ') {
      return [
        'Bu sahifada asosiy signal nimaga tayangan?',
        'Likvidlik qayerdan olingan?',
        'Entry invalid bo‘lsa qayerda chiqasiz?',
      ];
    }
    return [
      'На чем основан ключевой сигнал страницы?',
      'Где была снята ликвидность?',
      'Где будет выход при invalidation?',
    ];
  }, [lesson?.self_check_questions_json, uiLanguage]);

  const homework = useMemo(() => {
    const raw = normalizeText(pickLocalized(lesson?.homework_json, uiLanguage));
    if (raw) return raw;
    if (uiLanguage === 'UZ') {
      return '3-5 ta tarixiy chartni oching, sahifalardagi mantiqni toping va journaling qiling.';
    }
    return 'Откройте 3-5 исторических графиков, найдите на них логику из страниц и зафиксируйте в журнале.';
  }, [lesson?.homework_json, uiLanguage]);

  const quizItems = useMemo(() => {
    const fromLessonTest = normalizeQuiz(pickLocalized(lesson?.lesson_test_json, uiLanguage));
    if (fromLessonTest.length > 0) return fromLessonTest;

    const fromLegacyQuiz = normalizeQuiz(pickLocalized(lesson?.quiz_json, uiLanguage));
    if (fromLegacyQuiz.length > 0) return fromLegacyQuiz;

    return fallbackQuiz(uiLanguage);
  }, [lesson?.lesson_test_json, lesson?.quiz_json, uiLanguage]);

  const lessonPages = useMemo(() => {
    const fromPageJson = normalizeLessonPages(pickLocalized(lesson?.lesson_pages_json, uiLanguage));
    if (fromPageJson.length > 0) return fromPageJson;

    const fromSteps = fallbackPagesFromSteps(pickLocalized(lesson?.lesson_steps_json, uiLanguage));
    if (fromSteps.length > 0) return fromSteps;

    return [
      {
        page_number: 1,
        page_image: 'page:1',
        page_text: localizedSummary,
        ai_explanation: localizedContent || localizedSummary,
        notes: practical,
        practical_interpretation: practical,
        key_terms: glossary.slice(0, 4).map((item) => item.term),
        common_mistakes: commonMistakes.slice(0, 4),
      },
    ] as LessonPageBlock[];
  }, [lesson?.lesson_pages_json, lesson?.lesson_steps_json, uiLanguage, localizedSummary, localizedContent, practical, glossary, commonMistakes]);

  const pageNumbersKey = useMemo(
    () => lessonPages.map((page) => page.page_number).join(','),
    [lessonPages],
  );

  const ensurePdfBinaryLoaded = useCallback(async (): Promise<boolean> => {
    if (!lesson?.id || !lesson?.pdf_path) return false;
    if (pdfBinaryRef.current) return true;
    if (isLoadingPdf) return false;

    setIsLoadingPdf(true);
    setPageRenderError(null);
    try {
      const response = await api.get(`/courses/lessons/${lesson.id}/pdf`, { responseType: 'arraybuffer' });
      pdfBinaryRef.current = response.data as ArrayBuffer;
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || copy.pageMissing;
      setPageRenderError(message);
      showToast(message);
      return false;
    } finally {
      setIsLoadingPdf(false);
    }
  }, [lesson?.id, lesson?.pdf_path, isLoadingPdf, copy.pageMissing, showToast]);

  const ensurePageImage = useCallback(async (pageNumber: number) => {
    if (!lesson?.pdf_path) return;

    const safePage = Math.max(1, Number(pageNumber) || 1);
    if (pageImageByPageRef.current[safePage]) return;
    if (renderingPagesRef.current.has(safePage)) return;

    const loaded = await ensurePdfBinaryLoaded();
    if (!loaded) return;

    renderingPagesRef.current.add(safePage);
    setIsRenderingPageImage(true);

    try {
      const pdfjs = await import('pdfjs-dist');
      if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      }

      if (!pdfDocumentRef.current) {
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBinaryRef.current as ArrayBuffer) });
        pdfDocumentRef.current = await loadingTask.promise;
      }

      const pdfDoc = pdfDocumentRef.current;
      const totalPages = Number(pdfDoc?.numPages || safePage);
      const boundedPage = Math.max(1, Math.min(totalPages, safePage));

      if (pageImageByPageRef.current[boundedPage]) return;

      const page = await pdfDoc.getPage(boundedPage);
      const viewport = page.getViewport({ scale: 1.32 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas rendering unavailable');

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({ canvasContext: context, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      setPageImageByPage((prev) => {
        if (prev[boundedPage]) return prev;
        const next = { ...prev, [boundedPage]: dataUrl };
        pageImageByPageRef.current = next;
        return next;
      });
    } catch (error: any) {
      const message = error?.message || copy.pageMissing;
      setPageRenderError(message);
      showToast(message);
    } finally {
      renderingPagesRef.current.delete(safePage);
      setIsRenderingPageImage(renderingPagesRef.current.size > 0);
    }
  }, [lesson?.pdf_path, ensurePdfBinaryLoaded, copy.pageMissing, showToast]);

  useEffect(() => {
    if (!lesson?.pdf_path || lessonPages.length === 0) return;
    let cancelled = false;

    const renderAllPages = async () => {
      for (const page of lessonPages) {
        if (cancelled) break;
        await ensurePageImage(page.page_number);
      }
    };

    void renderAllPages();

    return () => {
      cancelled = true;
    };
  }, [lesson?.pdf_path, pageNumbersKey, lessonPages, ensurePageImage]);

  const buildLessonContext = (page?: LessonPageBlock) => {
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
      lessonPages: lessonPages.slice(0, 14),
      glossary,
      practical,
      commonMistakes,
      selfCheckQuestions: selfCheck,
      homework,
      currentPageNumber: page?.page_number,
      currentPageText: page?.page_text,
      currentPageExplanation: page?.ai_explanation,
      currentPageNotes: page?.notes,
      currentPagePractical: page?.practical_interpretation,
    };
  };

  const pushAiWithContext = (prefill: string, page?: LessonPageBlock) => {
    const context = buildLessonContext(page);
    localStorage.setItem('ai_prefill', prefill);
    localStorage.setItem('ai_lesson_context', JSON.stringify(context));
    router.push('/ai');
  };

  const handleAskAi = () => {
    const prefill = [
      copy.askPrefill,
      `Course: ${lesson?.course_title || ''}`,
      `Module: ${lesson?.module_title || ''}`,
      `Lesson: ${lesson?.title || ''}`,
      `Summary: ${localizedSummary}`,
    ].join('\n');
    pushAiWithContext(prefill);
  };

  const handleAskPageQuestion = (page: LessonPageBlock) => {
    const prefill = [
      copy.askPagePrefill,
      `${copy.pageLabel}: ${page.page_number}`,
      `Page text: ${page.page_text}`,
      `Current explanation: ${page.ai_explanation}`,
    ].join('\n');
    pushAiWithContext(prefill, page);
  };

  const markLessonCompleted = async () => {
    if (!lesson?.id || lesson.is_completed || isCompleting) return;

    setIsCompleting(true);
    try {
      await api.post(`/courses/lessons/${lesson.id}/complete`);
      setLesson((prev) => (prev ? { ...prev, is_completed: true, completed_at: new Date().toISOString() } : prev));
      showToast(copy.completionToast);
    } catch (error: any) {
      showToast(error.response?.data?.error || copy.completionError);
    } finally {
      setIsCompleting(false);
    }
  };

  const toggleFavorite = () => {
    if (!lesson?.id) return;
    const key = `lesson_favorite_${lesson.id}`;
    const next = !isFavorite;
    setIsFavorite(next);

    if (next) {
      localStorage.setItem(key, '1');
      showToast(copy.favoriteAdded);
    } else {
      localStorage.removeItem(key);
      showToast(copy.favoriteRemoved);
    }
  };

  const quizScore = useMemo(() => {
    if (!quizSubmitted || quizItems.length === 0) return null;
    let score = 0;
    quizItems.forEach((item, index) => {
      if (Number(quizAnswers[index]) === Number(item.correct_index)) score += 1;
    });
    return score;
  }, [quizSubmitted, quizItems, quizAnswers]);

  const pageStyle: React.CSSProperties = {
    background: '#05070d',
    color: '#e5e7eb',
    fontFamily: 'var(--font-lesson-sans)',
  };

  return (
    <div className={cn(serif.variable, sans.variable, 'min-h-screen')} style={pageStyle}>
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -22 }}
            className="fixed left-1/2 top-4 z-[70] -translate-x-1/2 rounded-xl border px-4 py-2 text-sm"
            style={{ background: '#101621', borderColor: '#223045', color: '#dbeafe' }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ background: 'rgba(5,7,13,0.86)', borderColor: '#1b2535' }}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(lesson ? `/dashboard/courses/${lesson.course_id}` : '/dashboard/academy')}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition"
              style={{ borderColor: '#253349', color: '#d4d4d8' }}
            >
              <ArrowLeft size={15} />
              {copy.backToCourse}
            </button>

            <div className="hidden lg:block">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{copy.heroBadge}</p>
              <p className="text-sm text-slate-200">{lesson?.title || 'Lesson'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center rounded-full border p-1" style={{ borderColor: '#223045' }}>
              <button
                onClick={() => setLanguage('RU')}
                className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold transition', uiLanguage === 'RU' ? 'text-white' : 'text-slate-400')}
                style={uiLanguage === 'RU' ? { background: '#0f766e' } : undefined}
              >
                RU
              </button>
              <button
                onClick={() => setLanguage('UZ')}
                className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold transition', uiLanguage === 'UZ' ? 'text-white' : 'text-slate-400')}
                style={uiLanguage === 'UZ' ? { background: '#0f766e' } : undefined}
              >
                UZ
              </button>
            </div>

            <button
              onClick={markLessonCompleted}
              disabled={!lesson || lesson.is_completed || isCompleting}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: lesson?.is_completed ? '#0e3e35' : '#0f766e', color: '#e6fffb' }}
            >
              {isCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {lesson?.is_completed ? copy.completed : copy.markComplete}
            </button>

            <button
              onClick={handleAskAi}
              disabled={!lesson}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60"
              style={{ borderColor: '#25405a', color: '#bfdbfe' }}
            >
              <Brain size={14} />
              {copy.askAi}
            </button>

            <button
              onClick={toggleFavorite}
              disabled={!lesson}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60"
              style={{ borderColor: isFavorite ? '#8a6c3d' : '#223045', color: isFavorite ? '#facc15' : '#d1d5db' }}
            >
              <Bookmark size={14} />
              {isFavorite ? copy.inFavorite : copy.addFavorite}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 md:px-8 md:pt-10">
        {isLoading ? (
          <div className="mx-auto mt-12 max-w-3xl rounded-3xl border px-8 py-10" style={{ borderColor: '#1b2535', background: '#0b111a' }}>
            <div className="flex items-center gap-3 text-cyan-200">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs font-semibold uppercase tracking-[0.15em]">TradeMentor AI</span>
            </div>
            <h2 className="mt-3 text-3xl" style={{ fontFamily: 'var(--font-lesson-serif)' }}>{copy.loadingTitle}</h2>
            <p className="mt-2 text-sm text-slate-400">{copy.loadingHint}</p>
          </div>
        ) : !lesson ? (
          <div className="mx-auto mt-14 max-w-2xl rounded-3xl border px-8 py-10 text-center" style={{ borderColor: '#1b2535', background: '#0b111a' }}>
            <h2 className="text-3xl" style={{ fontFamily: 'var(--font-lesson-serif)' }}>{copy.lessonNotFound}</h2>
            <p className="mt-2 text-sm text-slate-400">{loadError || copy.lessonNotFoundHint}</p>
          </div>
        ) : (
          <>
            <section className="rounded-3xl border px-6 py-7 md:px-10 md:py-10" style={{ borderColor: '#1b2535', background: 'linear-gradient(180deg, #0b111a 0%, #0a0f17 100%)' }}>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                {lesson.course_title} · {lesson.module_title}
              </p>
              <h1 className="mt-3 text-3xl leading-tight md:text-5xl" style={{ fontFamily: 'var(--font-lesson-serif)' }}>
                {lesson.title}
              </h1>
              <p className="mt-4 max-w-4xl text-base leading-8 text-slate-300 md:text-lg">{localizedSummary}</p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border px-3 py-1" style={{ borderColor: '#204a45', color: '#80e2d4' }}>
                  {copy.source}: {lesson.source_language || 'N/A'}
                </span>
                {lesson.source_section && (
                  <span className="rounded-full border px-3 py-1 text-slate-300" style={{ borderColor: '#243042' }}>
                    {copy.section}: {lesson.source_section}
                  </span>
                )}
                <span className="rounded-full border px-3 py-1 text-slate-300" style={{ borderColor: '#243042' }}>
                  {lesson.lesson_type || 'theory'} · {lesson.difficulty_level || 'Beginner'}
                </span>
                <span className="rounded-full border px-3 py-1 text-slate-300" style={{ borderColor: '#243042' }}>
                  {copy.pageLabel}: {lessonPages.length}
                </span>
              </div>
            </section>

            <section className="mt-8 space-y-10">
              {lessonPages.map((page, index) => {
                const directPageImage = page.page_image && !page.page_image.startsWith('page:') ? page.page_image : '';
                const renderedPageImage = pageImageByPage[page.page_number] || '';
                const pageImage = directPageImage || renderedPageImage;

                const paragraphs = splitIntoParagraphs(page.ai_explanation);
                const notes = parseBullets(page.notes || '', 6);
                const practicalSteps = parsePracticalSteps(page.practical_interpretation || '', 5);
                const terms = Array.isArray(page.key_terms) && page.key_terms.length > 0
                  ? page.key_terms.slice(0, 8)
                  : glossary.slice(0, 6).map((item) => item.term);
                const mistakes = Array.isArray(page.common_mistakes) && page.common_mistakes.length > 0
                  ? page.common_mistakes.slice(0, 6)
                  : commonMistakes.slice(0, 6);

                return (
                  <motion.article
                    key={`lesson-page-${page.page_number}-${index}`}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="rounded-3xl border px-5 py-6 md:px-8 md:py-8"
                    style={{ borderColor: '#1b2535', background: '#0a0f17' }}
                  >
                    <div className="mb-5 flex items-center justify-between gap-3 border-b pb-4" style={{ borderColor: '#1b2535' }}>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
                        {copy.pageLabel} {page.page_number}
                      </p>
                      <button
                        onClick={() => handleAskPageQuestion(page)}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
                        style={{ borderColor: '#2a3b54' }}
                      >
                        <MessageCircleQuestion size={13} />
                        {copy.askPageQuestion}
                      </button>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
                      <figure>
                        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: '#1f2c40', background: '#080d14' }}>
                          {(isLoadingPdf || isRenderingPageImage) && !pageImage && (
                            <div className="px-4 py-3 text-xs text-slate-400">
                              <Loader2 size={12} className="mr-1 inline animate-spin" />
                              {copy.pageLoading}
                            </div>
                          )}

                          {pageImage ? (
                            <img
                              src={pageImage}
                              alt={`Page ${page.page_number}`}
                              className="w-full"
                              style={{ maxHeight: '760px', objectFit: 'contain', background: '#080d14' }}
                            />
                          ) : (
                            <div className="flex min-h-[230px] items-center justify-center px-4 py-6 text-center text-sm text-slate-500">
                              {pageRenderError || copy.pageMissing}
                            </div>
                          )}
                        </div>

                        {page.page_text && (
                          <figcaption className="mt-3 text-sm leading-7 text-slate-400">
                            <span className="mr-1 text-[11px] uppercase tracking-[0.15em] text-slate-500">📌 {copy.source}</span>
                            {page.page_text}
                          </figcaption>
                        )}
                      </figure>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{copy.mentorTitle}</p>
                        <div className="mt-3 space-y-4 text-[16px] leading-8 text-slate-200">
                          {paragraphs.map((paragraph, paragraphIndex) => (
                            <p key={`paragraph-${paragraphIndex}-${paragraph.slice(0, 22)}`}>{paragraph}</p>
                          ))}
                        </div>

                        {notes.length > 0 && (
                          <div className="mt-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{copy.notesTitle}</p>
                            <ul className="mt-2 space-y-1.5">
                              {notes.map((note, noteIndex) => (
                                <li key={`note-${noteIndex}-${note.slice(0, 20)}`} className="text-sm leading-7 text-slate-300">
                                  <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-cyan-300" />
                                  {note}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {practicalSteps.length > 0 && (
                          <div className="mt-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{copy.practicalTitle}</p>
                            <ol className="mt-2 space-y-1.5">
                              {practicalSteps.map((step, stepIndex) => (
                                <li key={`practical-${stepIndex}-${step.slice(0, 20)}`} className="flex gap-3 text-sm leading-7 text-slate-300">
                                  <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-900/50 text-[11px] font-semibold text-emerald-200">
                                    {stepIndex + 1}
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {terms.length > 0 && (
                          <div className="mt-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{copy.termsTitle}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {terms.map((term, termIndex) => (
                                <span
                                  key={`term-${termIndex}-${term}`}
                                  className="rounded-full border px-2.5 py-1 text-xs text-cyan-200"
                                  style={{ borderColor: '#25405a' }}
                                >
                                  {term}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {mistakes.length > 0 && (
                          <div className="mt-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{copy.mistakesTitle}</p>
                            <ul className="mt-2 space-y-1.5">
                              {mistakes.map((mistake, mistakeIndex) => (
                                <li key={`mistake-${mistakeIndex}-${mistake.slice(0, 20)}`} className="text-sm leading-7 text-rose-200">
                                  <span className="mr-2 text-rose-400">⚠️</span>
                                  {mistake}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </section>

            <section className="mt-10 rounded-3xl border px-6 py-7 md:px-10 md:py-10" style={{ borderColor: '#1b2535', background: '#0a0f17' }}>
              <h3 className="text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-lesson-serif)' }}>{copy.quizTitle}</h3>
              <p className="mt-2 text-sm text-slate-400">{copy.quizHint}</p>

              <div className="mt-6 space-y-4">
                {quizItems.map((item, quizIndex) => {
                  const selected = quizAnswers[quizIndex];
                  const isAnswered = typeof selected === 'number';
                  const isCorrect = isAnswered && selected === item.correct_index;

                  return (
                    <div
                      key={`quiz-item-${quizIndex}-${item.question.slice(0, 20)}`}
                      className="rounded-2xl border px-4 py-4"
                      style={{ borderColor: '#1f2c40', background: '#09101a' }}
                    >
                      <p className="text-base font-semibold text-slate-100">{quizIndex + 1}. {item.question}</p>

                      <div className="mt-3 space-y-2">
                        {item.options.map((option, optionIndex) => {
                          const selectedThis = selected === optionIndex;
                          const correctOption = quizSubmitted && optionIndex === item.correct_index;
                          const wrongSelection = quizSubmitted && selectedThis && optionIndex !== item.correct_index;

                          const optionStyle: React.CSSProperties = correctOption
                            ? { borderColor: '#2c8a6f', background: '#083d33', color: '#d1fae5' }
                            : wrongSelection
                              ? { borderColor: '#9f3333', background: '#3b0d14', color: '#fecaca' }
                              : selectedThis
                                ? { borderColor: '#34577f', background: '#102236', color: '#dbeafe' }
                                : { borderColor: '#223045', background: '#0d1724', color: '#d1d5db' };

                          return (
                            <button
                              key={`quiz-item-${quizIndex}-option-${optionIndex}`}
                              onClick={() => {
                                if (quizSubmitted) return;
                                setQuizAnswers((prev) => ({ ...prev, [quizIndex]: optionIndex }));
                              }}
                              className="w-full rounded-xl border px-3 py-2 text-left text-sm transition"
                              style={optionStyle}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <p className="mt-2 text-xs" style={{ color: isCorrect ? '#86efac' : '#fca5a5' }}>
                          {item.explanation || (isCorrect ? 'Correct' : 'Review this question again')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setQuizSubmitted(true)}
                  disabled={quizSubmitted || Object.keys(quizAnswers).length < quizItems.length}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: '#0f766e' }}
                >
                  {copy.checkResult}
                </button>

                <button
                  onClick={() => {
                    setQuizAnswers({});
                    setQuizSubmitted(false);
                  }}
                  className="rounded-full border px-4 py-2 text-sm font-semibold text-slate-200"
                  style={{ borderColor: '#253349' }}
                >
                  {copy.resetQuiz}
                </button>

                {quizSubmitted && typeof quizScore === 'number' ? (
                  <p className="text-sm font-semibold text-emerald-300">
                    {copy.score}: {quizScore}/{quizItems.length}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">{copy.answerAllHint}</p>
                )}
              </div>
            </section>

            <section className="mt-8 rounded-3xl border px-6 py-7 md:px-10 md:py-9" style={{ borderColor: '#1b2535', background: '#0a0f17' }}>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{copy.nextTitle}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={markLessonCompleted}
                  disabled={lesson.is_completed || isCompleting}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: lesson.is_completed ? '#0e3e35' : '#0f766e' }}
                >
                  {isCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {lesson.is_completed ? copy.completed : copy.markComplete}
                </button>

                {lesson.next_lesson_id ? (
                  <button
                    onClick={() => router.push(`/dashboard/lessons/${lesson.next_lesson_id}`)}
                    className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-semibold text-slate-200"
                    style={{ borderColor: '#253349' }}
                  >
                    {copy.nextLesson}
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <p className="text-sm text-slate-400">{copy.noNextLesson}</p>
                )}

                <button
                  onClick={handleAskAi}
                  className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-semibold text-cyan-200"
                  style={{ borderColor: '#25405a' }}
                >
                  <Sparkles size={14} />
                  {copy.askAi}
                </button>
              </div>
            </section>

            <div className="mt-8 flex items-center justify-between text-xs text-slate-500">
              <span>{copy.topLanguage}: {uiLanguage}</span>
              <span>
                <Languages size={12} className="mr-1 inline" />
                TradeMentor AI
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
