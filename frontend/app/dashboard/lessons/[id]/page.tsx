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
  Bookmark,
  BookOpen,
  Brain,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  Languages,
  Layers,
  Loader2,
  LogOut as LogOutIcon,
  NotebookTabs,
  Settings,
  Sparkles,
  Target,
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

type LessonStep = {
  step_id: string;
  step_type: 'intro' | 'visual' | 'concept' | 'practice' | 'takeaway' | 'quiz';
  title: string;
  source_excerpt: string;
  explanation: string;
  what_to_notice: string;
  visual_hint: string;
  page_from: number;
  page_to: number;
};

type VisualBlock = {
  step_id: string;
  page_from: number;
  page_to: number;
  visual_kind: 'page_fragment' | 'diagram' | 'image' | 'none';
  caption_ru: string;
  caption_uz: string;
  importance_ru: string;
  importance_uz: string;
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

function splitSentences(text: string): string[] {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getLocalizedJsonValue(raw: any, language: UiLanguage): any {
  if (!raw || typeof raw !== 'object') return null;
  return raw[language] ?? raw[language.toLowerCase()] ?? raw[language === 'RU' ? 'UZ' : 'RU'] ?? raw[language === 'RU' ? 'uz' : 'ru'] ?? null;
}

function normalizeGlossary(raw: any): GlossaryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => ({
      term: normalizeText(item?.term),
      definition: normalizeText(item?.definition),
    }))
    .filter((item: GlossaryItem) => item.term && item.definition)
    .slice(0, 12);
}

function normalizeQuiz(raw: any): QuizItem[] {
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
      return { question, options, correct_index, explanation } as QuizItem;
    })
    .filter(Boolean)
    .slice(0, 8) as QuizItem[];
}

function normalizeSteps(raw: any): LessonStep[] {
  if (!Array.isArray(raw)) return [];

  const normalizeType = (value: any): LessonStep['step_type'] => {
    const type = String(value || '').toLowerCase();
    if (type === 'visual') return 'visual';
    if (type === 'concept') return 'concept';
    if (type === 'practice') return 'practice';
    if (type === 'takeaway') return 'takeaway';
    if (type === 'quiz') return 'quiz';
    return 'intro';
  };

  return raw
    .map((item: any, index: number) => {
      const pageFromRaw = Number(item?.page_from);
      const pageToRaw = Number(item?.page_to);
      const page_from = Number.isInteger(pageFromRaw) ? Math.max(1, pageFromRaw) : 1;
      const page_to = Number.isInteger(pageToRaw) ? Math.max(page_from, pageToRaw) : page_from;

      return {
        step_id: normalizeText(item?.step_id || `step_${index + 1}`),
        step_type: normalizeType(item?.step_type),
        title: normalizeText(item?.title),
        source_excerpt: normalizeText(item?.source_excerpt),
        explanation: normalizeText(item?.explanation),
        what_to_notice: normalizeText(item?.what_to_notice),
        visual_hint: normalizeText(item?.visual_hint),
        page_from,
        page_to,
      } as LessonStep;
    })
    .filter((item) => item.title && item.explanation)
    .slice(0, 12);
}

function normalizeVisualBlocks(raw: any): VisualBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => ({
      step_id: normalizeText(item?.step_id),
      page_from: Math.max(1, Number(item?.page_from) || 1),
      page_to: Math.max(Math.max(1, Number(item?.page_from) || 1), Number(item?.page_to) || Number(item?.page_from) || 1),
      visual_kind: String(item?.visual_kind || 'page_fragment') as VisualBlock['visual_kind'],
      caption_ru: normalizeText(item?.caption_ru),
      caption_uz: normalizeText(item?.caption_uz),
      importance_ru: normalizeText(item?.importance_ru),
      importance_uz: normalizeText(item?.importance_uz),
    }))
    .filter((item: VisualBlock) => item.step_id)
    .slice(0, 10);
}

function fallbackKeyPoints(language: UiLanguage): string[] {
  if (language === 'UZ') {
    return [
      "Trend va bozor strukturasi tasdig'isiz kirish qilmang.",
      "Riskni bitimdan oldin belgilab, stop va targetni yozing.",
      "Likvidlik tozalangandan keyin tasdiq signalini kuting.",
      "Signalni doim timeframe kontekstida baholang.",
    ];
  }
  return [
    'Не входите без подтверждения тренда и структуры рынка.',
    'Фиксируйте риск, стоп и цель до открытия позиции.',
    'После снятия ликвидности ждите подтверждающий сигнал.',
    'Оценивайте сигнал только в контексте таймфрейма.',
  ];
}

function fallbackGlossary(language: UiLanguage): GlossaryItem[] {
  if (language === 'UZ') {
    return [
      { term: 'Liquidity', definition: "Bozorda buyurtmalar to'plangan hudud." },
      { term: 'Break of Structure', definition: "Muhim maksimum/minimum buzilishi orqali struktura o'zgarishi." },
      { term: 'Order Block', definition: "Yirik ishtirokchilar izi ko'rinadigan zona." },
    ];
  }
  return [
    { term: 'Liquidity', definition: 'Зона концентрации ордеров перед импульсом цены.' },
    { term: 'Break of Structure', definition: 'Пробой ключевого экстремума, подтверждающий смену структуры.' },
    { term: 'Order Block', definition: 'Область активности крупных участников для потенциального входа.' },
  ];
}

function fallbackQuiz(language: UiLanguage): QuizItem[] {
  if (language === 'UZ') {
    return [
      {
        question: "Setupdan oldin birinchi navbatda nimani tekshirish kerak?",
        options: ['Faqat indikator', 'Kontekst va struktura', 'Faqat bitta sham'],
        correct_index: 1,
        explanation: "To'g'ri javob: kontekst va struktura. Signalni alohida ko'rish yetarli emas.",
      },
      {
        question: "Risk management bo'yicha to'g'ri yondashuv qaysi?",
        options: ["Lotni his-tuyg'u bilan oshirish", 'Riskni oldindan belgilash', 'Stop-losssiz savdo'],
        correct_index: 1,
        explanation: "Risk oldindan belgilansa, strategiya barqaror bo'ladi.",
      },
      {
        question: "Likvidlikdan keyin qanday harakat to'g'ri?",
        options: ['Darhol kirish', 'Tasdiq signalini kutish', 'Rejasiz kirish'],
        correct_index: 1,
        explanation: 'Tasdiq signalini kutish false entry ehtimolini kamaytiradi.',
      },
    ];
  }

  return [
    {
      question: 'Что нужно проверить в первую очередь перед входом?',
      options: ['Только индикатор', 'Контекст и структуру', 'Только одну свечу'],
      correct_index: 1,
      explanation: 'Верно: контекст и структура. Сигнал сам по себе недостаточен.',
    },
    {
      question: 'Какой подход к risk management корректный?',
      options: ['Повышать объем по эмоциям', 'Фиксировать риск заранее', 'Торговать без стопа'],
      correct_index: 1,
      explanation: 'Риск должен быть определен до открытия позиции.',
    },
    {
      question: 'Как действовать после снятия ликвидности?',
      options: ['Входить сразу', 'Ждать подтверждение', 'Открывать сделку без плана'],
      correct_index: 1,
      explanation: 'Подтверждение снижает вероятность ложного входа.',
    },
  ];
}

function buildFallbackSteps(
  language: UiLanguage,
  summary: string,
  explanation: string,
  practical: string,
  remember: string,
  quizCount: number,
): LessonStep[] {
  if (language === 'UZ') {
    return [
      {
        step_id: 'step_1_intro',
        step_type: 'intro',
        title: 'Step 1: Kirish',
        source_excerpt: summary,
        explanation: "Bu darsning maqsadi va asosiy g'oyasi.",
        what_to_notice: "Kontekst va setup mantiqini birga o'rganing.",
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_2_visual',
        step_type: 'visual',
        title: 'Step 2: Kitob fragmenti + AI explanation',
        source_excerpt: summary,
        explanation: "Vizual fragment orqali muhim signal va struktura talqin qilinadi.",
        what_to_notice: "Qaysi zona va qaysi tasdiq signal ishlaganini belgilang.",
        visual_hint: 'Sahifa fragmentida setupning trigger nuqtasini toping.',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_3_concept',
        step_type: 'concept',
        title: 'Step 3: Key concepts',
        source_excerpt: explanation.slice(0, 320),
        explanation: "Asosiy terminlar va bozor mantiqi ketma-ket tushuntiriladi.",
        what_to_notice: "Signalni har doim timeframe kontekstida baholang.",
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_4_practice',
        step_type: 'practice',
        title: 'Step 4: Practical interpretation',
        source_excerpt: practical,
        explanation: "Nazariyani real trading executionga aylantiring.",
        what_to_notice: "Kirish-stop-target rejasi oldindan yozilgan bo'lishi kerak.",
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_5_takeaway',
        step_type: 'takeaway',
        title: 'Step 5: Key takeaways',
        source_excerpt: remember,
        explanation: "Darsning asosiy xulosalari va xatolarni oldini olish qoidalari.",
        what_to_notice: "Bir xil xatoni qaytarmaslik uchun checklist tuzing.",
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_6_quiz',
        step_type: 'quiz',
        title: 'Step 6: Mini test',
        source_excerpt: summary,
        explanation: `${quizCount} ta savol darsni tushunganingizni tekshiradi.`,
        what_to_notice: "Javob berishda darsdagi setup mantiqiga qayting.",
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_7_next',
        step_type: 'takeaway',
        title: 'Step 7: Next lesson',
        source_excerpt: summary,
        explanation: "Current lessonni yakunlab, keyingi bo'limga o'ting.",
        what_to_notice: "Mark complete tugmasini bosing va keyingi lessonni oching.",
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
    ];
  }

  return [
    {
      step_id: 'step_1_intro',
      step_type: 'intro',
      title: 'Step 1: Intro',
      source_excerpt: summary,
      explanation: 'О чем этот урок и какая у него практическая цель.',
      what_to_notice: 'Сразу фиксируйте контекст и торговую логику.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_2_visual',
      step_type: 'visual',
      title: 'Step 2: Book fragment + AI explanation',
      source_excerpt: summary,
      explanation: 'Визуальный фрагмент книги объясняется как рабочий торговый сценарий.',
      what_to_notice: 'Выделите зону, триггер входа и подтверждение.',
      visual_hint: 'Найдите на странице ключевой визуальный сигнал.',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_3_concept',
      step_type: 'concept',
      title: 'Step 3: Key concepts',
      source_excerpt: explanation.slice(0, 320),
      explanation: 'Ключевые термины и структура рынка раскрываются последовательно.',
      what_to_notice: 'Оценивайте сигнал только в контексте таймфрейма.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_4_practice',
      step_type: 'practice',
      title: 'Step 4: Practical interpretation',
      source_excerpt: practical,
      explanation: 'Как применить идею урока в реальном трейдинге.',
      what_to_notice: 'План входа, стопа и цели должен быть сформирован до сделки.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_5_takeaway',
      step_type: 'takeaway',
      title: 'Step 5: Key takeaways',
      source_excerpt: remember,
      explanation: 'Что нужно запомнить и какие ошибки не повторять.',
      what_to_notice: 'Соберите краткий checklist для следующего входа.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_6_quiz',
      step_type: 'quiz',
      title: 'Step 6: Mini test',
      source_excerpt: summary,
      explanation: `${quizCount} вопросов проверяют понимание именно этого урока.`,
      what_to_notice: 'Отвечайте по материалу текущей главы, а не общими знаниями.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_7_next',
      step_type: 'takeaway',
      title: 'Step 7: Next lesson',
      source_excerpt: summary,
      explanation: 'Завершите текущий урок и перейдите к следующему шагу курса.',
      what_to_notice: 'Отметьте урок завершенным перед переходом.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
  ];
}

export default function LessonPage({ params }: { params: { id: string } }) {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [lesson, setLesson] = useState<LessonDetails | null>(null);

  const [isPreparing, setIsPreparing] = useState(true);
  const [prepareProgress, setPrepareProgress] = useState(0);
  const [prepareMessage, setPrepareMessage] = useState('Preparing AI lesson...');

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const pdfObjectUrlRef = useRef<string | null>(null);
  const uiLanguage: UiLanguage = language === 'UZ' ? 'UZ' : 'RU';

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3200);
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
    let cancelled = false;
    const minDuration = 5500 + Math.floor(Math.random() * 3000);
    const start = Date.now();

    const messagesRu = [
      'Подготавливаем AI lesson flow...',
      'Разбираем структуру главы и ключевые идеи...',
      'Собираем step-based объяснение с практикой...',
      'Генерируем mini-test по материалу урока...',
    ];
    const messagesUz = [
      'AI lesson flow tayyorlanmoqda...',
      "Bo'lim struktura va asosiy g'oyalar tahlil qilinmoqda...",
      'Step-based tushuntirish va amaliy blok yig\'ilmoqda...',
      'Ushbu lesson bo\'yicha mini-test yaratilmoqda...',
    ];

    let messageIndex = 0;
    const messageTimer = setInterval(() => {
      if (cancelled) return;
      const list = uiLanguage === 'UZ' ? messagesUz : messagesRu;
      messageIndex = (messageIndex + 1) % list.length;
      setPrepareMessage(list[messageIndex]);
    }, 1300);

    const progressTimer = setInterval(() => {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const progress = Math.min(94, Math.round((elapsed / minDuration) * 100));
      setPrepareProgress(progress);
    }, 180);

    const run = async () => {
      try {
        const res = await api.get(`/courses/lessons/${params.id}`);
        if (!cancelled) setLesson(res.data);
      } catch (e: any) {
        if (!cancelled) {
          setLesson(null);
          showToast(e.response?.data?.error || 'Failed to load lesson');
        }
      } finally {
        const elapsed = Date.now() - start;
        const remain = Math.max(0, minDuration - elapsed);
        setTimeout(() => {
          if (cancelled) return;
          setPrepareProgress(100);
          setIsPreparing(false);
          clearInterval(progressTimer);
          clearInterval(messageTimer);
        }, remain);
      }
    };

    run();

    return () => {
      cancelled = true;
      clearInterval(progressTimer);
      clearInterval(messageTimer);
    };
  }, [params.id, uiLanguage]);

  useEffect(() => {
    return () => {
      if (pdfObjectUrlRef.current) {
        URL.revokeObjectURL(pdfObjectUrlRef.current);
        pdfObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!lesson?.id) return;
    const key = `lesson_favorite_${lesson.id}`;
    const saved = localStorage.getItem(key);
    setIsFavorite(saved === '1');
    setQuizAnswers({});
    setQuizSubmitted(false);
    setActiveStepIndex(0);
    setVisitedSteps(new Set([0]));
  }, [lesson?.id]);

  const ensurePdfLoaded = async () => {
    if (!lesson?.id || !lesson.pdf_path || pdfUrl || isLoadingPdf) return;
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

  const firstName = useMemo(() => {
    if (!user) return '';
    return user.name?.split(' ')[0] || user.name;
  }, [user]);

  const localizedSummary = useMemo(() => {
    if (!lesson) return '';
    if (uiLanguage === 'UZ') return normalizeText(lesson.summary_uz || lesson.summary_ru || lesson.summary);
    return normalizeText(lesson.summary_ru || lesson.summary_uz || lesson.summary);
  }, [lesson, uiLanguage]);

  const localizedExplanation = useMemo(() => {
    if (!lesson) return '';
    if (uiLanguage === 'UZ') return normalizeText(lesson.content_uz || lesson.content_source || lesson.content_ru || lesson.content);
    return normalizeText(lesson.content_ru || lesson.content_source || lesson.content_uz || lesson.content);
  }, [lesson, uiLanguage]);

  const keyPoints = useMemo(() => {
    const raw = getLocalizedJsonValue(lesson?.key_points_json, uiLanguage);
    const normalized = Array.isArray(raw)
      ? raw.map((item: any) => normalizeText(item)).filter(Boolean).slice(0, 10)
      : [];
    return normalized.length > 0 ? normalized : fallbackKeyPoints(uiLanguage);
  }, [lesson?.key_points_json, uiLanguage]);

  const glossary = useMemo(() => {
    const raw = getLocalizedJsonValue(lesson?.glossary_json, uiLanguage);
    const normalized = normalizeGlossary(raw);
    return normalized.length > 0 ? normalized : fallbackGlossary(uiLanguage);
  }, [lesson?.glossary_json, uiLanguage]);

  const practical = useMemo(() => {
    const raw = normalizeText(getLocalizedJsonValue(lesson?.practice_notes, uiLanguage));
    if (raw) return raw;
    if (uiLanguage === 'UZ') {
      return "3 ta chartda setupni tekshiring: kirish, stop-loss va targetni oldindan belgilang.";
    }
    return 'Проверьте сетап на 3 графиках: заранее определите вход, стоп и цель.';
  }, [lesson?.practice_notes, uiLanguage]);

  const commonMistakes = useMemo(() => {
    const raw = getLocalizedJsonValue(lesson?.common_mistakes_json, uiLanguage);
    const normalized = Array.isArray(raw)
      ? raw.map((item: any) => normalizeText(item)).filter(Boolean).slice(0, 8)
      : [];
    if (normalized.length > 0) return normalized;
    return uiLanguage === 'UZ'
      ? [
          "Signalni kontekstsiz talqin qilish.",
          "Stop-lossni rejasiz o'zgartirish.",
          "Risk qoidalarini buzib lotni oshirish.",
        ]
      : [
          'Интерпретация сигнала без контекста.',
          'Изменение стоп-лосса без плана.',
          'Нарушение риск-правил через увеличение объема.',
        ];
  }, [lesson?.common_mistakes_json, uiLanguage]);

  const selfCheck = useMemo(() => {
    const raw = getLocalizedJsonValue(lesson?.self_check_questions_json, uiLanguage);
    const normalized = Array.isArray(raw)
      ? raw.map((item: any) => normalizeText(item)).filter(Boolean).slice(0, 8)
      : [];
    if (normalized.length > 0) return normalized;
    return uiLanguage === 'UZ'
      ? [
          "Ushbu lessondagi asosiy signalni qanday tasdiqlaysiz?",
          "Bitimdan oldin qaysi risk-qoidani tekshirasiz?",
          "Noto'g'ri scenariyda chiqish rejangiz qanday?",
        ]
      : [
          'Как вы подтверждаете главный сигнал этого урока?',
          'Какое риск-правило вы проверяете до входа?',
          'Какой у вас план выхода при неверном сценарии?',
        ];
  }, [lesson?.self_check_questions_json, uiLanguage]);

  const homework = useMemo(() => {
    const raw = normalizeText(getLocalizedJsonValue(lesson?.homework_json, uiLanguage));
    if (raw) return raw;
    if (uiLanguage === 'UZ') {
      return "5 ta tarixiy chart tanlang, setup sifatini 1-10 baholang va xatolarni jurnalga yozing.";
    }
    return 'Выберите 5 исторических графиков, оцените качество сетапа 1-10 и запишите ошибки в журнал.';
  }, [lesson?.homework_json, uiLanguage]);

  const remember = useMemo(() => {
    const conclusion = normalizeText(getLocalizedJsonValue(lesson?.conclusion_json, uiLanguage));
    const additional = normalizeText(getLocalizedJsonValue(lesson?.additional_notes_json, uiLanguage));
    const source = `${conclusion} ${additional}`.trim();
    if (source) return source;
    return keyPoints.slice(0, 3).join(' ');
  }, [lesson?.conclusion_json, lesson?.additional_notes_json, keyPoints, uiLanguage]);

  const quizItems = useMemo(() => {
    const quizRaw = normalizeQuiz(getLocalizedJsonValue(lesson?.lesson_test_json, uiLanguage));
    if (quizRaw.length > 0) return quizRaw;

    const quizLegacy = normalizeQuiz(getLocalizedJsonValue(lesson?.quiz_json, uiLanguage));
    if (quizLegacy.length > 0) return quizLegacy;

    return fallbackQuiz(uiLanguage);
  }, [lesson?.lesson_test_json, lesson?.quiz_json, uiLanguage]);

  const steps = useMemo(() => {
    const raw = normalizeSteps(getLocalizedJsonValue(lesson?.lesson_steps_json, uiLanguage));
    if (raw.length >= 6) return raw;
    return buildFallbackSteps(uiLanguage, localizedSummary, localizedExplanation, practical, remember, quizItems.length);
  }, [lesson?.lesson_steps_json, uiLanguage, localizedSummary, localizedExplanation, practical, remember, quizItems.length]);

  const visualBlocks = useMemo(() => {
    const raw = normalizeVisualBlocks(lesson?.visual_blocks_json);
    if (raw.length > 0) return raw;

    if (!lesson?.pdf_path) return [];

    const derived = steps
      .filter((step) => step.step_type === 'visual' || !!step.visual_hint)
      .slice(0, 3)
      .map((step) => ({
        step_id: step.step_id,
        page_from: Math.max(1, step.page_from || 1),
        page_to: Math.max(Math.max(1, step.page_from || 1), step.page_to || step.page_from || 1),
        visual_kind: 'page_fragment' as const,
        caption_ru: step.title,
        caption_uz: step.title,
        importance_ru: step.what_to_notice || 'Посмотрите на рыночный контекст на этом фрагменте.',
        importance_uz: step.what_to_notice || "Ushbu fragmentda bozor kontekstiga e'tibor bering.",
      }));

    return derived;
  }, [lesson?.visual_blocks_json, lesson?.pdf_path, steps]);

  const currentStep = steps[Math.min(activeStepIndex, Math.max(0, steps.length - 1))];

  const currentVisual = useMemo(() => {
    if (!currentStep) return null;
    const fromBlock = visualBlocks.find((item) => item.step_id === currentStep.step_id);
    if (fromBlock) return fromBlock;
    if (currentStep.step_type === 'visual') {
      return {
        step_id: currentStep.step_id,
        page_from: Math.max(1, currentStep.page_from || 1),
        page_to: Math.max(Math.max(1, currentStep.page_from || 1), currentStep.page_to || currentStep.page_from || 1),
        visual_kind: 'page_fragment' as const,
        caption_ru: currentStep.title,
        caption_uz: currentStep.title,
        importance_ru: currentStep.what_to_notice,
        importance_uz: currentStep.what_to_notice,
      };
    }
    return null;
  }, [currentStep, visualBlocks]);

  useEffect(() => {
    if (!currentVisual || !lesson?.pdf_path) return;
    ensurePdfLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVisual?.step_id, lesson?.pdf_path]);

  const quizScore = useMemo(() => {
    if (!quizSubmitted || quizItems.length === 0) return null;
    let score = 0;
    quizItems.forEach((item, idx) => {
      if (Number(quizAnswers[idx]) === Number(item.correct_index)) score += 1;
    });
    return score;
  }, [quizSubmitted, quizItems, quizAnswers]);

  const askAiPrompt = useMemo(() => {
    if (!lesson) return '';
    const stepTitles = steps.slice(0, 7).map((item, idx) => `${idx + 1}. ${item.title}`).join('\n');
    return [
      uiLanguage === 'UZ'
        ? 'Ushbu lessonni mentor kabi tushuntirib, amaliy plan bering.'
        : 'Разберите этот урок как ментор и дайте практический план.',
      '',
      `Course: ${lesson.course_title}`,
      `Module: ${lesson.module_title}`,
      `Lesson: ${lesson.title}`,
      `Type: ${lesson.lesson_type || 'theory'}`,
      `Difficulty: ${lesson.difficulty_level || 'Beginner'}`,
      '',
      'Step flow:',
      stepTitles,
      '',
      'Summary:',
      localizedSummary,
      '',
      'Main explanation:',
      localizedExplanation.slice(0, 4500),
    ].join('\n');
  }, [lesson, steps, uiLanguage, localizedSummary, localizedExplanation]);

  const markLessonCompleted = async () => {
    if (!lesson?.id || lesson.is_completed || isCompleting) return;
    setIsCompleting(true);
    try {
      await api.post(`/courses/lessons/${lesson.id}/complete`);
      setLesson((prev) => (prev ? { ...prev, is_completed: true, completed_at: new Date().toISOString() } : prev));
      showToast(uiLanguage === 'UZ' ? 'Dars tugallandi' : 'Урок отмечен как завершенный');
    } catch (e: any) {
      showToast(e.response?.data?.error || (uiLanguage === 'UZ' ? 'Xatolik yuz berdi' : 'Не удалось отметить урок'));
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
      ? (uiLanguage === 'UZ' ? "Dars sevimlilarga qo'shildi" : 'Урок добавлен в избранное')
      : (uiLanguage === 'UZ' ? 'Dars sevimlilardan olib tashlandi' : 'Урок удален из избранного'));
  };

  const goToNextStep = () => {
    if (steps.length === 0) return;
    const next = Math.min(steps.length - 1, activeStepIndex + 1);
    setActiveStepIndex(next);
    setVisitedSteps((prev) => {
      const copy = new Set(prev);
      copy.add(next);
      return copy;
    });
  };

  const goToPrevStep = () => {
    const prev = Math.max(0, activeStepIndex - 1);
    setActiveStepIndex(prev);
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
            <Sparkles size={14} />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="sticky top-0 z-[100] px-6 md:px-10 py-4 flex items-center justify-between" style={{ background: 'rgba(11,18,32,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(123,63,228,0.12)' }}>
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

            <div className="absolute right-0 mt-2 w-48 rounded-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[110]" style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.2)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
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
        {isPreparing ? (
          <div className="min-h-[72vh] flex items-center justify-center">
            <div className="w-full max-w-2xl rounded-3xl p-8 md:p-10" style={{ background: 'linear-gradient(135deg, rgba(123,63,228,0.2), rgba(42,169,255,0.12))', border: '1px solid rgba(123,63,228,0.32)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(123,63,228,0.25)' }}>
                  <BrainCircuit size={22} style={{ color: '#C6ADFF' }} />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest" style={{ color: '#B8C8DE' }}>AI Lesson Preparation</p>
                  <h2 className="text-2xl font-black text-white mt-0.5">
                    {uiLanguage === 'UZ' ? 'Interaktiv lesson tayyorlanmoqda' : 'Готовим интерактивный lesson'}
                  </h2>
                </div>
              </div>

              <p className="text-sm mt-3" style={{ color: '#D5E2F4' }}>{prepareMessage}</p>

              <div className="mt-5 h-2 rounded-full" style={{ background: 'rgba(123,63,228,0.2)' }}>
                <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${prepareProgress}%`, background: 'linear-gradient(90deg, #7B3FE4, #2AA9FF)' }} />
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  uiLanguage === 'UZ' ? 'Step-based flow' : 'Step-based flow',
                  uiLanguage === 'UZ' ? 'Book visual fragments' : 'Book visual fragments',
                  uiLanguage === 'UZ' ? 'Lesson mini-test' : 'Lesson mini-test',
                ].map((item) => (
                  <div key={item} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: 'rgba(11,18,32,0.55)', color: '#C8D4E8' }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
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
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
              <button
                onClick={() => router.push(`/dashboard/courses/${lesson.course_id}`)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.2)', color: '#A87BFF' }}
              >
                <ArrowLeft size={16} /> {t('common.back')}
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={markLessonCompleted}
                  disabled={lesson.is_completed || isCompleting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.36)', color: '#6EE7B7' }}
                >
                  {isCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {lesson.is_completed
                    ? (uiLanguage === 'UZ' ? 'Completed' : 'Completed')
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
                      lessonContent: localizedExplanation.slice(0, 4500),
                      lessonSteps: steps,
                      visualBlocks,
                      keyPoints,
                      glossary,
                      practice: practical,
                      commonMistakes,
                      selfCheckQuestions: selfCheck,
                      homework,
                    }));
                    router.push('/ai');
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)', boxShadow: '0 4px 20px rgba(123,63,228,0.35)' }}
                >
                  <Brain size={14} /> {t('common.askAI')}
                </button>

                <button
                  onClick={toggleFavorite}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: isFavorite ? 'rgba(250,204,21,0.14)' : '#111A2F',
                    border: `1px solid ${isFavorite ? 'rgba(250,204,21,0.4)' : 'rgba(123,140,166,0.3)'}`,
                    color: isFavorite ? '#FDE68A' : '#D5E2F4',
                  }}
                >
                  <Bookmark size={14} />
                  {isFavorite
                    ? (uiLanguage === 'UZ' ? 'Favorite' : 'Favorite')
                    : (uiLanguage === 'UZ' ? 'Add favorite' : 'Add favorite')}
                </button>

                <button
                  onClick={() => {
                    setShowPdf((prev) => !prev);
                    if (!pdfUrl) ensurePdfLoaded();
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: '#111A2F', border: '1px solid rgba(42,169,255,0.32)', color: '#67D5FF' }}
                >
                  <FileText size={14} />
                  {showPdf
                    ? (uiLanguage === 'UZ' ? 'Hide PDF' : 'Hide PDF')
                    : (uiLanguage === 'UZ' ? 'Open original PDF' : 'Open original PDF')}
                </button>
              </div>
            </div>

            <section className="rounded-3xl p-6 md:p-7 mb-5" style={{ background: 'linear-gradient(135deg, rgba(123,63,228,0.2), rgba(42,169,255,0.1))', border: '1px solid rgba(123,63,228,0.3)' }}>
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#9AB1D2' }}>
                {lesson.course_title} · {lesson.module_title}
              </p>
              <h1 className="text-3xl md:text-4xl font-black mt-2" style={{ fontFamily: 'Outfit, sans-serif' }}>{lesson.title}</h1>
              <p className="mt-3 text-sm" style={{ color: '#D5E2F4' }}>{localizedSummary}</p>

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ background: 'rgba(42,169,255,0.12)', border: '1px solid rgba(42,169,255,0.28)', color: '#67D5FF' }}>
                  {lesson.lesson_type || 'theory'}
                </span>
                <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.26)', color: '#6EE7B7' }}>
                  {lesson.difficulty_level || 'Beginner'}
                </span>
                <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ background: 'rgba(123,63,228,0.12)', border: '1px solid rgba(123,63,228,0.25)', color: '#C6ADFF' }}>
                  <Languages size={12} className="inline mr-1" /> {lesson.source_language || 'UNKNOWN'}
                </span>
                {lesson.source_section && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(123,140,166,0.28)', color: '#B8C8DE' }}>
                    {lesson.source_section}
                  </span>
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1 glass-card p-4" style={{ border: '1px solid rgba(123,63,228,0.18)' }}>
                <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#A87BFF' }}>
                  <Layers size={13} className="inline mr-1" />
                  Step Flow
                </p>
                <div className="mt-3 space-y-2">
                  {steps.map((step, idx) => {
                    const isActive = idx === activeStepIndex;
                    const isVisited = visitedSteps.has(idx);
                    return (
                      <button
                        key={step.step_id}
                        onClick={() => {
                          setActiveStepIndex(idx);
                          setVisitedSteps((prev) => {
                            const copy = new Set(prev);
                            copy.add(idx);
                            return copy;
                          });
                        }}
                        className="w-full text-left rounded-xl px-3 py-2.5 transition-all"
                        style={isActive
                          ? { background: 'rgba(123,63,228,0.22)', border: '1px solid rgba(123,63,228,0.45)' }
                          : { background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(123,140,166,0.2)' }}
                      >
                        <p className="text-[11px] font-black uppercase" style={{ color: isActive ? '#D8CCFF' : '#7B8CA6' }}>
                          {`Step ${idx + 1}`} {isVisited ? '•' : ''}
                        </p>
                        <p className="text-sm mt-0.5" style={{ color: isActive ? '#FFFFFF' : '#C8D4E8' }}>{step.title}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-lg p-3" style={{ background: 'rgba(11,18,32,0.6)', border: '1px solid rgba(42,169,255,0.18)' }}>
                  <p className="text-xs" style={{ color: '#7B8CA6' }}>
                    {uiLanguage === 'UZ' ? 'Progress' : 'Progress'}
                  </p>
                  <p className="text-sm font-bold mt-1" style={{ color: '#67D5FF' }}>
                    {Math.round(((activeStepIndex + 1) / Math.max(steps.length, 1)) * 100)}%
                  </p>
                  <div className="mt-2 h-1.5 rounded-full" style={{ background: 'rgba(123,63,228,0.16)' }}>
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${Math.round(((activeStepIndex + 1) / Math.max(steps.length, 1)) * 100)}%`, background: 'linear-gradient(90deg, #7B3FE4, #2AA9FF)' }}
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-4">
                {currentStep && (
                  <div className="glass-card p-5" style={{ border: '1px solid rgba(123,63,228,0.18)' }}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#9AB1D2' }}>
                          {`Step ${activeStepIndex + 1} / ${steps.length}`} · {currentStep.step_type}
                        </p>
                        <h2 className="text-2xl font-black mt-1 text-white">{currentStep.title}</h2>
                      </div>
                    </div>

                    <p className="text-sm leading-7 mt-4" style={{ color: '#D5E2F4' }}>
                      {currentStep.explanation}
                    </p>

                    {currentStep.what_to_notice && (
                      <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(11,18,32,0.6)', border: '1px solid rgba(42,169,255,0.2)' }}>
                        <p className="text-xs font-black uppercase tracking-wide" style={{ color: '#67D5FF' }}>
                          <Target size={12} className="inline mr-1" />
                          {uiLanguage === 'UZ' ? "Nimaga e'tibor berish kerak" : 'Что важно заметить'}
                        </p>
                        <p className="text-sm mt-2" style={{ color: '#CFE5FF' }}>{currentStep.what_to_notice}</p>
                      </div>
                    )}

                    {currentStep.source_excerpt && (
                      <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(17,26,47,0.85)', border: '1px solid rgba(123,140,166,0.22)' }}>
                        <p className="text-xs font-black uppercase tracking-wide" style={{ color: '#9AB1D2' }}>
                          <NotebookTabs size={12} className="inline mr-1" />
                          Source fragment
                        </p>
                        <p className="text-sm mt-2" style={{ color: '#C8D4E8' }}>{currentStep.source_excerpt}</p>
                      </div>
                    )}

                    {(currentStep.step_type === 'visual' || currentVisual) && lesson.pdf_path && (
                      <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(17,26,47,0.82)', border: '1px solid rgba(42,169,255,0.25)' }}>
                        <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#67D5FF' }}>
                          <FileText size={12} className="inline mr-1" />
                          Book visual focus
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#9AB1D2' }}>
                          Pages {currentVisual?.page_from || currentStep.page_from || 1}-{currentVisual?.page_to || currentStep.page_to || currentStep.page_from || 1}
                        </p>
                        {(currentVisual?.importance_ru || currentVisual?.importance_uz || currentStep.visual_hint) && (
                          <p className="text-sm mt-2" style={{ color: '#D8ECFF' }}>
                            {uiLanguage === 'UZ'
                              ? (currentVisual?.importance_uz || currentStep.visual_hint)
                              : (currentVisual?.importance_ru || currentStep.visual_hint)}
                          </p>
                        )}

                        <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(42,169,255,0.2)' }}>
                          {isLoadingPdf && (
                            <div className="px-3 py-2 text-xs flex items-center gap-2" style={{ color: '#9AB1D2' }}>
                              <Loader2 size={12} className="animate-spin" /> Loading page preview...
                            </div>
                          )}
                          {pdfUrl ? (
                            <iframe
                              title="Lesson visual page"
                              src={`${pdfUrl}#page=${currentVisual?.page_from || currentStep.page_from || 1}`}
                              className="w-full"
                              style={{ height: '440px', border: 'none', background: '#0A1020' }}
                            />
                          ) : (
                            <div className="p-5 text-center" style={{ background: '#0A1020' }}>
                              <button
                                onClick={ensurePdfLoaded}
                                className="px-4 py-2 rounded-lg text-sm font-bold"
                                style={{ background: 'rgba(42,169,255,0.2)', border: '1px solid rgba(42,169,255,0.35)', color: '#67D5FF' }}
                              >
                                {uiLanguage === 'UZ' ? 'Sahifa fragmentini yuklash' : 'Загрузить фрагмент страницы'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {currentStep.step_type === 'concept' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="rounded-xl p-3" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(123,63,228,0.22)' }}>
                          <p className="text-xs uppercase font-black" style={{ color: '#C6ADFF' }}>Key points</p>
                          <ul className="mt-2 space-y-1.5">
                            {keyPoints.slice(0, 6).map((item, idx) => (
                              <li key={`k-${idx}-${item.slice(0, 20)}`} className="text-sm" style={{ color: '#D5E2F4' }}>
                                <span className="font-black mr-2" style={{ color: '#A87BFF' }}>{idx + 1}.</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-xl p-3" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(42,169,255,0.22)' }}>
                          <p className="text-xs uppercase font-black" style={{ color: '#67D5FF' }}>Glossary</p>
                          <div className="mt-2 space-y-1.5">
                            {glossary.slice(0, 6).map((item, idx) => (
                              <div key={`g-${idx}-${item.term}`} className="text-sm" style={{ color: '#D5E2F4' }}>
                                <span className="font-semibold text-white">{item.term}:</span> {item.definition}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep.step_type === 'practice' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.26)' }}>
                          <p className="text-xs uppercase font-black" style={{ color: '#6EE7B7' }}>Practical application</p>
                          <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: '#D5FBEA' }}>{practical}</p>
                        </div>

                        <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.26)' }}>
                          <p className="text-xs uppercase font-black" style={{ color: '#FCA5A5' }}>Common mistakes</p>
                          <ul className="mt-2 space-y-1.5">
                            {commonMistakes.slice(0, 6).map((item, idx) => (
                              <li key={`m-${idx}-${item.slice(0, 20)}`} className="text-sm" style={{ color: '#FECACA' }}>
                                <span className="font-black mr-2">{idx + 1}.</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {currentStep.step_type === 'takeaway' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.26)' }}>
                          <p className="text-xs uppercase font-black" style={{ color: '#A5B4FC' }}>What to remember</p>
                          <p className="text-sm mt-2" style={{ color: '#D6DBFF' }}>{remember}</p>
                        </div>

                        <div className="rounded-xl p-3" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.26)' }}>
                          <p className="text-xs uppercase font-black" style={{ color: '#7DD3FC' }}>Self-check</p>
                          <ul className="mt-2 space-y-1.5">
                            {selfCheck.slice(0, 4).map((item, idx) => (
                              <li key={`s-${idx}-${item.slice(0, 20)}`} className="text-sm" style={{ color: '#D8F2FF' }}>
                                <span className="font-black mr-2">{idx + 1}.</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {currentStep.step_type === 'quiz' && (
                      <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                        <p className="text-xs uppercase font-black" style={{ color: '#34D399' }}>Mini test</p>

                        <div className="mt-3 space-y-4">
                          {quizItems.map((item, qIdx) => {
                            const selected = quizAnswers[qIdx];
                            const isAnswered = typeof selected === 'number';
                            const isCorrect = isAnswered && selected === item.correct_index;

                            return (
                              <div key={`q-${qIdx}-${item.question.slice(0, 20)}`} className="rounded-lg p-3" style={{ background: 'rgba(11,18,32,0.6)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <p className="text-sm font-semibold text-white">{qIdx + 1}. {item.question}</p>

                                <div className="mt-2 space-y-2">
                                  {item.options.map((option, oIdx) => {
                                    const selectedThis = selected === oIdx;
                                    const correctOption = quizSubmitted && oIdx === item.correct_index;
                                    const wrongSelection = quizSubmitted && selectedThis && oIdx !== item.correct_index;

                                    return (
                                      <button
                                        key={`q-${qIdx}-o-${oIdx}`}
                                        onClick={() => {
                                          if (quizSubmitted) return;
                                          setQuizAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
                                        }}
                                        className="w-full text-left rounded-md px-3 py-2 text-sm transition-all"
                                        style={correctOption
                                          ? { background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.45)', color: '#6EE7B7' }
                                          : wrongSelection
                                            ? { background: 'rgba(239,68,68,0.16)', border: '1px solid rgba(239,68,68,0.45)', color: '#FCA5A5' }
                                            : selectedThis
                                              ? { background: 'rgba(123,63,228,0.2)', border: '1px solid rgba(123,63,228,0.45)', color: '#D8CCFF' }
                                              : { background: '#111A2F', border: '1px solid rgba(123,140,166,0.25)', color: '#D5E2F4' }}
                                      >
                                        {option}
                                      </button>
                                    );
                                  })}
                                </div>

                                {quizSubmitted && (
                                  <p className="text-xs mt-2" style={{ color: isCorrect ? '#6EE7B7' : '#FECACA' }}>
                                    {item.explanation || (isCorrect ? 'Correct' : 'Review this question again')}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3 flex items-center gap-2 flex-wrap">
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
                        </div>
                      </div>
                    )}

                    <div className="mt-5 rounded-xl p-3" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.24)' }}>
                      <p className="text-xs uppercase font-black" style={{ color: '#FACC15' }}>Homework</p>
                      <p className="text-sm mt-2" style={{ color: '#FDE68A' }}>{homework}</p>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        onClick={goToPrevStep}
                        disabled={activeStepIndex === 0}
                        className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
                        style={{ background: '#111A2F', border: '1px solid rgba(123,140,166,0.25)', color: '#C8D4E8' }}
                      >
                        {uiLanguage === 'UZ' ? 'Oldingi step' : 'Предыдущий шаг'}
                      </button>

                      <div className="flex items-center gap-2">
                        {activeStepIndex < steps.length - 1 ? (
                          <button
                            onClick={goToNextStep}
                            className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}
                          >
                            {uiLanguage === 'UZ' ? 'Keyingi step' : 'Следующий шаг'}
                          </button>
                        ) : lesson.next_lesson_id ? (
                          <button
                            onClick={() => router.push(`/dashboard/lessons/${lesson.next_lesson_id}`)}
                            className="px-4 py-2 rounded-lg text-sm font-bold"
                            style={{ background: 'rgba(123,63,228,0.2)', border: '1px solid rgba(123,63,228,0.35)', color: '#D8CCFF' }}
                          >
                            {uiLanguage === 'UZ' ? 'Next lesson' : 'Next lesson'} <ChevronRight size={14} className="inline ml-1" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {showPdf && (
              <section className="glass-card overflow-hidden mt-5" style={{ border: '1px solid rgba(123,63,228,0.15)' }}>
                <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(123,63,228,0.12)', background: 'rgba(11,18,32,0.4)' }}>
                  <div className="flex items-center gap-2">
                    <FileText size={16} style={{ color: '#67D5FF' }} />
                    <span className="text-sm font-bold text-white">Original PDF (optional)</span>
                  </div>
                  {isLoadingPdf && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#7B8CA6' }}>
                      <Loader2 size={14} className="animate-spin" /> Loading PDF...
                    </div>
                  )}
                </div>

                <div style={{ background: '#0A1020' }}>
                  {pdfUrl ? (
                    <iframe
                      title="Lesson PDF"
                      src={pdfUrl}
                      className="w-full"
                      style={{ height: '78vh', border: 'none' }}
                    />
                  ) : (
                    <div className="p-8 text-center">
                      <FileText size={30} style={{ color: '#7B8CA6' }} className="mx-auto mb-2" />
                      <p className="text-white font-bold">PDF preview not ready</p>
                      <button
                        onClick={ensurePdfLoaded}
                        className="mt-3 px-4 py-2 rounded-lg text-sm font-bold"
                        style={{ background: 'rgba(42,169,255,0.2)', border: '1px solid rgba(42,169,255,0.35)', color: '#67D5FF' }}
                      >
                        {uiLanguage === 'UZ' ? 'Yuklash' : 'Загрузить'}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
