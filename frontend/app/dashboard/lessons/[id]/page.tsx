'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IBM_Plex_Sans, PT_Serif } from 'next/font/google';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Languages,
  Loader2,
  MessageCircleQuestion,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

const displayFont = PT_Serif({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700'],
  variable: '--font-lesson-display',
});

const bodyFont = IBM_Plex_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-lesson-body',
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
  key_points_json?: unknown;
  glossary_json?: unknown;
  practice_notes?: unknown;
  common_mistakes_json?: unknown;
  self_check_questions_json?: unknown;
  homework_json?: unknown;
  quiz_json?: unknown;
  lesson_steps_json?: unknown;
  visual_blocks_json?: unknown;
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

const STEP_LABELS: Record<UiLanguage, Record<StepType, string>> = {
  RU: {
    intro: 'Введение',
    visual: 'Разбор фрагмента',
    concept: 'Ключевая логика',
    practice: 'Практическая интерпретация',
    mistakes: 'Ловушки и ошибки',
    takeaway: 'Итог и закрепление',
    quiz: 'Проверка понимания',
    next: 'Переход дальше',
  },
  UZ: {
    intro: 'Kirish',
    visual: 'Fragment tahlili',
    concept: 'Asosiy mantiq',
    practice: 'Amaliy talqin',
    mistakes: 'Tuzoq va xatolar',
    takeaway: 'Yakun va mustahkamlash',
    quiz: 'Tekshiruv',
    next: 'Keyingi bosqich',
  },
};

const COPY = {
  RU: {
    loadingTitle: 'Готовим новый формат урока',
    loadingHint: 'Собираем AI-навигацию, фрагменты книги и обучающий поток.',
    notFound: 'Урок не найден',
    notFoundHint: 'Вернитесь в курс и попробуйте открыть урок заново.',
    backToCourse: 'К курсу',
    progress: 'Прогресс',
    language: 'Язык',
    openOriginalPdf: 'Open original PDF',
    openPdfUnavailable: 'Оригинальный PDF для этого урока недоступен',
    openPdfError: 'Не удалось открыть оригинальный PDF',
    type: 'Тип',
    difficulty: 'Сложность',
    source: 'Источник',
    sourceSection: 'Раздел',
    completed: 'Урок завершен',
    inProgress: 'В процессе',
    markComplete: 'Mark complete',
    askAi: 'Ask AI',
    addFavorite: 'Favorite',
    inFavorite: 'In favorite',
    lessonFlow: 'Навигация по шагам',
    lessonFlowHint: 'Легкий chapter-flow: двигайтесь по смыслу, а не по карточкам.',
    stepLabel: 'Шаг',
    sceneTitle: 'Фрагмент книги и рыночная сцена',
    sceneEmpty: 'Для этого шага визуальный фрагмент не обязателен.',
    sceneLoad: 'Показать страницу',
    sceneLoading: 'Рендерим страницу из источника…',
    sourceFragment: 'Цитата из источника',
    mentorExplanation: 'AI-наставник объясняет механику',
    mentorAlternate: 'Альтернативное объяснение',
    notes: 'Важно заметить',
    practical: 'Практическая интерпретация',
    glossary: 'Термины урока',
    mistakes: 'Где чаще всего ошибаются',
    summary: 'Что закрепить после шага',
    selfCheck: 'Вопросы для самопроверки',
    homework: 'Домашняя тренировка',
    quickActions: 'Быстрые действия',
    understood: 'Всё понятно, идём дальше',
    explainAgain: 'Не понял, объясни иначе',
    askQuestion: 'У меня вопрос',
    prevStep: 'Предыдущий шаг',
    nextStep: 'Следующий шаг',
    quizTitle: 'Мини-quiz по уроку',
    quizHint: 'Проверка знаний в конце reading-потока.',
    checkResult: 'Проверить результат',
    resetQuiz: 'Сбросить',
    quizScore: 'Результат',
    quizFillAll: 'Ответьте на все вопросы, чтобы проверить результат.',
    nextBlockTitle: 'Следующий шаг в обучении',
    nextLesson: 'Перейти к следующему уроку',
    noNextLesson: 'Это последний урок в текущей цепочке.',
    completionToast: 'Урок отмечен завершенным',
    completionError: 'Не удалось отметить урок',
    favoriteAdded: 'Урок добавлен в избранное',
    favoriteRemoved: 'Урок удален из избранного',
    reframedToast: 'AI дал альтернативное объяснение шага',
    reframedError: 'Не удалось перегенерировать объяснение',
    questionPrefill: 'У меня вопрос по текущему шагу. Объясни как наставник, глубоко и практично.',
    askAiPrefill: 'Разбери этот урок как наставник и дай практический план применения на графике.',
  },
  UZ: {
    loadingTitle: 'Yangi lesson format tayyorlanmoqda',
    loadingHint: 'AI navigatsiya, kitob fragmentlari va o‘quv oqimi yig‘ilmoqda.',
    notFound: 'Dars topilmadi',
    notFoundHint: 'Kursga qayting va darsni qayta ochib ko‘ring.',
    backToCourse: 'Kursga qaytish',
    progress: 'Progress',
    language: 'Til',
    openOriginalPdf: 'Open original PDF',
    openPdfUnavailable: 'Bu dars uchun original PDF mavjud emas',
    openPdfError: 'Original PDFni ochib bo‘lmadi',
    type: 'Tur',
    difficulty: 'Daraja',
    source: 'Manba',
    sourceSection: 'Bo‘lim',
    completed: 'Dars yakunlangan',
    inProgress: 'Jarayonda',
    markComplete: 'Mark complete',
    askAi: 'Ask AI',
    addFavorite: 'Favorite',
    inFavorite: 'In favorite',
    lessonFlow: 'Qadamlar bo‘yicha navigatsiya',
    lessonFlowHint: 'Og‘ir bloklar emas, yengil chapter-flow orqali o‘qing.',
    stepLabel: 'Qadam',
    sceneTitle: 'Kitob fragmenti va bozor sahnasi',
    sceneEmpty: 'Bu qadam uchun vizual fragment majburiy emas.',
    sceneLoad: 'Sahifani ko‘rsatish',
    sceneLoading: 'Sahifa manbadan render qilinmoqda…',
    sourceFragment: 'Manbadan iqtibos',
    mentorExplanation: 'AI-mentor bozor mexanikasini tushuntiradi',
    mentorAlternate: 'Boshqacha tushuntirish',
    notes: 'Muhim kuzatuvlar',
    practical: 'Amaliy talqin',
    glossary: 'Dars terminlari',
    mistakes: 'Ko‘p xato qilinadigan joylar',
    summary: 'Qadamdan keyin nimani mustahkamlash kerak',
    selfCheck: 'O‘zini tekshirish savollari',
    homework: 'Uyga mashq',
    quickActions: 'Tezkor harakatlar',
    understood: 'Hammasi tushunarli, keyingisiga o‘tamiz',
    explainAgain: 'Tushunmadim, boshqacha tushuntir',
    askQuestion: 'Menda savol bor',
    prevStep: 'Oldingi qadam',
    nextStep: 'Keyingi qadam',
    quizTitle: 'Dars bo‘yicha mini-quiz',
    quizHint: 'Reading oqimi yakunida bilimni tekshirish.',
    checkResult: 'Natijani tekshirish',
    resetQuiz: 'Qayta boshlash',
    quizScore: 'Natija',
    quizFillAll: 'Natijani tekshirish uchun barcha savollarga javob bering.',
    nextBlockTitle: 'Ta’limning keyingi qadami',
    nextLesson: 'Keyingi darsga o‘tish',
    noNextLesson: 'Bu ketma-ketlikdagi oxirgi dars.',
    completionToast: 'Dars yakunlangan deb belgilandi',
    completionError: 'Darsni yakunlashda xatolik yuz berdi',
    favoriteAdded: 'Dars sevimlilarga qo‘shildi',
    favoriteRemoved: 'Dars sevimlilardan olib tashlandi',
    reframedToast: 'AI qadamni boshqacha tushuntirdi',
    reframedError: 'Izohni qayta yaratib bo‘lmadi',
    questionPrefill: 'Joriy qadam bo‘yicha savolim bor. Mentor uslubida chuqur va amaliy tushuntiring.',
    askAiPrefill: 'Ushbu darsni mentor kabi tahlil qiling va chartda qo‘llash rejasini bering.',
  },
} as const;

function normalizeInline(value: unknown): string {
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

function splitSentences(text: string): string[] {
  return normalizeInline(text)
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toBulletPoints(text: string, max = 6): string[] {
  const normalized = normalizeInline(text);
  if (!normalized) return [];

  const fromPipe = normalized
    .split('|')
    .map((item) => normalizeInline(item))
    .filter(Boolean);

  if (fromPipe.length > 1) return fromPipe.slice(0, max);

  return splitSentences(normalized).slice(0, max);
}

function parsePracticalSteps(text: string, max = 5): string[] {
  const normalized = normalizeInline(text);
  if (!normalized) return [];

  const numbered = normalized.match(/\d+\.\s*[^\d]+?(?=(?:\s+\d+\.\s)|$)/g);
  if (Array.isArray(numbered) && numbered.length > 0) {
    return numbered
      .map((item) => normalizeInline(item.replace(/^\d+\.\s*/, '')))
      .filter(Boolean)
      .slice(0, max);
  }

  const fromPipe = normalized
    .split('|')
    .map((item) => normalizeInline(item))
    .filter(Boolean);
  if (fromPipe.length > 1) return fromPipe.slice(0, max);

  return splitSentences(normalized).slice(0, max);
}

function toMentorParagraphs(text: string): string[] {
  const normalized = normalizeInline(text);
  if (!normalized) return [];

  const markerSplit = normalized
    .split(/(?=(?:1️⃣|2️⃣|3️⃣|4️⃣|5️⃣))/g)
    .map((part) => normalizeInline(part))
    .filter(Boolean);

  if (markerSplit.length >= 3) return markerSplit.slice(0, 8);

  const sentences = splitSentences(normalized);
  if (sentences.length <= 2) return [normalized];

  const paragraphs: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > 460 && current) {
      paragraphs.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }

  if (current) paragraphs.push(current);
  if (paragraphs.length >= 3) return paragraphs.slice(0, 8);

  const chunkSize = Math.max(280, Math.ceil(normalized.length / 3));
  const chunks: string[] = [];
  for (let i = 0; i < normalized.length; i += chunkSize) {
    chunks.push(normalized.slice(i, i + chunkSize).trim());
  }
  return chunks.filter(Boolean).slice(0, 8);
}

function normalizeGlossary(raw: unknown): GlossaryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      term: normalizeInline((item as Record<string, unknown>)?.term),
      definition: normalizeInline((item as Record<string, unknown>)?.definition),
    }))
    .filter((item) => item.term && item.definition)
    .slice(0, 12);
}

function normalizeQuiz(raw: unknown): QuizItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const source = item as Record<string, unknown>;
      const question = normalizeInline(source?.question);

      const optionsRaw = Array.isArray(source?.options) ? source.options : [];
      const options = optionsRaw
        .map((option) => normalizeInline(option))
        .filter(Boolean)
        .slice(0, 6);

      if (!question || options.length < 2) return null;

      const correctRaw = Number(source?.correct_index);
      const correct_index = Number.isInteger(correctRaw)
        ? Math.max(0, Math.min(options.length - 1, correctRaw))
        : 0;

      return {
        question,
        options,
        correct_index,
        explanation: normalizeInline(source?.explanation),
      } as QuizItem;
    })
    .filter(Boolean)
    .slice(0, 8) as QuizItem[];
}

function normalizeStepType(value: unknown): StepType {
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

function normalizeSteps(raw: unknown): LessonStep[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      const source = item as Record<string, unknown>;
      const stepIndexRaw = Number(source?.step_index);
      const pageFromRaw = Number(source?.page_from);
      const pageToRaw = Number(source?.page_to);

      const page_from = Number.isInteger(pageFromRaw) ? Math.max(1, pageFromRaw) : 1;
      const page_to = Number.isInteger(pageToRaw) ? Math.max(page_from, pageToRaw) : page_from;

      const page_text = normalizeInline(source?.page_text || source?.source_excerpt);
      const ai_explanation = normalizeInline(source?.ai_explanation || source?.explanation);
      const notes = normalizeInline(source?.notes || source?.what_to_notice);
      const practical_interpretation = normalizeInline(source?.practical_interpretation);

      return {
        step_index: Number.isInteger(stepIndexRaw) ? Math.max(1, stepIndexRaw) : index + 1,
        step_id: normalizeInline(source?.step_id || `step_${index + 1}`),
        step_type: normalizeStepType(source?.step_type),
        page_image: normalizeInline(source?.page_image),
        page_text,
        ai_explanation,
        notes,
        practical_interpretation,
        title: normalizeInline(source?.title),
        source_excerpt: page_text || normalizeInline(source?.source_excerpt),
        explanation: ai_explanation || normalizeInline(source?.explanation),
        what_to_notice: notes || normalizeInline(source?.what_to_notice),
        visual_hint: normalizeInline(source?.visual_hint),
        page_from,
        page_to,
      } as LessonStep;
    })
    .filter((step) => step.title && (step.ai_explanation || step.explanation))
    .slice(0, 12);
}

function normalizeVisualBlocks(raw: unknown): VisualBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const source = item as Record<string, unknown>;
      const pageFrom = Math.max(1, Number(source?.page_from) || 1);
      return {
        step_id: normalizeInline(source?.step_id),
        page_from: pageFrom,
        page_to: Math.max(pageFrom, Number(source?.page_to) || pageFrom),
        visual_kind: String(source?.visual_kind || 'page_fragment') as VisualBlock['visual_kind'],
        caption_ru: normalizeInline(source?.caption_ru),
        caption_uz: normalizeInline(source?.caption_uz),
        importance_ru: normalizeInline(source?.importance_ru),
        importance_uz: normalizeInline(source?.importance_uz),
        page_excerpt: normalizeInline(source?.page_excerpt),
        focus_points_ru: Array.isArray(source?.focus_points_ru)
          ? source.focus_points_ru.map((point) => normalizeInline(point)).filter(Boolean).slice(0, 6)
          : [],
        focus_points_uz: Array.isArray(source?.focus_points_uz)
          ? source.focus_points_uz.map((point) => normalizeInline(point)).filter(Boolean).slice(0, 6)
          : [],
      } as VisualBlock;
    })
    .filter((item) => item.step_id)
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
      'Signalni doim bozor konteksti bilan birga baholang.',
      'Likvidlik va tasdiq triggeri birga bo‘lsa setup kuchliroq bo‘ladi.',
      'Bitimdan oldin kirish, stop va target aniq bo‘lishi shart.',
      'Bir xil xatoni takrorlamaslik uchun checklist yuriting.',
    ];
  }

  return [
    'Сигнал оценивается только в контексте рыночной структуры.',
    'Связка ликвидности и подтверждения усиливает вероятность сценария.',
    'До входа всегда фиксируйте вход, стоп и цель.',
    'Checklist защищает от повторения одинаковых ошибок.',
  ];
}

function fallbackGlossary(language: UiLanguage): GlossaryItem[] {
  if (language === 'UZ') {
    return [
      { term: 'Liquidity', definition: 'Bozorda buyurtmalar zich to‘plangan zona.' },
      { term: 'Break of Structure', definition: 'Muhim maksimum yoki minimum buzilishi.' },
      { term: 'Order Block', definition: 'Yirik ishtirokchi izi ko‘rinadigan ehtimoliy zona.' },
    ];
  }
  return [
    { term: 'Liquidity', definition: 'Зона концентрации ордеров, где часто происходит резкий отклик цены.' },
    { term: 'Break of Structure', definition: 'Пробой ключевого экстремума, подтверждающий изменение структуры.' },
    { term: 'Order Block', definition: 'Область активности крупного капитала с потенциальной реакцией цены.' },
  ];
}

function fallbackQuiz(language: UiLanguage): QuizItem[] {
  if (language === 'UZ') {
    return [
      {
        question: 'Setupdan oldin birinchi navbatda nimani tekshirish kerak?',
        options: ['Faqat indikator', 'Kontekst va struktura', 'Faqat bitta sham'],
        correct_index: 1,
        explanation: 'To‘g‘ri javob: kontekst va struktura. Alohida signal yetarli emas.',
      },
      {
        question: 'Likvidlik olinishidan keyin nima qilish to‘g‘ri?',
        options: ['Darhol kirish', 'Tasdiq triggerini kutish', 'Rejasiz kirish'],
        correct_index: 1,
        explanation: 'Tasdiq triggeri false entry ehtimolini kamaytiradi.',
      },
      {
        question: 'Risk management bo‘yicha to‘g‘ri yondashuv qaysi?',
        options: ['Lotni hissiyot bilan oshirish', 'Riskni oldindan belgilash', 'Stop-losssiz savdo'],
        correct_index: 1,
        explanation: 'Risk oldindan belgilanmasa tizim barqaror ishlamaydi.',
      },
    ];
  }

  return [
    {
      question: 'Что проверяется первым перед входом?',
      options: ['Только индикатор', 'Контекст и структура', 'Одна свеча'],
      correct_index: 1,
      explanation: 'Верно: сначала контекст и структура, потом триггер входа.',
    },
    {
      question: 'Как действовать после снятия ликвидности?',
      options: ['Входить сразу', 'Ждать подтверждение', 'Открывать позицию без плана'],
      correct_index: 1,
      explanation: 'Подтверждение снижает вероятность ложного входа.',
    },
    {
      question: 'Какой подход к риск-менеджменту корректный?',
      options: ['Увеличивать объем по эмоциям', 'Фиксировать риск заранее', 'Торговать без стопа'],
      correct_index: 1,
      explanation: 'Риск должен быть определен до открытия позиции.',
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
        title: 'Step 1: Dars yo‘nalishi',
        source_excerpt: summary,
        explanation: 'Bu bosqich darsning asosiy maqsadini beradi: signalni bozor konteksti bilan o‘qish va amaliy qarorga aylantirish.',
        what_to_notice: 'Alohida signalga emas, umumiy strukturaga qarang.',
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_2_visual_a',
        step_type: 'visual',
        title: 'Step 2: Fragment A',
        source_excerpt: summary,
        explanation: 'Birinchi fragmentda setupning boshlanish sharti ko‘rinadi: qayerda likvidlik to‘planadi va trigger qayerda paydo bo‘ladi.',
        what_to_notice: 'Likvidlik zonasi va tasdiq triggerini belgilang.',
        visual_hint: 'Asosiy signal markazini toping.',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_3_visual_b',
        step_type: 'visual',
        title: 'Step 3: Fragment B',
        source_excerpt: content.slice(0, 360),
        explanation: 'Ikkinchi fragment setupning davomiyligini ko‘rsatadi: qayerda davom etadi, qayerda invalid bo‘ladi.',
        what_to_notice: 'A va B fragmentlari o‘rtasidagi mantiqiy bog‘lanishni solishtiring.',
        visual_hint: 'Narx reaksiyasi o‘zgargan nuqtani ajrating.',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_4_concept',
        step_type: 'concept',
        title: 'Step 4: Konsept mantiqi',
        source_excerpt: content.slice(0, 520),
        explanation: 'Terminlar alohida emas, bitta execution zanjiri ichida talqin qilinadi: kontekst -> trigger -> tasdiq -> risk.',
        what_to_notice: 'Har tushunchani real chartdagi roli bilan bog‘lang.',
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_5_practice',
        step_type: 'practice',
        title: 'Step 5: Amaliy qo‘llash',
        source_excerpt: practical,
        explanation: 'Bu bosqich nazariyani konkret algoritmga aylantiradi: signalni topish, tasdiqni kutish, entry-stop-targetni belgilash.',
        what_to_notice: 'Bitimdan oldin to‘liq plan yozib qo‘ying.',
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_6_mistakes',
        step_type: 'mistakes',
        title: 'Step 6: Tuzoqlar',
        source_excerpt: commonMistakes.join(' | '),
        explanation: 'Ko‘p yo‘qotishlar aynan shu yerda bo‘ladi: kontekstsiz kirish, erta kirish va risk intizomini buzish.',
        what_to_notice: commonMistakes[0] || 'Tasdiqsiz kirishdan saqlaning.',
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_7_takeaway',
        step_type: 'takeaway',
        title: 'Step 7: Mustahkamlash',
        source_excerpt: remember,
        explanation: 'Qisqa checklist bu darsdagi qaror mantiqini keyingi chartlarda barqaror takrorlashga yordam beradi.',
        what_to_notice: 'Asosiy qoidalarni jurnalingizga yozing.',
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_8_quiz',
        step_type: 'quiz',
        title: 'Step 8: Mini-quiz',
        source_excerpt: summary,
        explanation: `${quizCount} ta savol darsning amaliy tushunchasini tekshiradi.`,
        what_to_notice: 'Javob berishda joriy setup logikasiga tayaning.',
        visual_hint: '',
        page_from: 1,
        page_to: 1,
      },
      {
        step_id: 'step_9_next',
        step_type: 'next',
        title: 'Step 9: Keyingi darsga o‘tish',
        source_excerpt: summary,
        explanation: 'Joriy darsni yakunlang, keyin navbatdagi darsga ketma-ket o‘ting.',
        what_to_notice: 'Avval mark complete, keyin next.',
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
      title: 'Step 1: Вектор урока',
      source_excerpt: summary,
      explanation: 'Этот шаг задает главную логику: как читать сигнал в контексте структуры и переводить идею в решение.',
      what_to_notice: 'Смотрите не на отдельный сигнал, а на весь контекст.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_2_visual_a',
      step_type: 'visual',
      title: 'Step 2: Фрагмент A',
      source_excerpt: summary,
      explanation: 'На первом фрагменте видно формирование предпосылки: где скапливается ликвидность и где появляется триггер.',
      what_to_notice: 'Отметьте ликвидность и точку подтверждения.',
      visual_hint: 'Найдите главный визуальный сигнал.',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_3_visual_b',
      step_type: 'visual',
      title: 'Step 3: Фрагмент B',
      source_excerpt: content.slice(0, 360),
      explanation: 'Второй фрагмент показывает, как сценарий либо продолжается, либо ломается.',
      what_to_notice: 'Сопоставьте логику между фрагментом A и B.',
      visual_hint: 'Выделите точку изменения реакции цены.',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_4_concept',
      step_type: 'concept',
      title: 'Step 4: Концепт-механика',
      source_excerpt: content.slice(0, 520),
      explanation: 'Термины собираются в единую рабочую цепочку: контекст -> триггер -> подтверждение -> риск.',
      what_to_notice: 'Каждый термин должен иметь практическую роль на графике.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_5_practice',
      step_type: 'practice',
      title: 'Step 5: Практика',
      source_excerpt: practical,
      explanation: 'Здесь теория становится алгоритмом сделки: что искать, чем подтвердить, где входить, где отменять сценарий.',
      what_to_notice: 'План сделки должен быть готов до клика по кнопке Buy/Sell.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_6_mistakes',
      step_type: 'mistakes',
      title: 'Step 6: Ошибки и ловушки',
      source_excerpt: commonMistakes.join(' | '),
      explanation: 'Самые дорогие ошибки: вход без контекста, поспешный вход и нарушение риск-дисциплины.',
      what_to_notice: commonMistakes[0] || 'Не входите без подтверждения.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_7_takeaway',
      step_type: 'takeaway',
      title: 'Step 7: Закрепление',
      source_excerpt: remember,
      explanation: 'Короткий checklist фиксирует логику урока для следующего анализа графика.',
      what_to_notice: 'Сохраните правила в торговый журнал.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_8_quiz',
      step_type: 'quiz',
      title: 'Step 8: Мини-quiz',
      source_excerpt: summary,
      explanation: `${quizCount} вопросов проверяют, насколько вы поняли механику урока.`,
      what_to_notice: 'Отвечайте, опираясь на текущий материал, а не на общую теорию.',
      visual_hint: '',
      page_from: 1,
      page_to: 1,
    },
    {
      step_id: 'step_9_next',
      step_type: 'next',
      title: 'Step 9: Переход к следующему уроку',
      source_excerpt: summary,
      explanation: 'Завершите текущий урок и переходите дальше по последовательности.',
      what_to_notice: 'Сначала mark complete, затем next lesson.',
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
      const page_text = normalizeInline(step.page_text || step.source_excerpt);
      const ai_explanation = normalizeInline(step.ai_explanation || step.explanation);
      const notes = normalizeInline(step.notes || step.what_to_notice);
      const practical_interpretation = normalizeInline(
        step.practical_interpretation || (step.step_type === 'practice' ? (step.source_excerpt || step.explanation) : ''),
      );

      return {
        ...step,
        step_index: Number.isInteger(Number(step.step_index)) ? Math.max(1, Number(step.step_index)) : index + 1,
        page_image: normalizeInline(step.page_image || `page:${pageFrom}`),
        page_text,
        ai_explanation,
        notes,
        practical_interpretation,
        source_excerpt: page_text || normalizeInline(step.source_excerpt),
        explanation: ai_explanation || normalizeInline(step.explanation),
        what_to_notice: notes || normalizeInline(step.what_to_notice),
        page_from: pageFrom,
        page_to: pageTo,
      } as LessonStep;
    })
    .filter((step) => step.title && step.ai_explanation)
    .slice(0, 12);
}

export default function LessonPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const [user, setUser] = useState<any>(null);
  const [lesson, setLesson] = useState<LessonDetails | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFavorite, setIsFavorite] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  const [isReframing, setIsReframing] = useState(false);
  const [alternateExplanation, setAlternateExplanation] = useState('');

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

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 3200);
  };

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
      setLoadError(null);
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

    setActiveStepIndex(0);
    setVisitedSteps(new Set([0]));
    setAlternateExplanation('');
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

  const firstName = useMemo(() => {
    const normalized = normalizeInline(user?.name);
    if (!normalized) return 'Trader';
    return normalized.split(' ')[0] || 'Trader';
  }, [user]);

  const localizedSummary = useMemo(() => {
    if (!lesson) return '';
    if (uiLanguage === 'UZ') return normalizeInline(lesson.summary_uz || lesson.summary_ru || lesson.summary);
    return normalizeInline(lesson.summary_ru || lesson.summary_uz || lesson.summary);
  }, [lesson, uiLanguage]);

  const localizedContent = useMemo(() => {
    if (!lesson) return '';
    if (uiLanguage === 'UZ') return normalizeInline(lesson.content_uz || lesson.content_source || lesson.content_ru || lesson.content);
    return normalizeInline(lesson.content_ru || lesson.content_source || lesson.content_uz || lesson.content);
  }, [lesson, uiLanguage]);

  const keyPoints = useMemo(() => {
    const raw = pickLocalized(lesson?.key_points_json, uiLanguage);
    const normalized = Array.isArray(raw)
      ? raw.map((item) => normalizeInline(item)).filter(Boolean).slice(0, 10)
      : [];
    return normalized.length > 0 ? normalized : fallbackKeyPoints(uiLanguage);
  }, [lesson?.key_points_json, uiLanguage]);

  const glossary = useMemo(() => {
    const raw = pickLocalized(lesson?.glossary_json, uiLanguage);
    const normalized = normalizeGlossary(raw);
    return normalized.length > 0 ? normalized : fallbackGlossary(uiLanguage);
  }, [lesson?.glossary_json, uiLanguage]);

  const practical = useMemo(() => {
    const raw = normalizeInline(pickLocalized(lesson?.practice_notes, uiLanguage));
    if (raw) return raw;
    if (uiLanguage === 'UZ') {
      return '3 ta chartda setupni tekshiring: kirish, stop va targetni oldindan belgilang.';
    }
    return 'Проверьте сетап на 3 графиках: заранее определите вход, стоп и цель.';
  }, [lesson?.practice_notes, uiLanguage]);

  const commonMistakes = useMemo(() => {
    const raw = pickLocalized(lesson?.common_mistakes_json, uiLanguage);
    const normalized = Array.isArray(raw)
      ? raw.map((item) => normalizeInline(item)).filter(Boolean).slice(0, 8)
      : [];

    if (normalized.length > 0) return normalized;
    return uiLanguage === 'UZ'
      ? [
          'Signalni kontekstsiz talqin qilish.',
          'Tasdiqsiz kirish.',
          'Risk qoidalarini buzib lotni oshirish.',
        ]
      : [
          'Интерпретация сигнала без контекста.',
          'Вход без подтверждения.',
          'Нарушение риск-дисциплины через увеличение объема.',
        ];
  }, [lesson?.common_mistakes_json, uiLanguage]);

  const selfCheck = useMemo(() => {
    const raw = pickLocalized(lesson?.self_check_questions_json, uiLanguage);
    const normalized = Array.isArray(raw)
      ? raw.map((item) => normalizeInline(item)).filter(Boolean).slice(0, 6)
      : [];

    if (normalized.length > 0) return normalized;
    return uiLanguage === 'UZ'
      ? [
          'Bu setupda kontekstni qayerdan baholaysiz?',
          'Tasdiq triggeri qayerda paydo bo‘ladi?',
          'Invalid bo‘lsa qayerda chiqasiz?',
        ]
      : [
          'Где в этом сетапе оценивается контекст?',
          'Каким триггером подтверждается вход?',
          'Где будет invalidation и выход?',
        ];
  }, [lesson?.self_check_questions_json, uiLanguage]);

  const homework = useMemo(() => {
    const raw = normalizeInline(pickLocalized(lesson?.homework_json, uiLanguage));
    if (raw) return raw;
    if (uiLanguage === 'UZ') {
      return '5 ta tarixiy chart tanlang, setup sifatini 1-10 baholang va xatolarni journaling qiling.';
    }
    return 'Выберите 5 исторических графиков, оцените сетап по шкале 1-10 и зафиксируйте ошибки в журнале.';
  }, [lesson?.homework_json, uiLanguage]);

  const remember = useMemo(() => {
    const conclusion = normalizeInline(pickLocalized(lesson?.conclusion_json, uiLanguage));
    const additional = normalizeInline(pickLocalized(lesson?.additional_notes_json, uiLanguage));
    const merged = normalizeInline(`${conclusion} ${additional}`);
    if (merged) return merged;
    return keyPoints.slice(0, 3).join(' ');
  }, [lesson?.additional_notes_json, lesson?.conclusion_json, keyPoints, uiLanguage]);

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
    return enrichStepsForUi(
      buildFallbackJourneySteps(
        uiLanguage,
        localizedSummary,
        localizedContent,
        practical,
        commonMistakes,
        remember,
        quizItems.length,
      ),
    );
  }, [
    lesson?.lesson_steps_json,
    uiLanguage,
    localizedSummary,
    localizedContent,
    practical,
    commonMistakes,
    remember,
    quizItems.length,
  ]);

  const visualBlocks = useMemo(() => {
    const parsed = normalizeVisualBlocks(lesson?.visual_blocks_json);
    if (parsed.length > 0) return parsed;

    if (!lesson?.pdf_path) return [];

    return steps
      .filter((step) => step.step_type === 'visual' || !!step.visual_hint)
      .slice(0, 6)
      .map((step, index) => ({
        step_id: step.step_id,
        page_from: Math.max(1, step.page_from || index + 1),
        page_to: Math.max(Math.max(1, step.page_from || index + 1), step.page_to || step.page_from || index + 1),
        visual_kind: 'page_fragment' as const,
        caption_ru: step.title,
        caption_uz: step.title,
        importance_ru: step.notes || step.what_to_notice || 'Смотрите на связь контекста и подтверждения.',
        importance_uz: step.notes || step.what_to_notice || 'Kontekst va tasdiq bog‘lanishini kuzating.',
        page_excerpt: step.page_text || step.source_excerpt,
        focus_points_ru: toBulletPoints(step.notes || step.what_to_notice || '', 4),
        focus_points_uz: toBulletPoints(step.notes || step.what_to_notice || '', 4),
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
      focus_points_ru: toBulletPoints(currentStep.notes || currentStep.what_to_notice || '', 4),
      focus_points_uz: toBulletPoints(currentStep.notes || currentStep.what_to_notice || '', 4),
    } as VisualBlock;
  }, [currentStep, visualBlocks]);

  const ensurePdfBinaryLoaded = async (): Promise<boolean> => {
    if (!lesson?.id || !lesson.pdf_path) return false;
    if (pdfBinaryRef.current) return true;
    if (isLoadingPdf) return false;

    setIsLoadingPdf(true);
    setPageRenderError(null);
    try {
      const response = await api.get(`/courses/lessons/${lesson.id}/pdf`, { responseType: 'arraybuffer' });
      pdfBinaryRef.current = response.data as ArrayBuffer;
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || copy.openPdfError;
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
    if (pageImageByPageRef.current[requestedPage]) return;
    if (renderingPagesRef.current.has(requestedPage)) return;

    const loaded = await ensurePdfBinaryLoaded();
    if (!loaded) return;

    renderingPagesRef.current.add(requestedPage);
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
      const totalPages = Number(pdfDoc?.numPages || requestedPage);
      const safePage = Math.max(1, Math.min(totalPages, requestedPage));

      if (pageImageByPageRef.current[safePage]) return;

      const pageObject = await pdfDoc.getPage(safePage);
      const viewport = pageObject.getViewport({ scale: 1.35 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) throw new Error('Canvas rendering is unavailable');

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await pageObject.render({ canvasContext: context, viewport }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setPageImageByPage((prev) => {
        if (prev[safePage]) return prev;
        const next = { ...prev, [safePage]: dataUrl };
        pageImageByPageRef.current = next;
        return next;
      });
    } catch (error: any) {
      const message = error?.message || 'Failed to render lesson page';
      setPageRenderError(message);
      showToast(message);
    } finally {
      renderingPagesRef.current.delete(requestedPage);
      setIsRenderingPageImage(renderingPagesRef.current.size > 0);
    }
  };

  useEffect(() => {
    if (!currentStep || !lesson?.pdf_path) return;
    const targetPage = Math.max(1, Number(currentVisual?.page_from || currentStep.page_from || 1));
    void ensurePageImage(targetPage);
  }, [currentStep?.step_id, currentVisual?.page_from, lesson?.pdf_path]);

  useEffect(() => {
    setVisitedSteps((prev) => {
      const next = new Set(prev);
      next.add(activeStepIndex);
      return next;
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
    const nextValue = !isFavorite;
    setIsFavorite(nextValue);
    if (nextValue) {
      localStorage.setItem(key, '1');
      showToast(copy.favoriteAdded);
    } else {
      localStorage.removeItem(key);
      showToast(copy.favoriteRemoved);
    }
  };

  const handleOpenOriginalPdf = async () => {
    if (!lesson?.pdf_path || !lesson?.id || isOpeningPdf) {
      if (!lesson?.pdf_path) showToast(copy.openPdfUnavailable);
      return;
    }

    setIsOpeningPdf(true);
    try {
      const loaded = await ensurePdfBinaryLoaded();
      if (!loaded || !pdfBinaryRef.current) {
        showToast(copy.openPdfError);
        return;
      }

      const blob = new Blob([pdfBinaryRef.current], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch {
      showToast(copy.openPdfError);
    } finally {
      setIsOpeningPdf(false);
    }
  };

  const goToStep = (index: number) => {
    const safeIndex = Math.max(0, Math.min(steps.length - 1, index));
    setActiveStepIndex(safeIndex);
  };

  const goToNextStep = () => goToStep(activeStepIndex + 1);
  const goToPrevStep = () => goToStep(activeStepIndex - 1);

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

    const currentExplanation = normalizeInline(currentStep.ai_explanation || currentStep.explanation);
    try {
      const prompt = uiLanguage === 'UZ'
        ? [
            'Ushbu qadamni boshqacha, sodda va chuqurroq tushuntiring.',
            `Qadam: ${currentStep.title}`,
            `Qadam turi: ${currentStep.step_type}`,
            `Mavjud izoh: ${currentExplanation}`,
            'Javobni 3 qismda bering:',
            '1) oddiy talqin',
            '2) chartdagi amaliy misol',
            '3) yangi boshlovchi adashadigan joy',
          ].join('\n')
        : [
            'Объясни этот шаг иначе: проще, глубже и практичнее.',
            `Шаг: ${currentStep.title}`,
            `Тип шага: ${currentStep.step_type}`,
            `Текущее объяснение: ${currentExplanation}`,
            'Сделай ответ в 3 блоках:',
            '1) простое объяснение',
            '2) пример применения на графике',
            '3) где новичок путается',
          ].join('\n');

      const response = await api.post('/ai/chat', {
        message: prompt,
        context: buildLessonContext(currentStep),
      });

      const alternate = normalizeInline(response.data?.response);
      if (alternate) {
        setAlternateExplanation(alternate);
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
          copy.askAiPrefill,
          `Course: ${lesson?.course_title || ''}`,
          `Module: ${lesson?.module_title || ''}`,
          `Lesson: ${lesson?.title || ''}`,
          `Current step: ${currentStep?.title || ''}`,
          `Summary: ${localizedSummary}`,
        ].join('\n')
      : [
          copy.askAiPrefill,
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

  const stepExplanationText = normalizeInline(currentStep?.ai_explanation || currentStep?.explanation || localizedContent);
  const stepNotesText = normalizeInline(currentStep?.notes || currentStep?.what_to_notice || '');
  const stepPracticalText = normalizeInline(
    currentStep?.practical_interpretation || (currentStep?.step_type === 'practice' ? practical : ''),
  );
  const stepPageText = normalizeInline(currentStep?.page_text || currentStep?.source_excerpt || '');

  const mentorParagraphs = useMemo(
    () => toMentorParagraphs(stepExplanationText),
    [stepExplanationText],
  );

  const notePoints = useMemo(
    () => toBulletPoints(stepNotesText, 6),
    [stepNotesText],
  );

  const practicalPoints = useMemo(
    () => parsePracticalSteps(stepPracticalText, 5),
    [stepPracticalText],
  );

  const currentVisualPage = Math.max(1, Number(currentVisual?.page_from || currentStep?.page_from || 1));
  const rawStepImage = normalizeInline(currentStep?.page_image || '');
  const directStepImage = rawStepImage && !rawStepImage.startsWith('page:') ? rawStepImage : '';
  const renderedPageImage = pageImageByPage[currentVisualPage] || '';
  const currentPageImage = directStepImage || renderedPageImage;

  const canSubmitQuiz = quizItems.length > 0 && Object.keys(quizAnswers).length === quizItems.length;

  const pageStyle: React.CSSProperties = {
    background: '#f5f1e8',
    color: '#1f2933',
    fontFamily: 'var(--font-lesson-body)',
    ['--lesson-bg' as any]: '#f5f1e8',
    ['--lesson-paper' as any]: '#fffdf8',
    ['--lesson-line' as any]: '#e7dece',
    ['--lesson-ink' as any]: '#1f2933',
    ['--lesson-muted' as any]: '#677484',
    ['--lesson-accent' as any]: '#0f766e',
    ['--lesson-accent-soft' as any]: '#d9efe9',
    ['--lesson-warm' as any]: '#9a5c15',
    ['--lesson-danger' as any]: '#b42318',
  };

  if (!user) {
    return (
      <div className={cn(displayFont.variable, bodyFont.variable, 'min-h-screen flex items-center justify-center')} style={pageStyle}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--lesson-accent)' }} />
      </div>
    );
  }

  return (
    <div className={cn(displayFont.variable, bodyFont.variable, 'relative min-h-screen overflow-x-clip')} style={pageStyle}>
      <div
        className="pointer-events-none absolute left-[-10%] top-[-8%] h-[320px] w-[320px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(15,118,110,0.2), transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-12%] right-[-8%] h-[380px] w-[380px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(154,92,21,0.16), transparent 72%)' }}
      />

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed left-1/2 top-4 z-[80] -translate-x-1/2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg"
            style={{
              background: 'rgba(255,253,248,0.98)',
              borderColor: 'var(--lesson-line)',
              color: 'var(--lesson-ink)',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
            }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          borderColor: 'var(--lesson-line)',
          background: 'rgba(245, 241, 232, 0.86)',
        }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(lesson ? `/dashboard/courses/${lesson.course_id}` : '/dashboard/academy')}
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition"
              style={{
                borderColor: 'var(--lesson-line)',
                color: 'var(--lesson-ink)',
                background: 'var(--lesson-paper)',
              }}
            >
              <ArrowLeft size={15} />
              {copy.backToCourse}
            </button>

            <div className="hidden md:block text-sm" style={{ color: 'var(--lesson-muted)' }}>
              {lesson?.course_title || 'TradeMentor'}
            </div>
          </div>

          <div className="hidden lg:flex min-w-[260px] items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
              {copy.progress}
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#eadfce' }}>
              <motion.div
                key={progressPercent}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #0f766e, #1d9a8f)' }}
              />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--lesson-ink)' }}>
              {activeStepIndex + 1}/{Math.max(steps.length, 1)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevStep}
              disabled={activeStepIndex === 0}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition disabled:opacity-40"
              style={{ borderColor: 'var(--lesson-line)', background: 'var(--lesson-paper)', color: 'var(--lesson-ink)' }}
              aria-label={copy.prevStep}
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={goToNextStep}
              disabled={activeStepIndex >= steps.length - 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition disabled:opacity-40"
              style={{ borderColor: 'var(--lesson-line)', background: 'var(--lesson-paper)', color: 'var(--lesson-ink)' }}
              aria-label={copy.nextStep}
            >
              <ChevronRight size={16} />
            </button>

            <div className="ml-1 flex items-center rounded-full border p-1" style={{ borderColor: 'var(--lesson-line)', background: 'var(--lesson-paper)' }}>
              <button
                onClick={() => setLanguage('RU')}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                  uiLanguage === 'RU' ? 'text-white' : '',
                )}
                style={uiLanguage === 'RU'
                  ? { background: 'var(--lesson-accent)' }
                  : { color: 'var(--lesson-muted)' }}
              >
                RU
              </button>
              <button
                onClick={() => setLanguage('UZ')}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                  uiLanguage === 'UZ' ? 'text-white' : '',
                )}
                style={uiLanguage === 'UZ'
                  ? { background: 'var(--lesson-accent)' }
                  : { color: 'var(--lesson-muted)' }}
              >
                UZ
              </button>
            </div>

            <button
              onClick={toggleFavorite}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition"
              style={{
                borderColor: isFavorite ? '#d4b381' : 'var(--lesson-line)',
                background: isFavorite ? '#fff5de' : 'var(--lesson-paper)',
                color: isFavorite ? 'var(--lesson-warm)' : 'var(--lesson-muted)',
              }}
              aria-label={copy.addFavorite}
            >
              <Bookmark size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-14 pt-8 md:px-8 md:pt-10">
        {isLoading ? (
          <div className="mx-auto mt-12 max-w-3xl rounded-[30px] border px-7 py-9 md:px-10 md:py-12" style={{ borderColor: 'var(--lesson-line)', background: 'var(--lesson-paper)' }}>
            <div className="flex items-center gap-3" style={{ color: 'var(--lesson-accent)' }}>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-semibold uppercase tracking-[0.16em]">AI Tutor Layer</span>
            </div>
            <h2 className="mt-4 text-3xl leading-tight" style={{ fontFamily: 'var(--font-lesson-display)' }}>
              {copy.loadingTitle}
            </h2>
            <p className="mt-3 text-base" style={{ color: 'var(--lesson-muted)' }}>
              {copy.loadingHint}
            </p>
            <div className="mt-8 space-y-3">
              {[0, 1, 2].map((idx) => (
                <div key={`skeleton-${idx}`} className="h-3 w-full rounded-full" style={{ background: idx === 1 ? '#e7e0d5' : '#efe8dc' }} />
              ))}
            </div>
          </div>
        ) : !lesson ? (
          <div className="mx-auto mt-16 max-w-2xl rounded-[28px] border px-7 py-9 text-center" style={{ borderColor: 'var(--lesson-line)', background: 'var(--lesson-paper)' }}>
            <h2 className="text-3xl" style={{ fontFamily: 'var(--font-lesson-display)' }}>{copy.notFound}</h2>
            <p className="mt-3 text-sm" style={{ color: 'var(--lesson-muted)' }}>
              {loadError || copy.notFoundHint}
            </p>
          </div>
        ) : (
          <>
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="rounded-[34px] border px-6 py-7 md:px-10 md:py-10"
              style={{
                borderColor: 'var(--lesson-line)',
                background: 'linear-gradient(165deg, #fffdf8 0%, #f8f3e9 100%)',
                boxShadow: '0 18px 48px rgba(20, 30, 38, 0.08)',
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                {lesson.course_title} · {lesson.module_title}
              </p>

              <h1 className="mt-3 text-3xl leading-tight md:text-5xl" style={{ fontFamily: 'var(--font-lesson-display)', color: 'var(--lesson-ink)' }}>
                {lesson.title}
              </h1>

              <p className="mt-4 max-w-4xl text-base leading-8 md:text-lg" style={{ color: '#374251' }}>
                {localizedSummary}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5 text-xs font-semibold">
                <span className="rounded-full px-3 py-1" style={{ background: '#dff0eb', color: '#0f766e' }}>
                  {copy.type}: {lesson.lesson_type || 'theory'}
                </span>
                <span className="rounded-full px-3 py-1" style={{ background: '#f2e9db', color: '#9a5c15' }}>
                  {copy.difficulty}: {lesson.difficulty_level || 'Beginner'}
                </span>
                <span className="rounded-full px-3 py-1" style={{ background: '#e8edf4', color: '#41526a' }}>
                  <Languages size={12} className="mr-1 inline" />
                  {copy.source}: {lesson.source_language || 'N/A'}
                </span>
                {lesson.source_section && (
                  <span className="rounded-full px-3 py-1" style={{ background: '#f5f1e8', color: '#556170', border: '1px solid var(--lesson-line)' }}>
                    {copy.sourceSection}: {lesson.source_section}
                  </span>
                )}
                <span className="rounded-full px-3 py-1" style={{ background: lesson.is_completed ? '#e0f2e9' : '#f6ecd9', color: lesson.is_completed ? '#116149' : '#8a5416' }}>
                  {lesson.is_completed ? copy.completed : copy.inProgress}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <button
                  onClick={markLessonCompleted}
                  disabled={lesson.is_completed || isCompleting}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: lesson.is_completed ? '#e0f2e9' : '#d9efe9',
                    color: lesson.is_completed ? '#0f5d46' : '#0f766e',
                  }}
                >
                  {isCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {lesson.is_completed ? copy.completed : copy.markComplete}
                </button>

                <button
                  onClick={handleAskAi}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition"
                  style={{ background: 'linear-gradient(120deg, #0f766e, #1d9a8f)' }}
                >
                  <Brain size={14} />
                  {copy.askAi}
                </button>

                <button
                  onClick={toggleFavorite}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
                  style={{
                    borderColor: isFavorite ? '#d4b381' : 'var(--lesson-line)',
                    background: isFavorite ? '#fff5de' : 'var(--lesson-paper)',
                    color: isFavorite ? 'var(--lesson-warm)' : 'var(--lesson-ink)',
                  }}
                >
                  <Bookmark size={14} />
                  {isFavorite ? copy.inFavorite : copy.addFavorite}
                </button>

                <button
                  onClick={handleOpenOriginalPdf}
                  disabled={!lesson.pdf_path || isOpeningPdf || isLoadingPdf}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ borderColor: 'var(--lesson-line)', background: 'var(--lesson-paper)', color: 'var(--lesson-ink)' }}
                >
                  {isOpeningPdf ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                  {copy.openOriginalPdf}
                </button>
              </div>
            </motion.section>

            <section className="mt-8">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                    {copy.lessonFlow}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--lesson-muted)' }}>
                    {copy.lessonFlowHint}
                  </p>
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--lesson-ink)' }}>
                  {progressPercent}%
                </span>
              </div>

              <div className="overflow-x-auto pb-2">
                <ol className="inline-flex min-w-full gap-5 border-b pb-3" style={{ borderColor: 'var(--lesson-line)' }}>
                  {steps.map((step, index) => {
                    const active = index === activeStepIndex;
                    const visited = visitedSteps.has(index);
                    return (
                      <li key={step.step_id}>
                        <button
                          onClick={() => goToStep(index)}
                          className="group text-left transition"
                        >
                          <p
                            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                            style={{ color: active ? 'var(--lesson-accent)' : visited ? '#5e6f82' : '#94a0ae' }}
                          >
                            {copy.stepLabel} {index + 1}
                          </p>
                          <p
                            className="mt-1 whitespace-nowrap text-sm font-medium"
                            style={{ color: active ? 'var(--lesson-ink)' : '#5b6776' }}
                          >
                            {step.title}
                          </p>
                          <div
                            className="mt-2 h-[2px] rounded-full transition-all"
                            style={{
                              width: active ? '100%' : '24%',
                              background: active ? 'var(--lesson-accent)' : '#d6ccbd',
                            }}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>

            <AnimatePresence mode="wait">
              {currentStep && (
                <motion.article
                  key={currentStep.step_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="mt-8 overflow-hidden rounded-[32px] border"
                  style={{
                    borderColor: 'var(--lesson-line)',
                    background: 'var(--lesson-paper)',
                    boxShadow: '0 16px 44px rgba(20, 30, 38, 0.07)',
                  }}
                >
                  <section className="border-b px-6 py-8 md:px-12 md:py-10" style={{ borderColor: 'var(--lesson-line)' }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                      {copy.stepLabel} {activeStepIndex + 1} / {steps.length} · {STEP_LABELS[uiLanguage][currentStep.step_type]}
                    </p>
                    <h2 className="mt-3 text-3xl leading-tight md:text-4xl" style={{ fontFamily: 'var(--font-lesson-display)' }}>
                      {currentStep.title}
                    </h2>
                    <p className="mt-2 text-sm" style={{ color: 'var(--lesson-muted)' }}>
                      {copy.source}: p.{currentStep.page_from}-{currentStep.page_to}
                    </p>

                    <div className="mt-8 grid gap-8 lg:grid-cols-[1.14fr_0.86fr]">
                      <figure>
                        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--lesson-line)', background: '#f7f1e6' }}>
                          {(isLoadingPdf || isRenderingPageImage) && (
                            <div className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--lesson-muted)' }}>
                              <Loader2 size={12} className="mr-1 inline animate-spin" />
                              {copy.sceneLoading}
                            </div>
                          )}

                          {currentPageImage ? (
                            <img
                              src={currentPageImage}
                              alt={`Lesson page ${currentVisualPage}`}
                              className="w-full"
                              style={{ maxHeight: '620px', objectFit: 'contain', background: '#f7f1e6' }}
                            />
                          ) : (
                            <div className="flex min-h-[240px] items-center justify-center px-6 py-8 text-center">
                              {lesson.pdf_path ? (
                                <button
                                  onClick={() => void ensurePageImage(currentVisualPage)}
                                  className="rounded-full border px-4 py-2 text-sm font-semibold transition"
                                  style={{ borderColor: 'var(--lesson-line)', color: 'var(--lesson-ink)' }}
                                >
                                  {copy.sceneLoad}
                                </button>
                              ) : (
                                <p className="text-sm" style={{ color: 'var(--lesson-muted)' }}>{copy.sceneEmpty}</p>
                              )}
                            </div>
                          )}
                        </div>

                        {visualCaption && (
                          <figcaption className="mt-3 text-sm" style={{ color: 'var(--lesson-muted)' }}>
                            {visualCaption}
                          </figcaption>
                        )}
                      </figure>

                      <div className="space-y-5">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                            {copy.sceneTitle}
                          </p>
                          {visualImportance && (
                            <p className="mt-2 text-base leading-7" style={{ color: '#334155' }}>
                              {visualImportance}
                            </p>
                          )}
                        </div>

                        {Array.isArray(visualFocusPoints) && visualFocusPoints.length > 0 && (
                          <ul className="space-y-2">
                            {visualFocusPoints.map((point, idx) => (
                              <li key={`focus-${idx}-${point.slice(0, 20)}`} className="text-sm leading-6" style={{ color: '#475569' }}>
                                <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--lesson-accent)' }} />
                                {point}
                              </li>
                            ))}
                          </ul>
                        )}

                        {stepPageText && (
                          <blockquote className="rounded-2xl border-l-4 px-4 py-3 text-sm leading-7" style={{ borderColor: 'var(--lesson-accent)', background: '#f5f8fb', color: '#3f4f63' }}>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#64748b' }}>
                              {copy.sourceFragment}
                            </p>
                            {stepPageText}
                          </blockquote>
                        )}

                        {pageRenderError && (
                          <p className="text-sm" style={{ color: 'var(--lesson-danger)' }}>
                            {pageRenderError}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="border-b px-6 py-8 md:px-12 md:py-10" style={{ borderColor: 'var(--lesson-line)' }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                      {copy.mentorExplanation}
                    </p>
                    <div className="mt-4 space-y-5 text-[17px] leading-8" style={{ color: '#253346' }}>
                      {mentorParagraphs.map((paragraph, idx) => (
                        <p key={`mentor-paragraph-${idx}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                      ))}
                    </div>

                    {alternateExplanation && (
                      <div className="mt-6 rounded-2xl border px-4 py-4" style={{ borderColor: '#bad9d3', background: '#ecf8f5' }}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#0f766e' }}>
                          <Sparkles size={12} className="mr-1 inline" />
                          {copy.mentorAlternate}
                        </p>
                        <p className="mt-2 text-sm leading-7" style={{ color: '#134e48' }}>
                          {alternateExplanation}
                        </p>
                      </div>
                    )}
                  </section>

                  <section className="grid gap-8 border-b px-6 py-8 md:grid-cols-2 md:px-12 md:py-10" style={{ borderColor: 'var(--lesson-line)' }}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                        {copy.notes}
                      </p>
                      {notePoints.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {notePoints.map((item, idx) => (
                            <li key={`note-${idx}-${item.slice(0, 20)}`} className="text-sm leading-7" style={{ color: '#334155' }}>
                              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--lesson-accent)' }} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm leading-7" style={{ color: 'var(--lesson-muted)' }}>
                          {uiLanguage === 'UZ'
                            ? 'Bu qadamda asosiy e’tibor bozor konteksti va tasdiq signaliga qaratiladi.'
                            : 'На этом шаге фокусируйтесь на контексте рынка и подтверждающем сигнале.'}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                        {copy.practical}
                      </p>
                      {practicalPoints.length > 0 ? (
                        <ol className="mt-3 space-y-2">
                          {practicalPoints.map((item, idx) => (
                            <li key={`practical-${idx}-${item.slice(0, 20)}`} className="flex gap-3 text-sm leading-7" style={{ color: '#334155' }}>
                              <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold" style={{ background: '#e3f1ed', color: '#0f766e' }}>
                                {idx + 1}
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="mt-3 text-sm leading-7" style={{ color: '#334155' }}>
                          {stepPracticalText || practical}
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="grid gap-8 border-b px-6 py-8 md:grid-cols-2 md:px-12 md:py-10" style={{ borderColor: 'var(--lesson-line)' }}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                        {copy.glossary}
                      </p>
                      <div className="mt-3 space-y-3">
                        {glossary.slice(0, 6).map((item, idx) => (
                          <p key={`glossary-${idx}-${item.term}`} className="text-sm leading-7" style={{ color: '#334155' }}>
                            <span className="font-semibold" style={{ color: '#0f172a' }}>{item.term}:</span> {item.definition}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                        {copy.mistakes}
                      </p>
                      <ul className="mt-3 space-y-2">
                        {commonMistakes.slice(0, 6).map((item, idx) => (
                          <li key={`mistake-${idx}-${item.slice(0, 18)}`} className="flex gap-3 text-sm leading-7" style={{ color: '#8b2c20' }}>
                            <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold" style={{ background: '#fbe9e7', color: '#b42318' }}>
                              {idx + 1}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <section className="border-b px-6 py-8 md:px-12 md:py-10" style={{ borderColor: 'var(--lesson-line)' }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                      {copy.summary}
                    </p>
                    <p className="mt-3 text-base leading-8" style={{ color: '#334155' }}>
                      {remember}
                    </p>

                    <div className="mt-6 grid gap-8 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                          {copy.selfCheck}
                        </p>
                        <ul className="mt-3 space-y-2">
                          {selfCheck.slice(0, 4).map((question, idx) => (
                            <li key={`self-check-${idx}-${question.slice(0, 18)}`} className="text-sm leading-7" style={{ color: '#334155' }}>
                              <span className="mr-2 font-semibold" style={{ color: 'var(--lesson-accent)' }}>{idx + 1}.</span>
                              {question}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                          {copy.homework}
                        </p>
                        <p className="mt-3 text-sm leading-7" style={{ color: '#334155' }}>
                          {homework}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="px-6 py-8 md:px-12 md:py-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                      {copy.quickActions}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <button
                        onClick={handleUnderstood}
                        className="rounded-full px-4 py-2 text-sm font-semibold text-white transition"
                        style={{ background: 'linear-gradient(120deg, #0f766e, #1d9a8f)' }}
                      >
                        {copy.understood}
                      </button>

                      <button
                        onClick={handleExplainDifferently}
                        disabled={isReframing}
                        className="rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ borderColor: 'var(--lesson-line)', color: 'var(--lesson-ink)' }}
                      >
                        {isReframing ? <Loader2 size={14} className="mr-1 inline animate-spin" /> : null}
                        {copy.explainAgain}
                      </button>

                      <button
                        onClick={handleAskQuestion}
                        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
                        style={{ borderColor: 'var(--lesson-line)', color: 'var(--lesson-ink)' }}
                      >
                        <MessageCircleQuestion size={14} />
                        {copy.askQuestion}
                      </button>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <button
                        onClick={goToPrevStep}
                        disabled={activeStepIndex === 0}
                        className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
                        style={{ borderColor: 'var(--lesson-line)', color: 'var(--lesson-ink)' }}
                      >
                        <ChevronLeft size={14} />
                        {copy.prevStep}
                      </button>

                      <button
                        onClick={goToNextStep}
                        disabled={activeStepIndex >= steps.length - 1}
                        className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
                        style={{ borderColor: 'var(--lesson-line)', color: 'var(--lesson-ink)' }}
                      >
                        {copy.nextStep}
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </section>
                </motion.article>
              )}
            </AnimatePresence>

            <section
              className="mt-10 rounded-[30px] border px-6 py-8 md:px-10 md:py-10"
              style={{ borderColor: 'var(--lesson-line)', background: 'var(--lesson-paper)' }}
            >
              <h3 className="text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-lesson-display)' }}>
                {copy.quizTitle}
              </h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--lesson-muted)' }}>
                {copy.quizHint}
              </p>

              <div className="mt-6 space-y-4">
                {quizItems.map((item, qIdx) => {
                  const selected = quizAnswers[qIdx];
                  const isAnswered = typeof selected === 'number';
                  const isCorrect = isAnswered && selected === item.correct_index;

                  return (
                    <div
                      key={`quiz-${qIdx}-${item.question.slice(0, 18)}`}
                      className="rounded-2xl border px-4 py-4"
                      style={{ borderColor: 'var(--lesson-line)', background: '#fffaf2' }}
                    >
                      <p className="text-base font-semibold" style={{ color: 'var(--lesson-ink)' }}>
                        {qIdx + 1}. {item.question}
                      </p>

                      <div className="mt-3 space-y-2">
                        {item.options.map((option, oIdx) => {
                          const selectedThis = selected === oIdx;
                          const correctOption = quizSubmitted && oIdx === item.correct_index;
                          const wrongSelection = quizSubmitted && selectedThis && oIdx !== item.correct_index;

                          const optionStyle: React.CSSProperties = correctOption
                            ? { borderColor: '#86cbb9', background: '#e6f5f1', color: '#0f766e' }
                            : wrongSelection
                              ? { borderColor: '#efb4ad', background: '#fdeceb', color: '#b42318' }
                              : selectedThis
                                ? { borderColor: '#cfd8e3', background: '#eef3f9', color: '#334155' }
                                : { borderColor: 'var(--lesson-line)', background: '#fffdf8', color: '#334155' };

                          return (
                            <button
                              key={`quiz-${qIdx}-option-${oIdx}`}
                              onClick={() => {
                                if (quizSubmitted) return;
                                setQuizAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
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
                        <p className="mt-2 text-xs leading-6" style={{ color: isCorrect ? '#0f766e' : '#b42318' }}>
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
                  disabled={quizSubmitted || !canSubmitQuiz}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'linear-gradient(120deg, #0f766e, #1d9a8f)' }}
                >
                  {copy.checkResult}
                </button>

                <button
                  onClick={() => {
                    setQuizAnswers({});
                    setQuizSubmitted(false);
                  }}
                  className="rounded-full border px-4 py-2 text-sm font-semibold"
                  style={{ borderColor: 'var(--lesson-line)', color: 'var(--lesson-ink)' }}
                >
                  {copy.resetQuiz}
                </button>

                {quizSubmitted && typeof quizScore === 'number' ? (
                  <p className="text-sm font-semibold" style={{ color: '#0f766e' }}>
                    {copy.quizScore}: {quizScore}/{quizItems.length}
                  </p>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--lesson-muted)' }}>
                    {copy.quizFillAll}
                  </p>
                )}
              </div>
            </section>

            {(currentStep?.step_type === 'next' || activeStepIndex === steps.length - 1) && (
              <section
                className="mt-8 rounded-[30px] border px-6 py-7 md:px-10 md:py-8"
                style={{ borderColor: 'var(--lesson-line)', background: 'var(--lesson-paper)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--lesson-muted)' }}>
                  {copy.nextBlockTitle}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={markLessonCompleted}
                    disabled={lesson.is_completed || isCompleting}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background: lesson.is_completed ? '#e0f2e9' : '#d9efe9',
                      color: lesson.is_completed ? '#0f5d46' : '#0f766e',
                    }}
                  >
                    {isCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {lesson.is_completed ? copy.completed : copy.markComplete}
                  </button>

                  {lesson.next_lesson_id ? (
                    <button
                      onClick={() => router.push(`/dashboard/lessons/${lesson.next_lesson_id}`)}
                      className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-white"
                      style={{ background: 'linear-gradient(120deg, #0f766e, #1d9a8f)' }}
                    >
                      {copy.nextLesson}
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--lesson-muted)' }}>
                      {copy.noNextLesson}
                    </p>
                  )}
                </div>
              </section>
            )}

            <div className="mt-8 text-center text-xs" style={{ color: '#7a8797' }}>
              {firstName} · TradeMentor AI
            </div>
          </>
        )}
      </main>
    </div>
  );
}
