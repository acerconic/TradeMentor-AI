'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowRight, BrainCircuit, CheckCircle2, Clock3, Languages, Loader2, Sparkles, Target } from 'lucide-react';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

type AssessmentAnswer = { questionId: string; value: number };

type Question = {
    id: string;
    topic: 'market' | 'risk' | 'psychology' | 'liquidity' | 'ict-smc';
    ru: string;
    uz: string;
};

const QUESTIONS: Question[] = [
    { id: 'q1', topic: 'market', ru: 'Что означает BOS (Break of Structure)?', uz: 'BOS (Break of Structure) nimani anglatadi?' },
    { id: 'q2', topic: 'market', ru: 'Как определить текущий тренд на старшем таймфрейме?', uz: 'Katta timeframe’da trendni qanday aniqlaysiz?' },
    { id: 'q3', topic: 'risk', ru: 'Какой риск на сделку считается безопасным?', uz: 'Bitta savdo uchun xavf foizi qancha bo‘lishi xavfsiz?' },
    { id: 'q4', topic: 'risk', ru: 'Что важнее: R:R или процент выигрышных сделок?', uz: 'Qaysi biri muhimroq: R:R yoki yutuqli savdolar foizi?' },
    { id: 'q5', topic: 'psychology', ru: 'Что делать после серии убыточных сделок?', uz: 'Ketma-ket zararli savdolardan keyin nima qilish kerak?' },
    { id: 'q6', topic: 'psychology', ru: 'Как избегать revenge trading?', uz: 'Revenge trading’dan qanday qochish mumkin?' },
    { id: 'q7', topic: 'liquidity', ru: 'Что такое ликвидность на рынке?', uz: 'Bozorda likvidlik nima?' },
    { id: 'q8', topic: 'liquidity', ru: 'Почему рынок часто выносит стопы перед импульсом?', uz: 'Nega bozor impulsdan oldin stoplarni yig‘adi?' },
    { id: 'q9', topic: 'ict-smc', ru: 'Что такое order block?', uz: 'Order block nima?' },
    { id: 'q10', topic: 'ict-smc', ru: 'Что такое FVG (Fair Value Gap)?', uz: 'FVG (Fair Value Gap) nima?' },
];

const OPTIONS = [
    { value: 1, ru: 'Базовое понимание', uz: 'Boshlang‘ich tushuncha' },
    { value: 2, ru: 'Средний уровень, применяю иногда', uz: 'O‘rta daraja, ba’zan qo‘llayman' },
    { value: 3, ru: 'Уверенно применяю в плане', uz: 'Rejamda ishonch bilan qo‘llayman' },
];

function getLevelDescription(level: string, language: 'RU' | 'UZ') {
    if (language === 'UZ') {
        if (level === 'Advanced') return 'Siz chuqurroq strategiyalar va murakkab kontekstli AI mentor rejimiga tayyorsiz.';
        if (level === 'Intermediate') return 'Sizda asoslar bor, endi tizimli execution va risk intizomini kuchaytiramiz.';
        return 'Boshlang‘ich yo‘l tanlandi: asosiy market structure, risk va intizom bloklaridan boshlaymiz.';
    }

    if (level === 'Advanced') return 'Готов продвигаться в сложные стратегии и контекстный режим AI-ментора.';
    if (level === 'Intermediate') return 'Есть база, теперь усилим системный execution и дисциплину risk management.';
    return 'Стартуем с фундаментальных блоков: market structure, risk management и психология.';
}

export default function AssessmentPage() {
    const { language, setLanguage } = useLanguage();
    const router = useRouter();

    const [step, setStep] = useState<'welcome' | 'tutorial' | 'quiz' | 'result'>('welcome');
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ level: string; score: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const currentQuestion = QUESTIONS[index];
    const currentAnswer = useMemo(() => answers.find(a => a.questionId === currentQuestion?.id)?.value, [answers, currentQuestion]);
    const answeredCount = answers.length;
    const quizProgress = Math.round(((index + 1) / QUESTIONS.length) * 100);

    const selectAnswer = (value: number) => {
        if (!currentQuestion) return;
        setAnswers(prev => {
            const withoutCurrent = prev.filter(item => item.questionId !== currentQuestion.id);
            return [...withoutCurrent, { questionId: currentQuestion.id, value }];
        });
    };

    const submitAssessment = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post('/auth/assessment/submit', { answers });
            setResult({ level: res.data.level, score: res.data.score });

            const userStr = Cookies.get('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                Cookies.set('user', JSON.stringify({
                    ...user,
                    onboardingPassed: true,
                    tradingLevel: res.data.level,
                    language,
                }), { expires: 7 });
            }

            setStep('result');
        } catch (e: any) {
            setError(e.response?.data?.error || (language === 'UZ' ? 'Assessment yuborilmadi' : 'Не удалось отправить assessment'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'radial-gradient(circle at 20% 0%, rgba(123,63,228,0.18), transparent 40%), #0B1220' }}>
            <div className="w-full max-w-4xl glass-card p-7 md:p-10" style={{ border: '1px solid rgba(123,63,228,0.2)' }}>
                <AnimatePresence mode="wait">
                    {step === 'welcome' && (
                        <motion.div key="welcome" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(123,63,228,0.2)' }}>
                                    <BrainCircuit size={22} style={{ color: '#A87BFF' }} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-white">
                                        {language === 'UZ' ? 'Shaxsiy onboarding' : 'Персональный onboarding'}
                                    </h1>
                                    <p className="text-sm" style={{ color: '#7B8CA6' }}>
                                        {language === 'UZ' ? '3 daqiqa ichida learning path va AI mentor uslubini sozlaymiz.' : 'За 3 минуты настроим ваш learning path и стиль AI-ментора.'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
                                <div className="rounded-xl p-4" style={{ background: 'rgba(17,26,47,0.72)', border: '1px solid rgba(42,169,255,0.16)' }}>
                                    <Clock3 size={16} style={{ color: '#2AA9FF' }} />
                                    <p className="text-sm font-semibold text-white mt-2">{language === 'UZ' ? 'Taxminan 3 daqiqa' : 'Около 3 минут'}</p>
                                </div>
                                <div className="rounded-xl p-4" style={{ background: 'rgba(17,26,47,0.72)', border: '1px solid rgba(16,185,129,0.16)' }}>
                                    <Target size={16} style={{ color: '#10B981' }} />
                                    <p className="text-sm font-semibold text-white mt-2">{language === 'UZ' ? 'Daraja aniqlash' : 'Определение уровня'}</p>
                                </div>
                                <div className="rounded-xl p-4" style={{ background: 'rgba(17,26,47,0.72)', border: '1px solid rgba(123,63,228,0.2)' }}>
                                    <Sparkles size={16} style={{ color: '#A87BFF' }} />
                                    <p className="text-sm font-semibold text-white mt-2">{language === 'UZ' ? 'AI personalization' : 'Персонализация AI'}</p>
                                </div>
                            </div>

                            <div className="mt-8 rounded-xl p-5" style={{ background: 'rgba(17,26,47,0.7)', border: '1px solid rgba(42,169,255,0.15)' }}>
                                <p className="text-sm text-white font-semibold">
                                    {language === 'UZ' ? 'Interfeys tilini tanlang:' : 'Выберите язык интерфейса:'}
                                </p>
                                <div className="flex items-center gap-3 mt-4">
                                    <button onClick={() => setLanguage('RU')} className={`px-4 py-2 rounded-xl text-sm font-bold ${language === 'RU' ? 'btn-primary' : 'btn-secondary'}`}>RU</button>
                                    <button onClick={() => setLanguage('UZ')} className={`px-4 py-2 rounded-xl text-sm font-bold ${language === 'UZ' ? 'btn-primary' : 'btn-secondary'}`}>UZ</button>
                                    <Languages size={18} style={{ color: '#7B8CA6' }} />
                                </div>
                            </div>

                            <button
                                onClick={() => setStep('tutorial')}
                                className="mt-8 px-6 py-3 rounded-xl text-sm font-bold text-white inline-flex items-center gap-2"
                                style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}
                            >
                                {language === 'UZ' ? 'Davom etish' : 'Продолжить'} <ArrowRight size={16} />
                            </button>
                        </motion.div>
                    )}

                    {step === 'tutorial' && (
                        <motion.div key="tutorial" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <h2 className="text-2xl font-black text-white">
                                {language === 'UZ' ? 'Sizni kutayotgan learning flow' : 'Ваш рабочий learning flow'}
                            </h2>
                            <div className="mt-6 space-y-3">
                                {[
                                    language === 'UZ' ? '1) Academy: Kurs → Modul → Dars ketma-ketligini o‘ting.' : '1) Academy: проходите Курс → Модуль → Урок по структуре.',
                                    language === 'UZ' ? '2) Har darsdan so‘ng Mark Complete ni bosing va progressni kuzating.' : '2) После урока нажимайте Mark Complete и отслеживайте прогресс.',
                                    language === 'UZ' ? '3) Ask AI about this lesson orqali aynan dars kontekstida savol bering.' : '3) Используйте Ask AI about this lesson для вопросов по контексту урока.',
                                ].map((item) => (
                                    <div key={item} className="rounded-xl p-4 text-sm" style={{ background: 'rgba(17,26,47,0.7)', border: '1px solid rgba(123,63,228,0.12)', color: '#C8D4E8' }}>
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setStep('welcome')} className="btn-secondary px-5 py-2.5 text-sm font-bold">
                                    {language === 'UZ' ? 'Orqaga' : 'Назад'}
                                </button>
                                <button onClick={() => setStep('quiz')} className="btn-primary px-5 py-2.5 text-sm font-bold">
                                    {language === 'UZ' ? 'Assessment boshlash' : 'Начать assessment'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'quiz' && currentQuestion && (
                        <motion.div key="quiz" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <div className="flex items-center justify-between mb-3 text-xs" style={{ color: '#7B8CA6' }}>
                                <span>{language === 'UZ' ? 'Savol' : 'Вопрос'} {index + 1} / {QUESTIONS.length}</span>
                                <span>{language === 'UZ' ? `Javob berilgan: ${answeredCount}/${QUESTIONS.length}` : `Отвечено: ${answeredCount}/${QUESTIONS.length}`}</span>
                            </div>
                            <div className="h-2 rounded-full mb-6" style={{ background: 'rgba(123,63,228,0.14)' }}>
                                <div className="h-2 rounded-full transition-all" style={{ width: `${quizProgress}%`, background: 'linear-gradient(90deg, #7B3FE4, #2AA9FF)' }} />
                            </div>

                            <div className="rounded-xl p-5" style={{ background: 'rgba(17,26,47,0.7)', border: '1px solid rgba(42,169,255,0.15)' }}>
                                <p className="text-xs uppercase tracking-widest font-bold" style={{ color: '#7B8CA6' }}>{currentQuestion.topic}</p>
                                <h3 className="text-xl font-bold text-white mt-2">{language === 'UZ' ? currentQuestion.uz : currentQuestion.ru}</h3>
                            </div>

                            <div className="mt-5 space-y-3">
                                {OPTIONS.map((opt) => {
                                    const selected = currentAnswer === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => selectAnswer(opt.value)}
                                            className="w-full text-left rounded-xl p-4 transition-all"
                                            style={{
                                                background: selected ? 'rgba(123,63,228,0.2)' : 'rgba(17,26,47,0.7)',
                                                border: selected ? '1px solid rgba(123,63,228,0.48)' : '1px solid rgba(123,63,228,0.15)',
                                                color: '#E6EDF7'
                                            }}
                                        >
                                            <p className="text-sm font-semibold">{language === 'UZ' ? opt.uz : opt.ru}</p>
                                        </button>
                                    );
                                })}
                            </div>

                            {error && <p className="text-sm mt-4" style={{ color: '#F87171' }}>{error}</p>}

                            <div className="flex justify-between mt-8">
                                <button onClick={() => setIndex((v) => Math.max(0, v - 1))} disabled={index === 0} className="btn-secondary px-5 py-2.5 text-sm font-bold disabled:opacity-40">
                                    {language === 'UZ' ? 'Oldingi' : 'Назад'}
                                </button>

                                {index < QUESTIONS.length - 1 ? (
                                    <button onClick={() => setIndex((v) => Math.min(QUESTIONS.length - 1, v + 1))} disabled={!currentAnswer} className="btn-primary px-5 py-2.5 text-sm font-bold disabled:opacity-40">
                                        {language === 'UZ' ? 'Keyingi' : 'Далее'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={submitAssessment}
                                        disabled={answers.length < QUESTIONS.length || isSubmitting}
                                        className="btn-primary px-5 py-2.5 text-sm font-bold disabled:opacity-40 inline-flex items-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        {language === 'UZ' ? 'Yakunlash' : 'Завершить'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {step === 'result' && result && (
                        <motion.div key="result" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                                    <CheckCircle2 size={34} style={{ color: '#10B981' }} />
                                </div>
                                <h2 className="text-3xl font-black text-white mt-4">
                                    {language === 'UZ' ? 'Shaxsiy learning setup tayyor' : 'Персональный learning setup готов'}
                                </h2>
                                <p className="text-sm mt-3" style={{ color: '#7B8CA6' }}>
                                    {language === 'UZ' ? 'Sizning darajangiz:' : 'Ваш уровень:'} <strong className="text-white">{result.level}</strong>
                                </p>
                                <p className="text-sm" style={{ color: '#7B8CA6' }}>
                                    {language === 'UZ' ? 'Natija:' : 'Результат:'} <strong className="text-white">{result.score}%</strong>
                                </p>

                                <div className="mt-6 rounded-xl p-4 text-left" style={{ background: 'rgba(17,26,47,0.72)', border: '1px solid rgba(123,63,228,0.18)' }}>
                                    <p className="text-xs uppercase tracking-widest font-bold" style={{ color: '#7B8CA6' }}>
                                        {language === 'UZ' ? 'Tavsiyalar' : 'Рекомендации'}
                                    </p>
                                    <p className="text-sm mt-2" style={{ color: '#C8D4E8' }}>
                                        {getLevelDescription(result.level, language)}
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                                    <button
                                        onClick={() => router.push('/dashboard')}
                                        className="px-6 py-3 rounded-xl text-sm font-bold text-white inline-flex items-center gap-2"
                                        style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}
                                    >
                                        {language === 'UZ' ? 'Akademiyaga o‘tish' : 'Перейти в Академию'}
                                        <ArrowRight size={16} />
                                    </button>
                                    <button
                                        onClick={() => router.push('/ai')}
                                        className="px-6 py-3 rounded-xl text-sm font-bold btn-secondary"
                                    >
                                        {language === 'UZ' ? 'AI Mentor ochish' : 'Открыть AI Mentor'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
