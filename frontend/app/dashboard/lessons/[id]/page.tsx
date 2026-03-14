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
  Bookmark,
  Brain,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardCheck,
  FileText,
  Languages,
  Lightbulb,
  ListChecks,
  Loader2,
  LogOut as LogOutIcon,
  NotebookTabs,
  Settings,
  Sparkles,
  Target,
  TriangleAlert,
  User,
} from 'lucide-react';

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
  key_points_json?: any;
  glossary_json?: any;
  practice_notes?: any;
  common_mistakes_json?: any;
  self_check_questions_json?: any;
  homework_json?: any;
  quiz_json?: any;
  lesson_type?: string | null;
  source_section?: string | null;
  difficulty_level?: string | null;
  conclusion_json?: any;
  additional_notes_json?: any;
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

function normalizeText(value: any): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function splitIntoSentences(text: string): string[] {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getLocalizedJsonValue(raw: any, language: UiLanguage): any {
  if (!raw || typeof raw !== 'object') return null;

  const primary = raw[language] ?? raw[language.toLowerCase()];
  if (primary !== undefined && primary !== null) return primary;

  const fallbackLang: UiLanguage = language === 'RU' ? 'UZ' : 'RU';
  const fallback = raw[fallbackLang] ?? raw[fallbackLang.toLowerCase()];
  return fallback ?? null;
}

function fallbackKeyPoints(text: string, language: UiLanguage): string[] {
  const candidates = splitIntoSentences(text)
    .filter((item) => item.length > 20)
    .slice(0, 6);

  if (candidates.length >= 4) return candidates;

  if (language === 'UZ') {
    return [
      'Trend yo\'nalishini aniqlamasdan turib pozitsiya ochmang.',
      'Bitim oldidan kirish, stop-loss va target nuqtalarini aniq yozib chiqing.',
      'Riskni bir bitimga 1-2% diapazonda nazorat qiling.',
      'Likvidlik zonalari va impulsdan oldingi tuzilmani tekshiring.',
      'Signalni kontekstsiz emas, bozor strukturasiga bog\'lab talqin qiling.',
    ];
  }

  return [
    'Не открывайте позицию без подтвержденного направления тренда.',
    'Перед входом фиксируйте точку входа, стоп-лосс и цель.',
    'Держите риск на одну сделку в диапазоне 1-2%.',
    'Проверяйте зоны ликвидности и структуру перед импульсом.',
    'Оценивайте сигнал только в контексте общей рыночной структуры.',
  ];
}

function fallbackGlossary(language: UiLanguage): GlossaryItem[] {
  if (language === 'UZ') {
    return [
      { term: 'Liquidity', definition: 'Bozorda buyurtmalar zich joylashgan hudud, narx ko\'pincha shu nuqtaga qaytadi.' },
      { term: 'Break of Structure', definition: 'Narx oldingi muhim maksimum/minimumni buzib, trend o\'zgarishi yoki davomiyligini ko\'rsatadi.' },
      { term: 'Order Block', definition: 'Yirik ishtirokchilar faolligi ko\'ringan zona, keyingi kirish uchun orientir bo\'ladi.' },
      { term: 'Risk-to-Reward', definition: 'Potensial foyda va zarar nisbatini o\'lchaydi; barqaror natija uchun asosiy metrika.' },
    ];
  }

  return [
    { term: 'Liquidity', definition: 'Зона скопления ордеров, куда цена часто возвращается перед движением.' },
    { term: 'Break of Structure', definition: 'Пробой важного максимума/минимума, подтверждающий смену или продолжение тренда.' },
    { term: 'Order Block', definition: 'Область активности крупных участников рынка, которая часто дает рабочую точку входа.' },
    { term: 'Risk-to-Reward', definition: 'Соотношение потенциальной прибыли к риску, ключевая метрика торговой системы.' },
  ];
}

function fallbackPractice(language: UiLanguage, lessonTitle: string, keyPoints: string[]): string {
  const focusA = keyPoints[0] || (language === 'UZ' ? 'trend yo\'nalishi' : 'направление тренда');
  const focusB = keyPoints[1] || (language === 'UZ' ? 'risk nazorati' : 'контроль риска');

  if (language === 'UZ') {
    return [
      `1) ${lessonTitle} mavzusi bo\'yicha 3 ta chart toping va ${focusA} bo\'yicha belgilab chiqing.`,
      `2) Har bir chart uchun kirish, stop va target rejasini yozing; ${focusB} bo\'yicha xatoni tekshiring.`,
      '3) Bitta setupni replay rejimida qayta ijro qilib, qaysi signal ishlaganini jurnalga kiriting.',
    ].join('\n');
  }

  return [
    `1) Найдите 3 графика по теме "${lessonTitle}" и разметьте их по пункту: ${focusA}.`,
    `2) Для каждого графика пропишите вход, стоп и цель; отдельно проверьте блок: ${focusB}.`,
    '3) Прогоните один сценарий в replay и запишите в журнал, какой сигнал сработал лучше всего.',
  ].join('\n');
}

function fallbackMistakes(language: UiLanguage): string[] {
  if (language === 'UZ') {
    return [
      'Signalni timeframe kontekstisiz qabul qilish.',
      'Stop-lossni kirishdan keyin tizimsiz ko\'chirish.',
      'Qoidalar emas, emotsiya asosida pozitsiya hajmini oshirish.',
      'Likvidlik tozalangandan keyingi tasdiqni kutmasdan kirish.',
    ];
  }

  return [
    'Открывать сделку без контекста старшего таймфрейма.',
    'Хаотично переносить стоп-лосс после входа.',
    'Увеличивать объем позиции на эмоциях, а не по правилам.',
    'Входить до подтверждения после сбора ликвидности.',
  ];
}

function fallbackSelfCheck(language: UiLanguage, keyPoints: string[]): string[] {
  const focusA = keyPoints[0] || (language === 'UZ' ? 'asosiy setup sharti' : 'главное условие сетапа');
  const focusB = keyPoints[1] || (language === 'UZ' ? 'risk qoidasi' : 'правило риска');

  if (language === 'UZ') {
    return [
      `Sizning setupingizda ${focusA} qanday tasdiqlanadi?`,
      `Bitimdan oldin ${focusB} bo\'yicha qaysi chek-list bandini tekshirasiz?`,
      'Agar bozor siz kutgan yo\'nalishga qarshi ketsa, chiqish rejangiz qanday?',
    ];
  }

  return [
    `Как в вашем сетапе подтверждается пункт: ${focusA}?`,
    `Какой пункт чек-листа вы проверяете перед входом по блоку: ${focusB}?`,
    'Какой у вас план выхода, если рынок пошел против сценария?',
  ];
}

function fallbackHomework(language: UiLanguage, lessonTitle: string): string {
  if (language === 'UZ') {
    return [
      `Uyga vazifa (${lessonTitle}):`,
      '- 5 ta tarixiy chart tanlang va setup sifatini 10 ballik shkala bilan baholang.',
      '- Har bir chart uchun xato va to\'g\'ri qarorlarni alohida yozing.',
      '- Ertangi sessiya uchun 1 ta aniq trading rejasi tuzing.',
    ].join('\n');
  }

  return [
    `Домашнее задание (${lessonTitle}):`,
    '- Выберите 5 исторических графиков и оцените качество сетапа по шкале 1-10.',
    '- Для каждого графика отдельно запишите ошибку и правильное решение.',
    '- Подготовьте один конкретный торговый план на следующую сессию.',
  ].join('\n');
}

function fallbackQuiz(language: UiLanguage, keyPoints: string[]): QuizItem[] {
  const focusA = keyPoints[0] || (language === 'UZ' ? 'trend yo\'nalishi' : 'направление тренда');
  const focusB = keyPoints[1] || (language === 'UZ' ? 'risk boshqaruvi' : 'риск-менеджмент');

  if (language === 'UZ') {
    return [
      {
        question: `Setupdan oldin birinchi navbatda nimani tekshirish kerak? (${focusA})`,
        options: ['Faqat signal shamini', 'Kontekst va bozor strukturasi', 'Faqat indikator rangini'],
        correct_index: 1,
        explanation: 'To\'g\'ri javob - kontekst va struktura. Signal alohida holda yetarli emas.',
      },
      {
        question: `${focusB} bo\'yicha eng to\'g\'ri yondashuv qaysi?`,
        options: ['Har safar lotni oshirish', 'Stop yo\'q savdo qilish', 'Riskni oldindan belgilab kirish'],
        correct_index: 2,
        explanation: 'Risk oldindan belgilansa, tizim barqaror ishlaydi va emotsional xatolar kamayadi.',
      },
      {
        question: 'Likvidlik tozalangandan keyin nima qilish kerak?',
        options: ['Darhol impuls ortidan kirish', 'Tasdiq signalini kutish', 'Rejasiz random kirish'],
        correct_index: 1,
        explanation: 'Likvidlikdan keyin tasdiqni kutish false-breakout xavfini kamaytiradi.',
      },
    ];
  }

  return [
    {
      question: `Что проверяется в первую очередь перед входом? (${focusA})`,
      options: ['Только последняя свеча', 'Контекст и структура рынка', 'Только цвет индикатора'],
      correct_index: 1,
      explanation: 'Верно: контекст и структура. Одиночный сигнал без контекста ненадежен.',
    },
    {
      question: `Какой подход к ${focusB} наиболее корректный?`,
      options: ['Постоянно увеличивать объем', 'Торговать без стопа', 'Фиксировать риск до входа'],
      correct_index: 2,
      explanation: 'Риск нужно фиксировать до входа, чтобы стратегия оставалась устойчивой.',
    },
    {
      question: 'Что делать после снятия ликвидности перед импульсом?',
      options: ['Входить сразу вслед за движением', 'Дождаться подтверждающего сигнала', 'Открыть сделку без плана'],
      correct_index: 1,
      explanation: 'Подтверждение после снятия ликвидности снижает вероятность ложного входа.',
    },
  ];
}

function normalizeGlossaryItems(raw: any): GlossaryItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: any) => ({
      term: normalizeText(item?.term),
      definition: normalizeText(item?.definition),
    }))
    .filter((item) => item.term && item.definition)
    .slice(0, 12);
}

function normalizeQuizItems(raw: any): QuizItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: any) => {
      const question = normalizeText(item?.question);
      const options = Array.isArray(item?.options)
        ? item.options.map((opt: any) => normalizeText(opt)).filter(Boolean).slice(0, 6)
        : [];
      const explanation = normalizeText(item?.explanation);
      const correctRaw = Number(item?.correct_index);
      const correct_index = Number.isInteger(correctRaw)
        ? Math.max(0, Math.min(options.length - 1, correctRaw))
        : 0;

      if (!question || options.length < 2) return null;
      return { question, options, correct_index, explanation: explanation || '' } as QuizItem;
    })
    .filter(Boolean)
    .slice(0, 8) as QuizItem[];
}

export default function LessonPage({ params }: { params: { id: string } }) {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [lesson, setLesson] = useState<LessonDetails | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const pdfObjectUrlRef = useRef<string | null>(null);

  const uiLanguage: UiLanguage = language === 'UZ' ? 'UZ' : 'RU';

  const showToast = (message: string) => {
    setToastMessage(message);
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
    return () => {
      if (pdfObjectUrlRef.current) {
        URL.revokeObjectURL(pdfObjectUrlRef.current);
        pdfObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const loadPdf = async () => {
      if (!lesson?.id || !showPdf || !lesson.pdf_path) return;

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
        if (e.response?.status !== 404) {
          showToast(e.response?.data?.error || 'Failed to load PDF');
        }
      } finally {
        setIsLoadingPdf(false);
      }
    };

    loadPdf();
  }, [lesson?.id, lesson?.pdf_path, showPdf]);

  useEffect(() => {
    if (!lesson?.id) return;

    const key = `lesson_favorite_${lesson.id}`;
    const saved = localStorage.getItem(key);
    setIsFavorite(saved === '1');
    setQuizAnswers({});
    setQuizSubmitted(false);
  }, [lesson?.id]);

  const firstName = useMemo(() => {
    if (!user) return '';
    return user.name?.split(' ')[0] || user.name;
  }, [user]);

  const localizedSummary = useMemo(() => {
    if (!lesson) return '';
    if (uiLanguage === 'UZ') {
      return normalizeText(lesson.summary_uz || lesson.summary_ru || lesson.summary);
    }
    return normalizeText(lesson.summary_ru || lesson.summary_uz || lesson.summary);
  }, [lesson, uiLanguage]);

  const localizedExplanation = useMemo(() => {
    if (!lesson) return '';
    if (uiLanguage === 'UZ') {
      return normalizeText(lesson.content_uz || lesson.content_source || lesson.content_ru || lesson.content);
    }
    return normalizeText(lesson.content_ru || lesson.content_source || lesson.content_uz || lesson.content);
  }, [lesson, uiLanguage]);

  const explanationParagraphs = useMemo(() => {
    const source = localizedExplanation || localizedSummary;
    const chunks = String(source || '')
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (chunks.length >= 2) return chunks;

    const bySentence = splitIntoSentences(source);
    if (bySentence.length <= 4) return [source];

    const grouped: string[] = [];
    for (let i = 0; i < bySentence.length; i += 3) {
      grouped.push(bySentence.slice(i, i + 3).join(' '));
    }
    return grouped;
  }, [localizedExplanation, localizedSummary]);

  const keyPoints = useMemo(() => {
    const fromDb = getLocalizedJsonValue(lesson?.key_points_json, uiLanguage);
    const normalized = Array.isArray(fromDb)
      ? fromDb.map((item) => normalizeText(item)).filter(Boolean).slice(0, 10)
      : [];

    return normalized.length > 0
      ? normalized
      : fallbackKeyPoints(localizedExplanation || localizedSummary, uiLanguage);
  }, [lesson?.key_points_json, localizedExplanation, localizedSummary, uiLanguage]);

  const glossary = useMemo(() => {
    const fromDb = getLocalizedJsonValue(lesson?.glossary_json, uiLanguage);
    const normalized = normalizeGlossaryItems(fromDb);
    return normalized.length > 0 ? normalized : fallbackGlossary(uiLanguage);
  }, [lesson?.glossary_json, uiLanguage]);

  const practicalApplication = useMemo(() => {
    const fromDb = getLocalizedJsonValue(lesson?.practice_notes, uiLanguage);
    const normalized = normalizeText(fromDb);
    return normalized || fallbackPractice(uiLanguage, lesson?.title || 'Lesson', keyPoints);
  }, [lesson?.practice_notes, lesson?.title, keyPoints, uiLanguage]);

  const commonMistakes = useMemo(() => {
    const fromDb = getLocalizedJsonValue(lesson?.common_mistakes_json, uiLanguage);
    const normalized = Array.isArray(fromDb)
      ? fromDb.map((item) => normalizeText(item)).filter(Boolean).slice(0, 10)
      : [];

    return normalized.length > 0 ? normalized : fallbackMistakes(uiLanguage);
  }, [lesson?.common_mistakes_json, uiLanguage]);

  const rememberItems = useMemo(() => {
    const conclusionRaw = normalizeText(getLocalizedJsonValue(lesson?.conclusion_json, uiLanguage));
    const additionalRaw = normalizeText(getLocalizedJsonValue(lesson?.additional_notes_json, uiLanguage));

    const fromText = [
      ...splitIntoSentences(conclusionRaw),
      ...splitIntoSentences(additionalRaw),
    ]
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);

    if (fromText.length > 0) return fromText;
    return keyPoints.slice(0, 4);
  }, [lesson?.additional_notes_json, lesson?.conclusion_json, keyPoints, uiLanguage]);

  const selfCheckQuestions = useMemo(() => {
    const fromDb = getLocalizedJsonValue(lesson?.self_check_questions_json, uiLanguage);
    const normalized = Array.isArray(fromDb)
      ? fromDb.map((item) => normalizeText(item)).filter(Boolean).slice(0, 8)
      : [];

    return normalized.length > 0 ? normalized : fallbackSelfCheck(uiLanguage, keyPoints);
  }, [lesson?.self_check_questions_json, keyPoints, uiLanguage]);

  const homework = useMemo(() => {
    const fromDb = getLocalizedJsonValue(lesson?.homework_json, uiLanguage);
    const normalized = normalizeText(fromDb);
    return normalized || fallbackHomework(uiLanguage, lesson?.title || 'Lesson');
  }, [lesson?.homework_json, lesson?.title, uiLanguage]);

  const quizItems = useMemo(() => {
    const fromDb = getLocalizedJsonValue(lesson?.quiz_json, uiLanguage);
    const normalized = normalizeQuizItems(fromDb);
    return normalized.length > 0 ? normalized : fallbackQuiz(uiLanguage, keyPoints);
  }, [lesson?.quiz_json, keyPoints, uiLanguage]);

  const learningSteps = useMemo(() => {
    return keyPoints.slice(0, 5).map((item, index) => ({
      index: index + 1,
      text: item,
    }));
  }, [keyPoints]);

  const askAiPrompt = useMemo(() => {
    if (!lesson) return '';

    const promptLines = [
      uiLanguage === 'UZ'
        ? 'Ushbu darsni professional mentor sifatida tushuntiring va amaliy plan bering.'
        : 'Разбери этот урок как профессиональный ментор и дай практический план.',
      '',
      `Course: ${lesson.course_title}`,
      `Module: ${lesson.module_title}`,
      `Lesson: ${lesson.title}`,
      `Lesson type: ${lesson.lesson_type || 'theory'}`,
      `Difficulty: ${lesson.difficulty_level || 'Beginner'}`,
      `Summary: ${localizedSummary}`,
      '',
      'Key points:',
      ...keyPoints.slice(0, 6).map((item, idx) => `${idx + 1}. ${item}`),
      '',
      'Common mistakes:',
      ...commonMistakes.slice(0, 4).map((item, idx) => `${idx + 1}. ${item}`),
      '',
      'Practical block:',
      practicalApplication,
      '',
      'Homework:',
      homework,
      '',
      'Lesson content:',
      localizedExplanation.slice(0, 5000),
    ];

    return promptLines.join('\n');
  }, [
    lesson,
    uiLanguage,
    localizedSummary,
    keyPoints,
    commonMistakes,
    practicalApplication,
    homework,
    localizedExplanation,
  ]);

  const quizScore = useMemo(() => {
    if (!quizSubmitted || quizItems.length === 0) return null;

    let score = 0;
    quizItems.forEach((item, idx) => {
      if (Number(quizAnswers[idx]) === Number(item.correct_index)) score += 1;
    });
    return score;
  }, [quizSubmitted, quizItems, quizAnswers]);

  const markLessonCompleted = async () => {
    if (!lesson?.id || lesson.is_completed || isCompleting) return;

    setIsCompleting(true);
    try {
      await api.post(`/courses/lessons/${lesson.id}/complete`);
      setLesson((prev) => (prev ? { ...prev, is_completed: true, completed_at: new Date().toISOString() } : prev));
      showToast(uiLanguage === 'UZ' ? 'Dars tugallandi' : 'Урок отмечен как завершенный');
    } catch (e: any) {
      showToast(e.response?.data?.error || (uiLanguage === 'UZ' ? 'Saqlashda xatolik' : 'Не удалось отметить урок'));
    } finally {
      setIsCompleting(false);
    }
  };

  const toggleFavorite = () => {
    if (!lesson?.id) return;

    const key = `lesson_favorite_${lesson.id}`;
    const next = !isFavorite;

    setIsFavorite(next);
    if (next) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);

    showToast(next
      ? (uiLanguage === 'UZ' ? 'Dars sevimlilarga qo\'shildi' : 'Урок добавлен в избранное')
      : (uiLanguage === 'UZ' ? 'Dars sevimlilardan olib tashlandi' : 'Урок удален из избранного'));
  };

  const togglePdf = () => {
    if (!lesson?.pdf_path) {
      showToast(uiLanguage === 'UZ' ? 'Bu darsda PDF biriktirilmagan' : 'У этого урока нет прикрепленного PDF');
      return;
    }
    setShowPdf((prev) => !prev);
  };

  const lessonTypeLabel = useMemo(() => {
    const raw = normalizeText(lesson?.lesson_type).toLowerCase();
    if (uiLanguage === 'UZ') {
      if (raw === 'strategy') return 'Strategiya';
      if (raw === 'chart') return 'Chart tahlili';
      if (raw === 'glossary') return 'Terminlar';
      if (raw === 'psychology') return 'Psixologiya';
      return 'Nazariya';
    }
    if (raw === 'strategy') return 'Стратегия';
    if (raw === 'chart') return 'Разбор графика';
    if (raw === 'glossary') return 'Терминология';
    if (raw === 'psychology') return 'Психология';
    return 'Теория';
  }, [lesson?.lesson_type, uiLanguage]);

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
            <Sparkles size={14} />
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
              className={cn('px-2 py-1 rounded-lg text-[10px] font-bold transition-all', language === 'RU' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300')}
            >
              RU
            </button>
            <button
              onClick={() => setLanguage('UZ')}
              className={cn('px-2 py-1 rounded-lg text-[10px] font-bold transition-all', language === 'UZ' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300')}
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
        <div className="mb-6">
          <button
            onClick={() => (lesson ? router.push(`/dashboard/courses/${lesson.course_id}`) : router.push('/dashboard/academy'))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.2)', color: '#A87BFF' }}
          >
            <ArrowLeft size={16} /> {t('common.back')}
          </button>
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
          <div className="space-y-5">
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl p-6 md:p-7"
              style={{
                background: 'linear-gradient(135deg, rgba(123,63,228,0.22) 0%, rgba(42,169,255,0.12) 55%, rgba(11,18,32,0.92) 100%)',
                border: '1px solid rgba(123,63,228,0.3)',
                boxShadow: '0 20px 60px rgba(13, 18, 36, 0.45)',
              }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="max-w-3xl">
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#9AB1D2' }}>
                    {lesson.course_title} · {lesson.module_title}
                  </p>
                  <h1 className="text-3xl md:text-4xl font-black mt-2 leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
                    {lesson.title}
                  </h1>
                  <p className="mt-3 text-sm md:text-base" style={{ color: '#D5E2F4' }}>
                    {localizedSummary}
                  </p>
                </div>

                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(8, 14, 30, 0.55)', border: '1px solid rgba(123,63,228,0.2)' }}>
                  <p className="text-xs" style={{ color: '#8EA1BF' }}>
                    {uiLanguage === 'UZ' ? 'Holat' : 'Статус'}
                  </p>
                  <p className="text-sm font-bold mt-1" style={{ color: lesson.is_completed ? '#6EE7B7' : '#C6ADFF' }}>
                    {lesson.is_completed
                      ? (uiLanguage === 'UZ' ? 'Tugallangan' : 'Завершен')
                      : (uiLanguage === 'UZ' ? 'Jarayonda' : 'В процессе')}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ background: 'rgba(42,169,255,0.12)', border: '1px solid rgba(42,169,255,0.28)', color: '#67D5FF' }}>
                  {lessonTypeLabel}
                </span>
                <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.26)', color: '#6EE7B7' }}>
                  {lesson.difficulty_level || 'Beginner'}
                </span>
                <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ background: 'rgba(123,63,228,0.12)', border: '1px solid rgba(123,63,228,0.25)', color: '#C6ADFF' }}>
                  <Languages size={12} className="inline mr-1" />
                  {uiLanguage === 'UZ' ? 'Manba' : 'Источник'}: {lesson.source_language || 'UNKNOWN'}
                </span>
                {lesson.source_section && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(123,140,166,0.28)', color: '#B8C8DE' }}>
                    {lesson.source_section}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mt-5">
                <button
                  onClick={markLessonCompleted}
                  disabled={lesson.is_completed || isCompleting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.35)', color: '#6EE7B7' }}
                >
                  {isCompleting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {lesson.is_completed
                    ? (uiLanguage === 'UZ' ? 'Tugallangan' : 'Завершено')
                    : (uiLanguage === 'UZ' ? 'Mark complete' : 'Mark complete')}
                </button>

                <button
                  onClick={() => {
                    localStorage.setItem('ai_prefill', askAiPrompt);
                    localStorage.setItem('ai_lesson_context', JSON.stringify({
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
                      lessonContent: localizedExplanation.slice(0, 5000),
                      keyPoints,
                      glossary,
                      practice: practicalApplication,
                      commonMistakes,
                      selfCheckQuestions,
                      homework,
                    }));
                    router.push('/ai');
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)', boxShadow: '0 6px 24px rgba(123,63,228,0.35)' }}
                >
                  <Brain size={15} /> {t('common.askAI')}
                </button>

                <button
                  onClick={togglePdf}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: '#111A2F', border: '1px solid rgba(42,169,255,0.32)', color: '#67D5FF' }}
                >
                  <FileText size={15} />
                  {showPdf
                    ? (uiLanguage === 'UZ' ? 'PDF ni yashirish' : 'Скрыть PDF')
                    : (uiLanguage === 'UZ' ? 'Original PDF ochish' : 'Открыть оригинальный PDF')}
                </button>

                <button
                  onClick={toggleFavorite}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: isFavorite ? 'rgba(250,204,21,0.14)' : '#111A2F',
                    border: `1px solid ${isFavorite ? 'rgba(250,204,21,0.4)' : 'rgba(123,140,166,0.25)'}`,
                    color: isFavorite ? '#FDE68A' : '#D5E2F4',
                  }}
                >
                  <Bookmark size={15} />
                  {isFavorite
                    ? (uiLanguage === 'UZ' ? 'Sevimli dars' : 'В избранном')
                    : (uiLanguage === 'UZ' ? 'Sevimlilarga qo\'shish' : 'Добавить в избранное')}
                </button>
              </div>

              {lesson.next_lesson_id && (
                <button
                  onClick={() => router.push(`/dashboard/lessons/${lesson.next_lesson_id}`)}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(123,63,228,0.18)', border: '1px solid rgba(123,63,228,0.35)', color: '#D8CCFF' }}
                >
                  {uiLanguage === 'UZ' ? 'Keyingi darsga o\'tish' : 'Перейти к следующему уроку'}
                  <ChevronRight size={14} />
                </button>
              )}
            </motion.section>

            <section className="glass-card p-6" style={{ border: '1px solid rgba(123,63,228,0.15)' }}>
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#BBA5FF' }}>
                <BrainCircuit size={13} className="inline mr-1" />
                {uiLanguage === 'UZ' ? '1) Asosiy tushuntirish' : '1) Основное объяснение'}
              </p>
              <div className="mt-4 space-y-3">
                {explanationParagraphs.map((paragraph, idx) => (
                  <p key={`${idx}-${paragraph.slice(0, 32)}`} className="text-sm leading-7" style={{ color: '#D5E2F4' }}>
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="mt-5 rounded-xl p-4" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(42,169,255,0.2)' }}>
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#67D5FF' }}>
                  <Target size={13} className="inline mr-1" />
                  {uiLanguage === 'UZ' ? 'Step-by-step learning path' : 'Пошаговый learning path'}
                </p>
                <ul className="mt-3 space-y-2">
                  {learningSteps.map((step) => (
                    <li key={`step-${step.index}`} className="text-sm" style={{ color: '#D5E2F4' }}>
                      <span className="text-[#67D5FF] font-black mr-2">{step.index}.</span>
                      {step.text}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="glass-card p-6" style={{ border: '1px solid rgba(123,63,228,0.15)' }}>
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#C6ADFF' }}>
                <ListChecks size={13} className="inline mr-1" />
                {uiLanguage === 'UZ' ? '2) Asosiy nuqtalar' : '2) Ключевые пункты'}
              </p>
              <ul className="mt-4 space-y-2">
                {keyPoints.map((point, idx) => (
                  <li key={`key-${idx}-${point.slice(0, 24)}`} className="text-sm leading-6" style={{ color: '#D5E2F4' }}>
                    <span className="text-[#A87BFF] font-black mr-2">{idx + 1}.</span>
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass-card p-6" style={{ border: '1px solid rgba(42,169,255,0.2)' }}>
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#67D5FF' }}>
                <NotebookTabs size={13} className="inline mr-1" />
                {uiLanguage === 'UZ' ? '3) Terminlar / Glossary' : '3) Термины / Glossary'}
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {glossary.map((item, idx) => (
                  <div key={`term-${idx}-${item.term}`} className="rounded-xl p-3" style={{ background: 'rgba(11,18,32,0.5)', border: '1px solid rgba(42,169,255,0.15)' }}>
                    <p className="text-sm font-semibold text-white">{item.term}</p>
                    <p className="text-xs mt-1 leading-5" style={{ color: '#CDE0F8' }}>{item.definition}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-card p-6" style={{ border: '1px solid rgba(16,185,129,0.25)' }}>
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#6EE7B7' }}>
                <Lightbulb size={13} className="inline mr-1" />
                {uiLanguage === 'UZ' ? '4) Amaliy qo\'llash' : '4) Практическое применение'}
              </p>
              <p className="text-sm mt-4 whitespace-pre-wrap leading-7" style={{ color: '#D5FBEA' }}>
                {practicalApplication}
              </p>
            </section>

            <section className="glass-card p-6" style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#FCA5A5' }}>
                <TriangleAlert size={13} className="inline mr-1" />
                {uiLanguage === 'UZ' ? '5) Keng tarqalgan xatolar' : '5) Частые ошибки'}
              </p>
              <ul className="mt-4 space-y-2">
                {commonMistakes.map((item, idx) => (
                  <li key={`mist-${idx}-${item.slice(0, 24)}`} className="text-sm leading-6" style={{ color: '#FECACA' }}>
                    <span className="font-black mr-2">{idx + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass-card p-6" style={{ border: '1px solid rgba(99,102,241,0.28)' }}>
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#A5B4FC' }}>
                <CheckCircle2 size={13} className="inline mr-1" />
                {uiLanguage === 'UZ' ? '6) Nimani eslab qolish kerak' : '6) Что нужно запомнить'}
              </p>
              <ul className="mt-4 space-y-2">
                {rememberItems.map((item, idx) => (
                  <li key={`remember-${idx}-${item.slice(0, 24)}`} className="text-sm leading-6" style={{ color: '#D6DBFF' }}>
                    <span className="font-black mr-2">{idx + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass-card p-6" style={{ border: '1px solid rgba(14,165,233,0.28)' }}>
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#7DD3FC' }}>
                <ClipboardCheck size={13} className="inline mr-1" />
                {uiLanguage === 'UZ' ? '7) Self-check savollar' : '7) Вопросы для самопроверки'}
              </p>
              <ul className="mt-4 space-y-2">
                {selfCheckQuestions.map((item, idx) => (
                  <li key={`check-${idx}-${item.slice(0, 24)}`} className="text-sm leading-6" style={{ color: '#D8F2FF' }}>
                    <span className="font-black mr-2">{idx + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass-card p-6" style={{ border: '1px solid rgba(234,179,8,0.28)' }}>
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#FACC15' }}>
                <Target size={13} className="inline mr-1" />
                {uiLanguage === 'UZ' ? '8) Uyga vazifa / practical task' : '8) Домашнее задание / practical task'}
              </p>
              <p className="text-sm mt-4 whitespace-pre-wrap leading-7" style={{ color: '#FDE68A' }}>
                {homework}
              </p>
            </section>

            <section className="glass-card p-6" style={{ border: '1px solid rgba(16,185,129,0.26)' }}>
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#34D399' }}>
                <Brain size={13} className="inline mr-1" />
                {uiLanguage === 'UZ' ? '9) Mini quiz (interaktiv)' : '9) Мини-квиз (интерактивный)'}
              </p>

              <div className="mt-4 space-y-4">
                {quizItems.map((item, idx) => {
                  const selected = quizAnswers[idx];
                  const isAnswered = typeof selected === 'number';
                  const isCorrect = isAnswered && selected === item.correct_index;

                  return (
                    <div key={`quiz-${idx}-${item.question.slice(0, 24)}`} className="rounded-xl p-4" style={{ background: 'rgba(11,18,32,0.5)', border: '1px solid rgba(16,185,129,0.18)' }}>
                      <p className="text-sm font-semibold text-white">{idx + 1}. {item.question}</p>

                      <div className="mt-3 space-y-2">
                        {item.options.map((option, optionIdx) => {
                          const selectedThis = selected === optionIdx;
                          const isCorrectOption = quizSubmitted && optionIdx === item.correct_index;
                          const isWrongSelection = quizSubmitted && selectedThis && optionIdx !== item.correct_index;

                          return (
                            <button
                              key={`quiz-opt-${idx}-${optionIdx}`}
                              onClick={() => {
                                if (quizSubmitted) return;
                                setQuizAnswers((prev) => ({ ...prev, [idx]: optionIdx }));
                              }}
                              className="w-full text-left rounded-lg px-3 py-2 text-sm transition-all"
                              style={isCorrectOption
                                ? { background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.42)', color: '#6EE7B7' }
                                : isWrongSelection
                                  ? { background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.42)', color: '#FCA5A5' }
                                  : selectedThis
                                    ? { background: 'rgba(123,63,228,0.2)', border: '1px solid rgba(123,63,228,0.4)', color: '#E4D8FF' }
                                    : { background: '#111A2F', border: '1px solid rgba(123,140,166,0.25)', color: '#D5E2F4' }}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <p className="text-xs mt-3" style={{ color: isCorrect ? '#6EE7B7' : '#FECACA' }}>
                          {item.explanation || (isCorrect
                            ? (uiLanguage === 'UZ' ? 'To\'g\'ri javob.' : 'Правильный ответ.')
                            : (uiLanguage === 'UZ' ? 'Javobni qayta ko\'rib chiqing.' : 'Проверьте ответ еще раз.'))}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setQuizSubmitted(true)}
                  disabled={quizSubmitted || Object.keys(quizAnswers).length < quizItems.length}
                  className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#ECFDF5' }}
                >
                  {uiLanguage === 'UZ' ? 'Natijani tekshirish' : 'Проверить результат'}
                </button>

                <button
                  onClick={() => {
                    setQuizAnswers({});
                    setQuizSubmitted(false);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-bold"
                  style={{ background: '#111A2F', border: '1px solid rgba(123,140,166,0.25)', color: '#C8D4E8' }}
                >
                  {uiLanguage === 'UZ' ? 'Qayta boshlash' : 'Сбросить'}
                </button>

                {quizSubmitted && typeof quizScore === 'number' && (
                  <p className="text-sm font-bold" style={{ color: '#6EE7B7' }}>
                    {uiLanguage === 'UZ'
                      ? `Natija: ${quizScore}/${quizItems.length}`
                      : `Результат: ${quizScore}/${quizItems.length}`}
                  </p>
                )}

                <div className="ml-auto space-y-1">
                  {quizItems.map((_, idx) => {
                    const answered = typeof quizAnswers[idx] === 'number';
                    return (
                      <div key={`quiz-status-${idx}`} className="text-xs flex items-center gap-2" style={{ color: answered ? '#6EE7B7' : '#7B8CA6' }}>
                        {answered ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                        {uiLanguage === 'UZ' ? `Savol ${idx + 1}` : `Вопрос ${idx + 1}`}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="glass-card overflow-hidden" style={{ border: '1px solid rgba(123,63,228,0.15)' }}>
              <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(123,63,228,0.12)', background: 'rgba(11,18,32,0.4)' }}>
                <div className="flex items-center gap-2">
                  <FileText size={16} style={{ color: '#67D5FF' }} />
                  <span className="text-sm font-bold text-white">
                    {uiLanguage === 'UZ' ? '10) Optional original PDF' : '10) Optional original PDF'}
                  </span>
                </div>

                <button
                  onClick={togglePdf}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: 'rgba(17,26,47,0.85)', border: '1px solid rgba(42,169,255,0.3)', color: '#67D5FF' }}
                >
                  {showPdf
                    ? (uiLanguage === 'UZ' ? 'Yashirish' : 'Скрыть')
                    : (uiLanguage === 'UZ' ? 'Ochish' : 'Открыть')}
                </button>
              </div>

              {showPdf && (
                <div style={{ background: '#0A1020' }}>
                  {isLoadingPdf && (
                    <div className="px-4 py-3 text-xs flex items-center gap-2" style={{ color: '#7B8CA6' }}>
                      <Loader2 size={13} className="animate-spin" /> Loading PDF...
                    </div>
                  )}

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
                        {uiLanguage === 'UZ'
                          ? 'Bu dars uchun original PDF mavjud emas.'
                          : 'Для этого урока оригинальный PDF пока недоступен.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
