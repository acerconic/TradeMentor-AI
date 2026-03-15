'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Brain,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  Languages,
  Loader2,
  LogOut as LogOutIcon,
  MessageCircle,
  Settings,
  Sparkles,
  Target,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

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

type StepType = 'intro' | 'visual' | 'concept' | 'practice' | 'mistakes' | 'takeaway' | 'quiz' | 'next';

type LessonStep = {
  step_index?: number;
  step_id: string;
  step_type: StepType;
  page_image?: string;
  page_text?: string;
  ai_explanation?: string;
  notes?: string;
  practical_interpretation?: string;
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
  page_excerpt?: string;
  focus_points_ru?: string[];
  focus_points_uz?: string[];
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

const STEP_LABELS: Record<UiLanguage, Record<StepType, string>> = {
  RU: {
    intro: 'Введение',
    visual: 'Визуальный блок',
    concept: 'Ключевые идеи',
    practice: 'Практика',
    mistakes: 'Ошибки',
    takeaway: 'Итог',
    quiz: 'Мини-тест',
    next: 'Следующий урок',
  },
  UZ: {
    intro: 'Kirish',
    visual: 'Vizual blok',
    concept: 'Asosiy goya',
    practice: 'Amaliyot',
    mistakes: 'Xatolar',
    takeaway: 'Yakun',
    quiz: 'Mini-test',
    next: 'Keyingi dars',
  },
};

const COPY = {
  RU: {
    loadingTitle: 'AI подготавливает lesson experience',
    loadingStages: [
      'AI анализирует структуру урока',
      'Выбираем ключевые страницы и визуальные фрагменты',
      'Формируем пошаговое объяснение как наставник',
      'Готовим мини-тест именно по этому уроку',
    ],
    loadingTags: ['AI tutor flow', 'Book visual fragments', 'Step-by-step explanation', 'Mini test'],
    back: 'Назад к курсу',
    markComplete: 'Отметить завершенным',
    completed: 'Урок завершен',
    askAi: 'Спросить AI',
    addFavorite: 'В избранное',
    inFavorite: 'В избранном',
    journey: 'Guided lesson journey',
    journeyHint: 'Переходите по шагам как по mini-course, без длинной простыни текста.',
    visualTitle: 'Фокус-фрагмент из книги',
    visualEmpty: 'Для этого шага отдельный визуальный фрагмент не требуется.',
    visualLoad: 'Загрузить фрагмент страницы',
    visualLoading: 'Загружаем страницу из исходного PDF...',
    sourceFragment: 'Фрагмент источника',
    mentorView: 'Объяснение наставника',
    whatToNotice: 'Что важно заметить',
    altExplanation: 'AI объяснил иначе',
    quickReplies: 'Быстрые действия',
    understood: 'Всё понятно, идём дальше',
    explainAgain: 'Не понял, объясни иначе',
    askQuestion: 'У меня вопрос',
    previousStep: 'Предыдущий шаг',
    nextStep: 'Следующий шаг',
    keyComponents: 'Ключевые компоненты',
    practicalUse: 'Как это работает на практике',
    commonMistakes: 'Частые ошибки',
    quickRules: 'Quick rules',
    selfCheck: 'Вопросы для самопроверки',
    summary: 'Что запомнить',
    homework: 'Домашняя практика',
    quizTitle: 'Мини-тест по текущему уроку',
    quizHint: 'Ответы проверяются сразу с объяснениями.',
    checkResult: 'Проверить результат',
    resetQuiz: 'Сбросить',
    score: 'Результат',
    completeBeforeNext: 'Завершение и переход',
    nextLesson: 'Перейти к следующему уроку',
    noNextLesson: 'Это последний урок в текущей последовательности.',
    lessonNotFound: 'Lesson not found',
    lessonNotFoundHint: 'Вернитесь в Academy и выберите урок повторно.',
    reframedToast: 'AI дал альтернативное объяснение текущего шага',
    reframedError: 'Не удалось перегенерировать объяснение',
    completionToast: 'Урок отмечен как завершенный',
    completionError: 'Не удалось отметить урок',
    favoriteAdded: 'Урок добавлен в избранное',
    favoriteRemoved: 'Урок удален из избранного',
    questionPrefill: 'У меня вопрос по текущему шагу. Поясни детально и практично.',
  },
  UZ: {
    loadingTitle: 'AI lesson experience tayyorlanmoqda',
    loadingStages: [
      'AI dars strukturasini tahlil qilmoqda',
      "Asosiy sahifalar va vizual fragmentlar tanlanmoqda",
      "Murabbiy uslubida bosqichma-bosqich tushuntirish yaratilmoqda",
      "Aynan shu dars uchun mini-test tayyorlanmoqda",
    ],
    loadingTags: ['AI tutor flow', 'Book visual fragments', 'Step-by-step explanation', 'Mini test'],
    back: 'Kursga qaytish',
    markComplete: 'Darsni yakunlash',
    completed: 'Dars yakunlandi',
    askAi: "AI'dan so'rash",
    addFavorite: "Sevimlilarga qo'shish",
    inFavorite: 'Sevimlida',
    journey: 'Guided lesson journey',
    journeyHint: "Uzun matn o'rniga darsni mini-kurs kabi bosqichma-bosqich o'ting.",
    visualTitle: 'Kitobdan vizual fokus-fragment',
    visualEmpty: "Bu qadam uchun alohida vizual fragment talab qilinmaydi.",
    visualLoad: 'Sahifa fragmentini yuklash',
    visualLoading: 'Manba PDF sahifasi yuklanmoqda...',
    sourceFragment: 'Manba fragmenti',
    mentorView: 'Mentor izohi',
    whatToNotice: "Nimaga e'tibor berish kerak",
    altExplanation: 'AI boshqacha tushuntirdi',
    quickReplies: 'Tezkor tugmalar',
    understood: "Hammasi tushunarli, keyingisiga o'tamiz",
    explainAgain: "Tushunmadim, boshqacha tushuntir",
    askQuestion: 'Menda savol bor',
    previousStep: 'Oldingi qadam',
    nextStep: 'Keyingi qadam',
    keyComponents: 'Asosiy komponentlar',
    practicalUse: 'Amaliy qo`llash',
    commonMistakes: "Ko'p uchraydigan xatolar",
    quickRules: 'Quick rules',
    selfCheck: "O'zini tekshirish savollari",
    summary: 'Yodda qoladigan qism',
    homework: 'Uyga vazifa',
    quizTitle: 'Joriy dars bo`yicha mini-test',
    quizHint: 'Har javob bo`yicha izoh darhol ko`rsatiladi.',
    checkResult: 'Natijani tekshirish',
    resetQuiz: 'Qayta boshlash',
    score: 'Natija',
    completeBeforeNext: 'Yakun va o`tish',
    nextLesson: "Keyingi darsga o'tish",
    noNextLesson: "Bu ketma-ketlikdagi oxirgi dars.",
    lessonNotFound: 'Lesson topilmadi',
    lessonNotFoundHint: 'Academyga qayting va darsni qayta tanlang.',
    reframedToast: 'AI joriy qadamni boshqacha tushuntirdi',
    reframedError: 'Izohni qayta yaratib bo`lmadi',
    completionToast: 'Dars yakunlangan deb belgilandi',
    completionError: 'Darsni yakunlashda xatolik',
    favoriteAdded: "Dars sevimlilarga qo'shildi",
    favoriteRemoved: "Dars sevimlilardan olib tashlandi",
    questionPrefill: 'Joriy qadam bo`yicha savolim bor. Iltimos, batafsil va amaliy tushuntiring.',
  },
} as const;

function normalizeText(value: any): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function splitSentences(text: string): string[] {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickLocalized(raw: any, language: UiLanguage): any {
  if (!raw || typeof raw !== 'object') return null;
  return raw[language] ?? raw[language.toLowerCase()] ?? raw[language === 'RU' ? 'UZ' : 'RU'] ?? raw[language === 'RU' ? 'uz' : 'ru'] ?? null;
}

function normalizeGlossary(raw: any): GlossaryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => ({ term: normalizeText(item?.term), definition: normalizeText(item?.definition) }))
    .filter((item: GlossaryItem) => item.term && item.definition)
    .slice(0, 12);
}

function normalizeQuiz(raw: any): QuizItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => {
      const question = normalizeText(item?.question);
      const options = Array.isArray(item?.options)
        ? item.options.map((option: any) => normalizeText(option)).filter(Boolean).slice(0, 6)
        : [];
      if (!question || options.length < 2) return null;

      const correctRaw = Number(item?.correct_index);
      const correct_index = Number.isInteger(correctRaw)
        ? Math.max(0, Math.min(options.length - 1, correctRaw))
        : 0;

      return {
        question,
        options,
        correct_index,
        explanation: normalizeText(item?.explanation),
      } as QuizItem;
    })
    .filter(Boolean)
    .slice(0, 8) as QuizItem[];
}

function normalizeStepType(value: any): StepType {
  const type = String(value || '').toLowerCase();
  if (type === 'visual') return 'visual';
  if (type === 'concept') return 'concept';
  if (type === 'practice') return 'practice';
  if (type === 'mistakes' || type === 'common_mistakes' || type === 'errors') return 'mistakes';
  if (type === 'takeaway' || type === 'summary' || type === 'conclusion') return 'takeaway';
  if (type === 'quiz') return 'quiz';
  if (type === 'next' || type === 'transition' || type === 'next_lesson') return 'next';
  return 'intro';
}

function normalizeSteps(raw: any): LessonStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any, index: number) => {
      const stepIndexRaw = Number(item?.step_index);
      const pageFromRaw = Number(item?.page_from);
      const pageToRaw = Number(item?.page_to);
      const page_from = Number.isInteger(pageFromRaw) ? Math.max(1, pageFromRaw) : 1;
      const page_to = Number.isInteger(pageToRaw) ? Math.max(page_from, pageToRaw) : page_from;
      const page_text = normalizeText(item?.page_text || item?.source_excerpt);
      const ai_explanation = normalizeText(item?.ai_explanation || item?.explanation);
      const notes = normalizeText(item?.notes || item?.what_to_notice);
      const practical_interpretation = normalizeText(item?.practical_interpretation);
      return {
        step_index: Number.isInteger(stepIndexRaw) ? Math.max(1, stepIndexRaw) : index + 1,
        step_id: normalizeText(item?.step_id || `step_${index + 1}`),
        step_type: normalizeStepType(item?.step_type),
        page_image: normalizeText(item?.page_image),
        page_text,
        ai_explanation,
        notes,
        practical_interpretation,
        title: normalizeText(item?.title),
        source_excerpt: page_text || normalizeText(item?.source_excerpt),
        explanation: ai_explanation || normalizeText(item?.explanation),
        what_to_notice: notes || normalizeText(item?.what_to_notice),
        visual_hint: normalizeText(item?.visual_hint),
        page_from,
        page_to,
      } as LessonStep;
    })
    .filter((step) => step.title && (step.ai_explanation || step.explanation))
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
      page_excerpt: normalizeText(item?.page_excerpt),
      focus_points_ru: Array.isArray(item?.focus_points_ru)
        ? item.focus_points_ru.map((x: any) => normalizeText(x)).filter(Boolean).slice(0, 5)
        : [],
      focus_points_uz: Array.isArray(item?.focus_points_uz)
        ? item.focus_points_uz.map((x: any) => normalizeText(x)).filter(Boolean).slice(0, 5)
        : [],
    }))
    .filter((item: VisualBlock) => item.step_id)
    .slice(0, 10);
}

function hasJourneyShape(steps: LessonStep[]): boolean {
  if (!Array.isArray(steps) || steps.length < 8) return false;
  const types = steps.map((step) => step.step_type);
  const visualCount = types.filter((type) => type === 'visual').length;
  return types.includes('intro') && visualCount >= 2 && types.includes('quiz') && types.includes('next');
}

function fallbackKeyPoints(language: UiLanguage): string[] {
  if (language === 'UZ') {
    return [
      "Signalni har doim bozor konteksti bilan birga baholang.",
      "Likvidlik va tasdiq triggeri birga ko'rilganda setup kuchliroq bo'ladi.",
      "Kirishdan oldin risk, stop va targetni oldindan yozing.",
      "Bir xil xatoni takrorlamaslik uchun checklist yuriting.",
    ];
  }
  return [
    'Сигнал оценивается только вместе с рыночным контекстом.',
    'Связка ликвидности и подтверждающего триггера усиливает сетап.',
    'До входа заранее фиксируйте риск, стоп и цель.',
    'Используйте checklist, чтобы не повторять одни и те же ошибки.',
  ];
}

function fallbackGlossary(language: UiLanguage): GlossaryItem[] {
  if (language === 'UZ') {
    return [
      { term: 'Liquidity', definition: "Bozordagi buyurtmalar to'plangan zona." },
      { term: 'Break of Structure', definition: "Muhim maksimum/minimum buzilishi orqali struktura o'zgarishi." },
      { term: 'Order Block', definition: "Yirik ishtirokchilar izi ko'rinadigan potensial zona." },
    ];
  }
  return [
    { term: 'Liquidity', definition: 'Зона концентрации ордеров, откуда часто начинается импульс.' },
    { term: 'Break of Structure', definition: 'Пробой ключевого экстремума, подтверждающий смену структуры.' },
    { term: 'Order Block', definition: 'Область активности крупных участников с потенциальной точкой входа.' },
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
        question: 'Likvidlikdan keyin qanday harakat to`g`ri?',
        options: ['Darhol kirish', 'Tasdiq signalini kutish', 'Rejasiz kirish'],
        correct_index: 1,
        explanation: "Tasdiq signalini kutish false entry ehtimolini kamaytiradi.",
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

function buildFallbackJourneySteps(
  language: UiLanguage,
  summary: string,
  content: string,
  practical: string,
  commonMistakes: string[],
  remember: string,
  quizCount: number,
): LessonStep[] {
  if (language === 'UZ') {
    return [
      {
        step_id: 'step_1_intro',
        step_type: 'intro',
        title: 'Step 1: Kirish va dars maqsadi',
        source_excerpt: summary,
        explanation: "Bu dars sizga asosiy bozor mantiqini ketma-ket tushuntiradi. Dars yakunida signalni qanday talqin qilish va uni amalda qanday qo'llashni aniq bilasiz.",
        what_to_notice: "Signalni har doim kontekst bilan birga baholang.",
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_2_visual_a',
        step_type: 'visual',
        title: 'Step 2: Kitob fragmenti A + AI tahlil',
        source_excerpt: summary,
        explanation: "Bu fragmentda setupning boshlanish nuqtasi ko'rsatiladi. AI aynan shu joyda signal qanday paydo bo'lishini izohlaydi.",
        what_to_notice: "Likvidlik va tasdiq triggerini belgilang.",
        visual_hint: 'Sahifadagi asosiy signalni toping.',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_3_visual_b',
        step_type: 'visual',
        title: 'Step 3: Keyingi fragment B + AI tahlil',
        source_excerpt: content.slice(0, 320),
        explanation: "Ikkinchi fragment birinchi qadamni to'ldiradi va scenariy davomiyligini ko'rsatadi. AI qaysi nuqtada xato qilish mumkinligini ham ochib beradi.",
        what_to_notice: "A va B fragmentlaridagi mantiqiy o'tishni solishtiring.",
        visual_hint: "Narx reaksiyasi qayerda o'zgarganini tekshiring.",
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_4_concept',
        step_type: 'concept',
        title: 'Step 4: Asosiy tushunchalar',
        source_excerpt: content.slice(0, 420),
        explanation: 'Ushbu bosqichda terminlar va asosiy qoidalar tizimga keltiriladi. Har tushuncha bozor strukturasi bilan bog`lanadi.',
        what_to_notice: "Terminlarni alohida emas, umumiy setup ichida o'rganing.",
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_5_practice',
        step_type: 'practice',
        title: "Step 5: Tradingda amaliy qo'llash",
        source_excerpt: practical,
        explanation: "Nazariyani chart executionga o'tkazish uchun aniq ketma-ketlik beriladi: kirish, invalidation, stop va target.",
        what_to_notice: "Bitimdan oldin kirish-stop-target rejasi tayyor bo'lishi kerak.",
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_6_mistakes',
        step_type: 'mistakes',
        title: "Step 6: Ko'p uchraydigan xatolar",
        source_excerpt: commonMistakes.join(' '),
        explanation: "Yangi boshlovchilar ko'p takrorlaydigan xatolar shu yerda tahlil qilinadi. Har xatoga qarshi amaliy oldini olish qoidasi beriladi.",
        what_to_notice: commonMistakes[0] || "Tasdiqsiz kirishdan saqlaning.",
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_7_takeaway',
        step_type: 'takeaway',
        title: 'Step 7: Nimani eslab qolish kerak',
        source_excerpt: remember,
        explanation: "Bu qadam darsni qisqa checklistga aylantiradi. Keyingi chart tahlilida aynan shu qoidalarga tayaning.",
        what_to_notice: "Asosiy qoidalarni jurnalga yozib qo'ying.",
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_8_quiz',
        step_type: 'quiz',
        title: 'Step 8: Mini-test',
        source_excerpt: summary,
        explanation: `${quizCount} ta savol darsni qanchalik tushunganingizni tekshiradi.`,
        what_to_notice: "Javoblarda aynan joriy dars mantiqiga tayaning.",
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_9_next',
        step_type: 'next',
        title: "Step 9: Keyingi darsga o'tish",
        source_excerpt: summary,
        explanation: "Current lessonni yakunlang, natijani saqlang va keyingi darsga o'ting. Ketma-ketlik bo'yicha harakat qilish bilimni mustahkamlaydi.",
        what_to_notice: "Avval mark complete, keyin next lesson.",
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
      title: 'Step 1: Введение и цель урока',
      source_excerpt: summary,
      explanation: 'Этот урок раскрывает логику темы в формате AI-наставника. К концу прохождения вы понимаете, где искать сигнал и как применять его в реальной торговле.',
      what_to_notice: 'Оценивайте сигнал только в связке с контекстом рынка.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_2_visual_a',
      step_type: 'visual',
      title: 'Step 2: Фрагмент книги A + AI разбор',
      source_excerpt: summary,
      explanation: 'На этом фрагменте AI объясняет, как формируется рабочий сигнал и где находится его подтверждение. Здесь важно увидеть не картинку, а торговую логику.',
      what_to_notice: 'Отметьте зону ликвидности и точку подтверждения.',
      visual_hint: 'Найдите ключевой визуальный сигнал на странице.',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_3_visual_b',
      step_type: 'visual',
      title: 'Step 3: Следующий фрагмент B + AI разбор',
      source_excerpt: content.slice(0, 320),
      explanation: 'Второй фрагмент показывает развитие сценария и потенциальные точки ошибки. AI связывает оба фрагмента в единую последовательность принятия решения.',
      what_to_notice: 'Сравните логику между фрагментом A и B.',
      visual_hint: 'Проверьте, где изменилась реакция цены.',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_4_concept',
      step_type: 'concept',
      title: 'Step 4: Ключевые концепции',
      source_excerpt: content.slice(0, 420),
      explanation: 'На этом шаге термины и правила складываются в понятную систему. Каждый концепт объясняется через его практическую роль в сетапе.',
      what_to_notice: 'Изучайте понятия через рыночную структуру, а не изолированно.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_5_practice',
      step_type: 'practice',
      title: 'Step 5: Практическая интерпретация',
      source_excerpt: practical,
      explanation: 'Теория переводится в конкретный execution-план: вход, invalidation, стоп и цель. Этот шаг делает материал прикладным.',
      what_to_notice: 'План входа-стопа-цели должен быть готов до сделки.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_6_mistakes',
      step_type: 'mistakes',
      title: 'Step 6: Частые ошибки новичка',
      source_excerpt: commonMistakes.join(' '),
      explanation: 'Здесь разобраны ошибки, которые чаще всего приводят к убыточным входам. Для каждой ошибки есть короткое правило профилактики.',
      what_to_notice: commonMistakes[0] || 'Не входите в позицию без подтверждения.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_7_takeaway',
      step_type: 'takeaway',
      title: 'Step 7: Итог — что запомнить',
      source_excerpt: remember,
      explanation: 'Этот шаг фиксирует главные выводы урока в формате быстрого checklist. Используйте его как опору при следующем анализе графика.',
      what_to_notice: 'Сохраните ключевые правила в торговом журнале.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_8_quiz',
      step_type: 'quiz',
      title: 'Step 8: Мини-тест',
      source_excerpt: summary,
      explanation: `${quizCount} вопросов проверяют понимание именно этого урока.`,
      what_to_notice: 'Отвечайте, опираясь на логику текущего материала.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_9_next',
      step_type: 'next',
      title: 'Step 9: Переход к следующему уроку',
      source_excerpt: summary,
      explanation: 'Завершите текущий урок, сохраните прогресс и переходите к следующему lesson. Последовательность помогает закрепить материал глубже.',
      what_to_notice: 'Сначала отметьте урок завершенным.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
  ];
}

function enrichStepsForUi(steps: LessonStep[]): LessonStep[] {
  return (steps || [])
    .map((step, index) => {
      const pageFrom = Math.max(1, Number(step.page_from) || 1);
      const pageTo = Math.max(pageFrom, Number(step.page_to) || pageFrom);
      const page_text = normalizeText(step.page_text || step.source_excerpt);
      const ai_explanation = normalizeText(step.ai_explanation || step.explanation);
      const notes = normalizeText(step.notes || step.what_to_notice);
      const practical_interpretation = normalizeText(
        step.practical_interpretation || (step.step_type === 'practice' ? (step.source_excerpt || step.explanation) : ''),
      );

      return {
        ...step,
        step_index: Number.isInteger(Number(step.step_index)) ? Math.max(1, Number(step.step_index)) : index + 1,
        page_image: normalizeText(step.page_image || `page:${pageFrom}`),
        page_text,
        ai_explanation,
        notes,
        practical_interpretation,
        source_excerpt: page_text || normalizeText(step.source_excerpt),
        explanation: ai_explanation || normalizeText(step.explanation),
        what_to_notice: notes || normalizeText(step.what_to_notice),
        page_from: pageFrom,
        page_to: pageTo,
      } as LessonStep;
    })
    .filter((step) => step.title && step.ai_explanation)
    .slice(0, 12);
}

export default function LessonPage({ params }: { params: { id: string } }) {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [lesson, setLesson] = useState<LessonDetails | null>(null);

  const [isPreparing, setIsPreparing] = useState(true);
  const [prepareProgress, setPrepareProgress] = useState(0);
  const [prepareMessage, setPrepareMessage] = useState('');

  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isRenderingPageImage, setIsRenderingPageImage] = useState(false);
  const [pageImageByPage, setPageImageByPage] = useState<Record<number, string>>({});
  const [pageRenderError, setPageRenderError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  const [isReframing, setIsReframing] = useState(false);
  const [alternateExplanation, setAlternateExplanation] = useState('');

  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const pdfBinaryRef = useRef<ArrayBuffer | null>(null);
  const pdfDocumentRef = useRef<any>(null);
  const renderingPagesRef = useRef<Set<number>>(new Set());

  const uiLanguage: UiLanguage = language === 'UZ' ? 'UZ' : 'RU';
  const copy = COPY[uiLanguage];

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
    const minDuration = 5000 + Math.floor(Math.random() * 5000);
    const start = Date.now();

    const stages = COPY[uiLanguage].loadingStages;
    setPrepareMessage(stages[0]);

    let stageIndex = 0;
    const messageTimer = setInterval(() => {
      if (cancelled) return;
      stageIndex = (stageIndex + 1) % stages.length;
      setPrepareMessage(stages[stageIndex]);
    }, 1350);

    const progressTimer = setInterval(() => {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const progress = Math.min(95, Math.round((elapsed / minDuration) * 100));
      setPrepareProgress(progress);
    }, 160);

    const run = async () => {
      try {
        const response = await api.get(`/courses/lessons/${params.id}`);
        if (!cancelled) setLesson(response.data);
      } catch (error: any) {
        if (!cancelled) {
          setLesson(null);
          showToast(error.response?.data?.error || 'Failed to load lesson');
        }
      } finally {
        const elapsed = Date.now() - start;
        const remain = Math.max(0, minDuration - elapsed);
        setTimeout(() => {
          if (cancelled) return;
          setPrepareProgress(100);
          setIsPreparing(false);
          clearInterval(messageTimer);
          clearInterval(progressTimer);
        }, remain);
      }
    };

    run();

    return () => {
      cancelled = true;
      clearInterval(messageTimer);
      clearInterval(progressTimer);
    };
  }, [params.id, uiLanguage]);

  useEffect(() => {
    return () => {
      pdfBinaryRef.current = null;
      pdfDocumentRef.current = null;
      renderingPagesRef.current.clear();
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
    setAlternateExplanation('');
    setPageImageByPage({});
    setPageRenderError(null);
    pdfBinaryRef.current = null;
    pdfDocumentRef.current = null;
    renderingPagesRef.current.clear();
  }, [lesson?.id]);

  const ensurePdfBinaryLoaded = async (): Promise<boolean> => {
    if (!lesson?.id || !lesson.pdf_path) return false;
    if (pdfBinaryRef.current) return true;
    if (isLoadingPdf) return false;

    setIsLoadingPdf(true);
    setPageRenderError(null);
    try {
      const response = await api.get(`/courses/lessons/${lesson.id}/pdf`, { responseType: 'arraybuffer' });
      pdfBinaryRef.current = response.data;
      return true;
    } catch (error: any) {
      pdfBinaryRef.current = null;
      const message = error.response?.data?.error || 'Failed to load PDF pages';
      setPageRenderError(message);
      showToast(message);
      return false;
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const ensurePageImage = async (page: number) => {
    if (!lesson?.pdf_path) return;
    const requestedPage = Math.max(1, Number(page) || 1);
    if (pageImageByPage[requestedPage]) return;
    if (renderingPagesRef.current.has(requestedPage)) return;

    const loaded = await ensurePdfBinaryLoaded();
    if (!loaded) return;

    renderingPagesRef.current.add(requestedPage);
    setIsRenderingPageImage(true);
    setPageRenderError(null);

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
      const totalPages = Number(pdfDoc?.numPages || requestedPage);
      const safePage = Math.max(1, Math.min(totalPages, requestedPage));

      if (pageImageByPage[safePage]) return;

      const pageObj = await pdfDoc.getPage(safePage);
      const viewport = pageObj.getViewport({ scale: 1.35 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) throw new Error('Canvas rendering is unavailable');

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await pageObj.render({ canvasContext: context, viewport }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setPageImageByPage((prev) => (prev[safePage] ? prev : { ...prev, [safePage]: dataUrl }));
    } catch (error: any) {
      const message = error?.message || 'Failed to render page image';
      setPageRenderError(message);
      showToast(message);
    } finally {
      renderingPagesRef.current.delete(requestedPage);
      setIsRenderingPageImage(renderingPagesRef.current.size > 0);
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

  const localizedContent = useMemo(() => {
    if (!lesson) return '';
    if (uiLanguage === 'UZ') return normalizeText(lesson.content_uz || lesson.content_source || lesson.content_ru || lesson.content);
    return normalizeText(lesson.content_ru || lesson.content_source || lesson.content_uz || lesson.content);
  }, [lesson, uiLanguage]);

  const keyPoints = useMemo(() => {
    const raw = pickLocalized(lesson?.key_points_json, uiLanguage);
    const normalized = Array.isArray(raw) ? raw.map((item: any) => normalizeText(item)).filter(Boolean).slice(0, 10) : [];
    return normalized.length > 0 ? normalized : fallbackKeyPoints(uiLanguage);
  }, [lesson?.key_points_json, uiLanguage]);

  const glossary = useMemo(() => {
    const raw = pickLocalized(lesson?.glossary_json, uiLanguage);
    const normalized = normalizeGlossary(raw);
    return normalized.length > 0 ? normalized : fallbackGlossary(uiLanguage);
  }, [lesson?.glossary_json, uiLanguage]);

  const practical = useMemo(() => {
    const raw = normalizeText(pickLocalized(lesson?.practice_notes, uiLanguage));
    if (raw) return raw;
    if (uiLanguage === 'UZ') {
      return "3 ta chartda setupni tekshiring: kirish, stop-loss va targetni oldindan belgilang.";
    }
    return 'Проверьте сетап на 3 графиках: заранее определите вход, стоп и цель.';
  }, [lesson?.practice_notes, uiLanguage]);

  const commonMistakes = useMemo(() => {
    const raw = pickLocalized(lesson?.common_mistakes_json, uiLanguage);
    const normalized = Array.isArray(raw) ? raw.map((item: any) => normalizeText(item)).filter(Boolean).slice(0, 8) : [];
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
    const raw = pickLocalized(lesson?.self_check_questions_json, uiLanguage);
    const normalized = Array.isArray(raw) ? raw.map((item: any) => normalizeText(item)).filter(Boolean).slice(0, 8) : [];
    if (normalized.length > 0) return normalized;
    return uiLanguage === 'UZ'
      ? [
          "Asosiy signalni qanday tasdiqlaysiz?",
          "Bitimdan oldin qaysi risk-checklist bandini tekshirasiz?",
          "Noto'g'ri scenariyda chiqish rejangiz qanday?",
        ]
      : [
          'Как вы подтверждаете главный сигнал урока?',
          'Какое риск-правило проверяете до входа?',
          'Какой план выхода при неверном сценарии?',
        ];
  }, [lesson?.self_check_questions_json, uiLanguage]);

  const homework = useMemo(() => {
    const raw = normalizeText(pickLocalized(lesson?.homework_json, uiLanguage));
    if (raw) return raw;
    if (uiLanguage === 'UZ') {
      return "5 ta tarixiy chart tanlang, setup sifatini 1-10 baholang va xatolarni jurnalga yozing.";
    }
    return 'Выберите 5 исторических графиков, оцените качество сетапа 1-10 и зафиксируйте ошибки в журнале.';
  }, [lesson?.homework_json, uiLanguage]);

  const remember = useMemo(() => {
    const conclusion = normalizeText(pickLocalized(lesson?.conclusion_json, uiLanguage));
    const additional = normalizeText(pickLocalized(lesson?.additional_notes_json, uiLanguage));
    const merged = `${conclusion} ${additional}`.trim();
    if (merged) return merged;
    return keyPoints.slice(0, 3).join(' ');
  }, [lesson?.conclusion_json, lesson?.additional_notes_json, keyPoints, uiLanguage]);

  const quizItems = useMemo(() => {
    const fromLessonTest = normalizeQuiz(pickLocalized(lesson?.lesson_test_json, uiLanguage));
    if (fromLessonTest.length > 0) return fromLessonTest;

    const fromLegacyQuiz = normalizeQuiz(pickLocalized(lesson?.quiz_json, uiLanguage));
    if (fromLegacyQuiz.length > 0) return fromLegacyQuiz;

    return fallbackQuiz(uiLanguage);
  }, [lesson?.lesson_test_json, lesson?.quiz_json, uiLanguage]);

  const steps = useMemo(() => {
    const parsed = normalizeSteps(pickLocalized(lesson?.lesson_steps_json, uiLanguage));
    if (hasJourneyShape(parsed)) return enrichStepsForUi(parsed);
    return enrichStepsForUi(buildFallbackJourneySteps(uiLanguage, localizedSummary, localizedContent, practical, commonMistakes, remember, quizItems.length));
  }, [lesson?.lesson_steps_json, uiLanguage, localizedSummary, localizedContent, practical, commonMistakes, remember, quizItems.length]);

  const visualBlocks = useMemo(() => {
    const parsed = normalizeVisualBlocks(lesson?.visual_blocks_json);
    if (parsed.length > 0) return parsed;

    if (!lesson?.pdf_path) return [];

    return steps
      .filter((step) => step.step_type === 'visual' || !!step.visual_hint)
      .slice(0, 4)
      .map((step, index) => ({
        step_id: step.step_id,
        page_from: Math.max(1, step.page_from || index + 1),
        page_to: Math.max(Math.max(1, step.page_from || index + 1), step.page_to || step.page_from || index + 1),
        visual_kind: 'page_fragment' as const,
        caption_ru: step.title,
        caption_uz: step.title,
        importance_ru: step.what_to_notice || 'Смотрите на связку контекста и подтверждения.',
        importance_uz: step.what_to_notice || "Kontekst va tasdiq bog'lanishiga e'tibor bering.",
        page_excerpt: step.source_excerpt,
        focus_points_ru: splitSentences(step.what_to_notice || '').slice(0, 3),
        focus_points_uz: splitSentences(step.what_to_notice || '').slice(0, 3),
      }));
  }, [lesson?.visual_blocks_json, lesson?.pdf_path, steps]);

  useEffect(() => {
    if (activeStepIndex > Math.max(0, steps.length - 1)) {
      setActiveStepIndex(Math.max(0, steps.length - 1));
    }
  }, [activeStepIndex, steps.length]);

  const currentStep = steps[Math.min(activeStepIndex, Math.max(0, steps.length - 1))];

  const currentVisual = useMemo(() => {
    if (!currentStep) return null;
    const fromBlock = visualBlocks.find((item) => item.step_id === currentStep.step_id);
    if (fromBlock) return fromBlock;
    return {
      step_id: currentStep.step_id,
      page_from: Math.max(1, currentStep.page_from || 1),
      page_to: Math.max(Math.max(1, currentStep.page_from || 1), currentStep.page_to || currentStep.page_from || 1),
      visual_kind: 'page_fragment' as const,
      caption_ru: currentStep.title,
      caption_uz: currentStep.title,
      importance_ru: currentStep.notes || currentStep.what_to_notice,
      importance_uz: currentStep.notes || currentStep.what_to_notice,
      page_excerpt: currentStep.page_text || currentStep.source_excerpt,
      focus_points_ru: splitSentences(currentStep.notes || currentStep.what_to_notice || '').slice(0, 3),
      focus_points_uz: splitSentences(currentStep.notes || currentStep.what_to_notice || '').slice(0, 3),
    } as VisualBlock;
  }, [currentStep, visualBlocks]);

  useEffect(() => {
    if (!currentVisual || !lesson?.pdf_path) return;
    void ensurePageImage(currentVisual.page_from || currentStep?.page_from || 1);
  }, [currentVisual?.step_id, currentVisual?.page_from, currentStep?.page_from, lesson?.pdf_path]);

  useEffect(() => {
    setVisitedSteps((prev) => {
      const copySet = new Set(prev);
      copySet.add(activeStepIndex);
      return copySet;
    });
    setAlternateExplanation('');
  }, [activeStepIndex]);

  const progressPercent = Math.round(((activeStepIndex + 1) / Math.max(steps.length, 1)) * 100);

  const quizScore = useMemo(() => {
    if (!quizSubmitted || quizItems.length === 0) return null;
    let score = 0;
    quizItems.forEach((item, idx) => {
      if (Number(quizAnswers[idx]) === Number(item.correct_index)) score += 1;
    });
    return score;
  }, [quizSubmitted, quizItems, quizAnswers]);

  const buildLessonContext = (step?: LessonStep) => {
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
      lessonSteps: steps,
      visualBlocks,
      keyPoints,
      glossary,
      practice: practical,
      commonMistakes,
      selfCheckQuestions: selfCheck,
      homework,
      currentStepId: step?.step_id,
      currentStepIndex: step?.step_index,
      currentStepTitle: step?.title,
      currentStepType: step?.step_type,
      currentStepExplanation: step?.ai_explanation || step?.explanation,
      currentStepNotes: step?.notes || step?.what_to_notice,
      currentStepPractical: step?.practical_interpretation,
      currentStepPageText: step?.page_text || step?.source_excerpt,
      currentStepPageImage: step?.page_image,
      currentStepPageFrom: step?.page_from,
      currentStepPageTo: step?.page_to,
    };
  };

  const pushAiWithContext = (prefillMessage: string, step?: LessonStep) => {
    const context = buildLessonContext(step || currentStep);
    localStorage.setItem('ai_prefill', prefillMessage);
    localStorage.setItem('ai_lesson_context', JSON.stringify(context));
    router.push('/ai');
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
    if (next) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
    showToast(next ? copy.favoriteAdded : copy.favoriteRemoved);
  };

  const goToStep = (index: number) => {
    const safe = Math.max(0, Math.min(steps.length - 1, index));
    setActiveStepIndex(safe);
  };

  const goToNextStep = () => {
    goToStep(activeStepIndex + 1);
  };

  const goToPrevStep = () => {
    goToStep(activeStepIndex - 1);
  };

  const handleUnderstood = async () => {
    if (activeStepIndex < steps.length - 1) {
      goToNextStep();
      return;
    }

    if (lesson?.next_lesson_id) {
      router.push(`/dashboard/lessons/${lesson.next_lesson_id}`);
      return;
    }

    if (!lesson?.is_completed) {
      await markLessonCompleted();
    }
  };

  const handleExplainDifferently = async () => {
    if (!lesson || !currentStep || isReframing) return;
    setIsReframing(true);
    try {
      const prompt = uiLanguage === 'UZ'
        ? [
            `Ushbu qadamni boshqacha, soddaroq va aniqroq tushuntiring.`,
            `Qadam: ${currentStep.title}`,
            `Qadam turi: ${currentStep.step_type}`,
            `Mavjud izoh: ${stepExplanationText}`,
            `Iltimos:`,
            `1) oddiy til`,
            `2) amaliy misol`,
            `3) yangi boshlovchi nimani adashtirmasligi kerak`,
          ].join('\n')
        : [
            'Объясни этот шаг иначе: проще, глубже и практичнее.',
            `Шаг: ${currentStep.title}`,
            `Тип шага: ${currentStep.step_type}`,
            `Текущее объяснение: ${stepExplanationText}`,
            'Сделай ответ в 3 блоках:',
            '1) простое объяснение',
            '2) практический пример для трейдинга',
            '3) что новичок может перепутать',
          ].join('\n');

      const response = await api.post('/ai/chat', {
        message: prompt,
        context: buildLessonContext(currentStep),
      });

      const alt = normalizeText(response.data?.response);
      if (alt) {
        setAlternateExplanation(alt);
        showToast(copy.reframedToast);
      } else {
        showToast(copy.reframedError);
      }
    } catch (error: any) {
      showToast(error.response?.data?.error || copy.reframedError);
    } finally {
      setIsReframing(false);
    }
  };

  const handleAskQuestion = () => {
    const prefill = uiLanguage === 'UZ'
      ? `${copy.questionPrefill}\n\nQadam: ${currentStep?.title || ''}`
      : `${copy.questionPrefill}\n\nШаг: ${currentStep?.title || ''}`;
    pushAiWithContext(prefill, currentStep);
  };

  const handleAskAi = () => {
    const prefill = uiLanguage === 'UZ'
      ? [
          'Ushbu darsni mentor kabi to`liq tahlil qiling.',
          `Course: ${lesson?.course_title || ''}`,
          `Module: ${lesson?.module_title || ''}`,
          `Lesson: ${lesson?.title || ''}`,
          `Current step: ${currentStep?.title || ''}`,
          `Summary: ${localizedSummary}`,
        ].join('\n')
      : [
          'Разберите этот урок как наставник и дайте практический план.',
          `Course: ${lesson?.course_title || ''}`,
          `Module: ${lesson?.module_title || ''}`,
          `Lesson: ${lesson?.title || ''}`,
          `Current step: ${currentStep?.title || ''}`,
          `Summary: ${localizedSummary}`,
        ].join('\n');

    pushAiWithContext(prefill, currentStep);
  };

  const visualImportance = uiLanguage === 'UZ' ? currentVisual?.importance_uz : currentVisual?.importance_ru;
  const visualCaption = uiLanguage === 'UZ' ? currentVisual?.caption_uz : currentVisual?.caption_ru;
  const visualFocusPoints = uiLanguage === 'UZ' ? currentVisual?.focus_points_uz : currentVisual?.focus_points_ru;

  const stepExplanationText = normalizeText(currentStep?.ai_explanation || currentStep?.explanation || '');
  const stepNotesText = normalizeText(currentStep?.notes || currentStep?.what_to_notice || '');
  const stepPracticalText = normalizeText(
    currentStep?.practical_interpretation || (currentStep?.step_type === 'practice' ? practical : ''),
  );
  const stepPageText = normalizeText(currentStep?.page_text || currentStep?.source_excerpt || '');

  const currentVisualPage = Math.max(1, Number(currentVisual?.page_from || currentStep?.page_from || 1));
  const rawStepImage = normalizeText(currentStep?.page_image || '');
  const directStepImage = rawStepImage && !rawStepImage.startsWith('page:') ? rawStepImage : '';
  const renderedPageImage = pageImageByPage[currentVisualPage] || '';
  const currentPageImage = directStepImage || renderedPageImage;

  if (!user) return null;

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: '#0B1220' }}>
      <div className="pointer-events-none absolute -top-40 left-[-10%] h-[420px] w-[420px] rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(123,63,228,0.35), transparent 70%)' }} />
      <div className="pointer-events-none absolute top-[35%] right-[-8%] h-[360px] w-[360px] rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(42,169,255,0.3), transparent 70%)' }} />

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            className="fixed top-5 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-white text-sm font-semibold"
            style={{ transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)', boxShadow: '0 8px 32px rgba(123,63,228,0.45)' }}
          >
            <Sparkles size={14} />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="sticky top-0 z-[100] px-6 md:px-10 py-4 flex items-center justify-between" style={{ background: 'rgba(11,18,32,0.82)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(123,63,228,0.16)' }}>
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
          <div className="flex items-center bg-[#111A2F] rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setLanguage('RU')}
              className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all', language === 'RU' ? 'text-white' : 'text-slate-500 hover:text-slate-300')}
              style={language === 'RU' ? { background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' } : undefined}
            >
              RU
            </button>
            <button
              onClick={() => setLanguage('UZ')}
              className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all', language === 'UZ' ? 'text-white' : 'text-slate-500 hover:text-slate-300')}
              style={language === 'UZ' ? { background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' } : undefined}
            >
              UZ
            </button>
          </div>

          <div className="relative group">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer" style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.2)' }}>
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

      <main className="relative z-[1] flex-1 px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
        {isPreparing ? (
          <div className="min-h-[72vh] flex items-center justify-center">
            <div className="w-full max-w-3xl rounded-3xl p-8 md:p-10" style={{ background: 'linear-gradient(135deg, rgba(123,63,228,0.22), rgba(42,169,255,0.15))', border: '1px solid rgba(123,63,228,0.34)' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(123,63,228,0.28)' }}>
                  <BrainCircuit size={22} style={{ color: '#D8CCFF' }} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: '#B8C8DE' }}>AI Lesson Preparation</p>
                  <h2 className="text-2xl md:text-3xl font-black text-white mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{copy.loadingTitle}</h2>
                </div>
              </div>

              <p className="text-sm mt-5" style={{ color: '#D5E2F4' }}>{prepareMessage}</p>

              <div className="mt-4 h-2 rounded-full" style={{ background: 'rgba(123,63,228,0.22)' }}>
                <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${prepareProgress}%`, background: 'linear-gradient(90deg, #7B3FE4, #2AA9FF)' }} />
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-2">
                {copy.loadingTags.map((item) => (
                  <div key={item} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: 'rgba(11,18,32,0.5)', color: '#C8D4E8', border: '1px solid rgba(123,140,166,0.15)' }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !lesson ? (
          <div className="glass-card p-10 text-center" style={{ border: '2px dashed rgba(123,63,228,0.2)' }}>
            <FileText size={30} style={{ color: '#7B3FE4' }} className="mx-auto mb-3" />
            <p className="text-white font-bold">{copy.lessonNotFound}</p>
            <p className="text-sm mt-1" style={{ color: '#7B8CA6' }}>{copy.lessonNotFoundHint}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <button
                onClick={() => router.push(`/dashboard/courses/${lesson.course_id}`)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.2)', color: '#A87BFF' }}
              >
                <ArrowLeft size={16} /> {copy.back}
              </button>

              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(11,18,32,0.5)', border: '1px solid rgba(123,140,166,0.22)' }}>
                <Circle size={10} style={{ color: '#2AA9FF' }} />
                <span className="text-xs font-semibold" style={{ color: '#C8D4E8' }}>
                  Step {activeStepIndex + 1}/{steps.length} · {progressPercent}%
                </span>
              </div>
            </div>

            <section className="rounded-3xl p-6 md:p-7 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(123,63,228,0.22), rgba(42,169,255,0.1))', border: '1px solid rgba(123,63,228,0.3)' }}>
              <div className="absolute -right-14 -top-14 w-52 h-52 rounded-full blur-3xl" style={{ background: 'rgba(42,169,255,0.18)' }} />
              <div className="absolute -left-10 -bottom-16 w-52 h-52 rounded-full blur-3xl" style={{ background: 'rgba(123,63,228,0.2)' }} />

              <div className="relative z-[1]">
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#B5C8E2' }}>
                  {lesson.course_title} · {lesson.module_title}
                </p>
                <h1 className="text-3xl md:text-4xl font-black mt-2" style={{ fontFamily: 'Outfit, sans-serif' }}>{lesson.title}</h1>
                <p className="mt-3 text-sm leading-7 max-w-4xl" style={{ color: '#DCE7F7' }}>{localizedSummary}</p>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ background: 'rgba(42,169,255,0.14)', border: '1px solid rgba(42,169,255,0.3)', color: '#67D5FF' }}>
                    {lesson.lesson_type || 'theory'}
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#6EE7B7' }}>
                    {lesson.difficulty_level || 'Beginner'}
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ background: 'rgba(123,63,228,0.14)', border: '1px solid rgba(123,63,228,0.3)', color: '#D8CCFF' }}>
                    <Languages size={12} className="inline mr-1" /> {lesson.source_language || 'UNKNOWN'}
                  </span>
                  {lesson.source_section && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(123,140,166,0.28)', color: '#B8C8DE' }}>
                      {lesson.source_section}
                    </span>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={markLessonCompleted}
                    disabled={lesson.is_completed || isCompleting}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                    style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.36)', color: '#6EE7B7' }}
                  >
                    {isCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {lesson.is_completed ? copy.completed : copy.markComplete}
                  </button>

                  <button
                    onClick={handleAskAi}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)', boxShadow: '0 6px 26px rgba(123,63,228,0.35)' }}
                  >
                    <Brain size={14} /> {copy.askAi}
                  </button>

                  <button
                    onClick={toggleFavorite}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                    style={{
                      background: isFavorite ? 'rgba(250,204,21,0.14)' : '#111A2F',
                      border: `1px solid ${isFavorite ? 'rgba(250,204,21,0.42)' : 'rgba(123,140,166,0.3)'}`,
                      color: isFavorite ? '#FDE68A' : '#D5E2F4',
                    }}
                  >
                    <Bookmark size={14} />
                    {isFavorite ? copy.inFavorite : copy.addFavorite}
                  </button>

                </div>
              </div>
            </section>

            <section className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(11,18,32,0.6)', border: '1px solid rgba(123,63,228,0.18)' }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: '#A87BFF' }}>{copy.journey}</p>
                  <p className="text-xs mt-1" style={{ color: '#9AB1D2' }}>{copy.journeyHint}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {steps.map((step, index) => {
                  const isActive = index === activeStepIndex;
                  const isVisited = visitedSteps.has(index);
                  return (
                    <button
                      key={step.step_id}
                      onClick={() => goToStep(index)}
                      className="min-w-[210px] text-left rounded-xl px-3 py-2.5 transition-all"
                      style={isActive
                        ? { background: 'rgba(123,63,228,0.22)', border: '1px solid rgba(123,63,228,0.48)' }
                        : { background: 'rgba(17,26,47,0.78)', border: '1px solid rgba(123,140,166,0.2)' }}
                    >
                      <p className="text-[11px] font-black uppercase" style={{ color: isActive ? '#D8CCFF' : '#7B8CA6' }}>
                        Step {index + 1} {isVisited ? '•' : ''}
                      </p>
                      <p className="text-sm mt-1 line-clamp-2" style={{ color: isActive ? '#FFFFFF' : '#C8D4E8' }}>
                        {step.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-5 glass-card p-5" style={{ border: '1px solid rgba(42,169,255,0.2)' }}>
                <p className="text-xs uppercase tracking-wider font-black" style={{ color: '#67D5FF' }}>
                  <FileText size={12} className="inline mr-1" />
                  {copy.visualTitle}
                </p>

                {currentVisual ? (
                  <>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-md" style={{ background: 'rgba(42,169,255,0.12)', border: '1px solid rgba(42,169,255,0.28)', color: '#67D5FF' }}>
                        p.{currentVisual.page_from}-{currentVisual.page_to}
                      </span>
                      <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-md" style={{ background: 'rgba(123,63,228,0.12)', border: '1px solid rgba(123,63,228,0.24)', color: '#D8CCFF' }}>
                        {currentVisual.visual_kind}
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(42,169,255,0.2)', background: '#0A1020' }}>
                      {(isLoadingPdf || isRenderingPageImage) && (
                        <div className="px-3 py-2 text-xs flex items-center gap-2" style={{ color: '#9AB1D2' }}>
                          <Loader2 size={12} className="animate-spin" /> {copy.visualLoading}
                        </div>
                      )}

                      {currentPageImage ? (
                        <img
                          src={currentPageImage}
                          alt={`Lesson page ${currentVisualPage}`}
                          className="w-full"
                          style={{ maxHeight: '520px', objectFit: 'contain', background: '#0A1020' }}
                        />
                      ) : (
                        <div className="p-5 text-center">
                          {lesson?.pdf_path ? (
                            <button
                              onClick={() => void ensurePageImage(currentVisualPage)}
                              className="px-4 py-2 rounded-lg text-sm font-bold"
                              style={{ background: 'rgba(42,169,255,0.2)', border: '1px solid rgba(42,169,255,0.35)', color: '#67D5FF' }}
                            >
                              {copy.visualLoad}
                            </button>
                          ) : (
                            <p className="text-xs" style={{ color: '#9AB1D2' }}>
                              Source PDF page is not attached for this lesson.
                            </p>
                          )}
                          {pageRenderError && (
                            <p className="text-xs mt-2" style={{ color: '#FCA5A5' }}>{pageRenderError}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {visualCaption && (
                      <p className="text-sm font-semibold mt-3 text-white">{visualCaption}</p>
                    )}
                    {visualImportance && (
                      <p className="text-sm mt-2 leading-7" style={{ color: '#D8ECFF' }}>{visualImportance}</p>
                    )}

                    {Array.isArray(visualFocusPoints) && visualFocusPoints.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {visualFocusPoints.map((item, idx) => (
                          <li key={`focus-${idx}-${item.slice(0, 20)}`} className="text-xs" style={{ color: '#9AB1D2' }}>
                            <Target size={11} className="inline mr-1" style={{ color: '#67D5FF' }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    {currentVisual.page_excerpt && (
                      <div className="mt-3 rounded-lg p-3" style={{ background: 'rgba(17,26,47,0.8)', border: '1px solid rgba(123,140,166,0.22)' }}>
                        <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: '#9AB1D2' }}>{copy.sourceFragment}</p>
                        <p className="text-xs mt-2 leading-6" style={{ color: '#C8D4E8' }}>{currentVisual.page_excerpt}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-3 rounded-xl p-5 text-sm" style={{ background: 'rgba(17,26,47,0.8)', border: '1px solid rgba(123,140,166,0.2)', color: '#9AB1D2' }}>
                    {copy.visualEmpty}
                  </div>
                )}
              </div>

              <div className="xl:col-span-7 glass-card p-5" style={{ border: '1px solid rgba(123,63,228,0.18)' }}>
                {currentStep && (
                  <>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] font-black" style={{ color: '#9AB1D2' }}>
                          Step {activeStepIndex + 1}/{steps.length} · {STEP_LABELS[uiLanguage][currentStep.step_type]}
                        </p>
                        <h2 className="text-2xl font-black mt-1 text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>{currentStep.title}</h2>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm leading-7" style={{ color: '#D5E2F4' }}>{stepExplanationText}</p>
                    </div>

                    {stepNotesText && (
                      <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(11,18,32,0.6)', border: '1px solid rgba(42,169,255,0.22)' }}>
                        <p className="text-xs font-black uppercase tracking-wide" style={{ color: '#67D5FF' }}>{copy.whatToNotice}</p>
                        <p className="text-sm mt-2" style={{ color: '#D8ECFF' }}>{stepNotesText}</p>
                      </div>
                    )}

                    {stepPracticalText && (
                      <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.28)' }}>
                        <p className="text-xs uppercase font-black" style={{ color: '#6EE7B7' }}>{copy.practicalUse}</p>
                        <p className="text-sm mt-2" style={{ color: '#D4FBEA' }}>{stepPracticalText}</p>
                      </div>
                    )}

                    {stepPageText && (
                      <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(17,26,47,0.8)', border: '1px solid rgba(123,140,166,0.22)' }}>
                        <p className="text-xs font-black uppercase tracking-wide" style={{ color: '#9AB1D2' }}>{copy.sourceFragment}</p>
                        <p className="text-sm mt-2" style={{ color: '#C8D4E8' }}>{stepPageText}</p>
                      </div>
                    )}

                    {alternateExplanation && (
                      <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.32)' }}>
                        <p className="text-xs font-black uppercase tracking-wide" style={{ color: '#6EE7B7' }}>
                          <Sparkles size={12} className="inline mr-1" /> {copy.altExplanation}
                        </p>
                        <p className="text-sm mt-2 leading-7" style={{ color: '#D4FBEA' }}>{alternateExplanation}</p>
                      </div>
                    )}

                    {(currentStep.step_type === 'intro' || currentStep.step_type === 'concept' || currentStep.step_type === 'visual') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="rounded-xl p-3" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(123,63,228,0.22)' }}>
                          <p className="text-xs uppercase font-black" style={{ color: '#C6ADFF' }}>{copy.keyComponents}</p>
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
                      <div className="rounded-xl p-3 mt-4" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.28)' }}>
                        <p className="text-xs uppercase font-black" style={{ color: '#FCD34D' }}>{copy.quickRules}</p>
                        <ul className="mt-2 space-y-1.5">
                          {keyPoints.slice(0, 4).map((item, idx) => (
                            <li key={`rule-${idx}-${item.slice(0, 20)}`} className="text-sm" style={{ color: '#FDE68A' }}>
                              <Check size={12} className="inline mr-1" /> {item}
                            </li>
                          ))}
                        </ul>
                        {stepPracticalText && (
                          <p className="text-sm mt-3" style={{ color: '#FDE68A' }}>{stepPracticalText}</p>
                        )}
                      </div>
                    )}

                    {currentStep.step_type === 'mistakes' && (
                      <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.26)' }}>
                        <p className="text-xs uppercase font-black" style={{ color: '#FCA5A5' }}>{copy.commonMistakes}</p>
                        <ul className="mt-2 space-y-1.5">
                          {commonMistakes.slice(0, 8).map((item, idx) => (
                            <li key={`mistake-${idx}-${item.slice(0, 20)}`} className="text-sm" style={{ color: '#FECACA' }}>
                              <span className="font-black mr-2">{idx + 1}.</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(currentStep.step_type === 'takeaway' || currentStep.step_type === 'next') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.26)' }}>
                          <p className="text-xs uppercase font-black" style={{ color: '#A5B4FC' }}>{copy.summary}</p>
                          <p className="text-sm mt-2" style={{ color: '#D6DBFF' }}>{remember}</p>
                        </div>

                        <div className="rounded-xl p-3" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.26)' }}>
                          <p className="text-xs uppercase font-black" style={{ color: '#7DD3FC' }}>{copy.selfCheck}</p>
                          <ul className="mt-2 space-y-1.5">
                            {selfCheck.slice(0, 4).map((item, idx) => (
                              <li key={`self-${idx}-${item.slice(0, 20)}`} className="text-sm" style={{ color: '#D8F2FF' }}>
                                <span className="font-black mr-2">{idx + 1}.</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="mt-5 rounded-xl p-3" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.24)' }}>
                      <p className="text-xs uppercase font-black" style={{ color: '#FACC15' }}>{copy.homework}</p>
                      <p className="text-sm mt-2" style={{ color: '#FDE68A' }}>{homework}</p>
                    </div>

                    <div className="mt-5 rounded-xl p-4" style={{ background: 'rgba(11,18,32,0.6)', border: '1px solid rgba(123,140,166,0.26)' }}>
                      <p className="text-xs uppercase font-black tracking-wide" style={{ color: '#B8C8DE' }}>{copy.quickReplies}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={handleUnderstood}
                          className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                          style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}
                        >
                          {copy.understood}
                        </button>

                        <button
                          onClick={handleExplainDifferently}
                          disabled={isReframing}
                          className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60"
                          style={{ background: '#111A2F', border: '1px solid rgba(42,169,255,0.3)', color: '#67D5FF' }}
                        >
                          {isReframing ? <Loader2 size={14} className="inline mr-1 animate-spin" /> : null}
                          {copy.explainAgain}
                        </button>

                        <button
                          onClick={handleAskQuestion}
                          className="px-4 py-2 rounded-lg text-sm font-bold"
                          style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.3)', color: '#D8CCFF' }}
                        >
                          <MessageCircle size={14} className="inline mr-1" /> {copy.askQuestion}
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                        <button
                          onClick={goToPrevStep}
                          disabled={activeStepIndex === 0}
                          className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
                          style={{ background: '#111A2F', border: '1px solid rgba(123,140,166,0.25)', color: '#C8D4E8' }}
                        >
                          {copy.previousStep}
                        </button>

                        <button
                          onClick={goToNextStep}
                          disabled={activeStepIndex >= steps.length - 1}
                          className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
                          style={{ background: 'rgba(123,63,228,0.2)', border: '1px solid rgba(123,63,228,0.35)', color: '#D8CCFF' }}
                        >
                          {copy.nextStep} <ChevronRight size={14} className="inline ml-1" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {currentStep?.step_type === 'quiz' && (
              <section className="glass-card p-5 mt-4" style={{ border: '1px solid rgba(16,185,129,0.24)' }}>
                <p className="text-xs uppercase font-black tracking-wide" style={{ color: '#34D399' }}>{copy.quizTitle}</p>
                <p className="text-sm mt-1" style={{ color: '#9DECCB' }}>{copy.quizHint}</p>

                <div className="mt-4 space-y-4">
                  {quizItems.map((item, qIdx) => {
                    const selected = quizAnswers[qIdx];
                    const isAnswered = typeof selected === 'number';
                    const isCorrect = isAnswered && selected === item.correct_index;

                    return (
                      <div key={`quiz-${qIdx}-${item.question.slice(0, 20)}`} className="rounded-xl p-4" style={{ background: 'rgba(11,18,32,0.58)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <p className="text-sm font-semibold text-white">{qIdx + 1}. {item.question}</p>
                        <div className="mt-3 space-y-2">
                          {item.options.map((option, oIdx) => {
                            const selectedThis = selected === oIdx;
                            const correctOption = quizSubmitted && oIdx === item.correct_index;
                            const wrongSelection = quizSubmitted && selectedThis && oIdx !== item.correct_index;

                            return (
                              <button
                                key={`quiz-${qIdx}-opt-${oIdx}`}
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

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setQuizSubmitted(true)}
                    disabled={quizSubmitted || Object.keys(quizAnswers).length < quizItems.length}
                    className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#ECFDF5' }}
                  >
                    {copy.checkResult}
                  </button>

                  <button
                    onClick={() => {
                      setQuizAnswers({});
                      setQuizSubmitted(false);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-bold"
                    style={{ background: '#111A2F', border: '1px solid rgba(123,140,166,0.25)', color: '#C8D4E8' }}
                  >
                    {copy.resetQuiz}
                  </button>

                  {quizSubmitted && typeof quizScore === 'number' && (
                    <p className="text-sm font-bold" style={{ color: '#6EE7B7' }}>
                      {copy.score}: {quizScore}/{quizItems.length}
                    </p>
                  )}
                </div>
              </section>
            )}

            {(currentStep?.step_type === 'next' || activeStepIndex === steps.length - 1) && (
              <section className="glass-card p-5 mt-4" style={{ border: '1px solid rgba(123,63,228,0.24)' }}>
                <p className="text-xs uppercase font-black tracking-wide" style={{ color: '#D8CCFF' }}>{copy.completeBeforeNext}</p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={markLessonCompleted}
                    disabled={lesson.is_completed || isCompleting}
                    className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                    style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.36)', color: '#6EE7B7' }}
                  >
                    {isCompleting ? <Loader2 size={14} className="inline mr-1 animate-spin" /> : <CheckCircle2 size={14} className="inline mr-1" />}
                    {lesson.is_completed ? copy.completed : copy.markComplete}
                  </button>

                  {lesson.next_lesson_id ? (
                    <button
                      onClick={() => router.push(`/dashboard/lessons/${lesson.next_lesson_id}`)}
                      className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}
                    >
                      {copy.nextLesson} <ChevronRight size={14} className="inline ml-1" />
                    </button>
                  ) : (
                    <p className="text-sm" style={{ color: '#9AB1D2' }}>{copy.noNextLesson}</p>
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
