'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Languages, BrainCircuit, ArrowRight } from 'lucide-react';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

type AssessmentAnswer = { questionId: string; value: number };

const QUESTIONS = [
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
    {
        value: 1,
        ru: 'Начальный уровень понимания',
        uz: 'Boshlang‘ich tushuncha darajasi',
    },
    {
        value: 2,
        ru: 'Средний уровень, иногда применяю',
        uz: 'O‘rta daraja, ba’zan amalda ishlataman',
    },
    {
        value: 3,
        ru: 'Уверенно применяю в торговом плане',
        uz: 'Savdo rejamda ishonch bilan qo‘llayman',
    },
];

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

    const title = language === 'UZ' ? 'Boshlang‘ich baholash' : 'Стартовая оценка уровня';
    const subtitle = language === 'UZ'
        ? 'Platforma sizga mos kurslar va AI mentor chuqurligini tanlash uchun qisqa test.'
        : 'Короткий тест, чтобы подобрать подходящие курсы и глубину AI-ментора.';

    const selectAnswer = (value: number) => {
        if (!currentQuestion) return;
        setAnswers(prev => {
            const withoutCurrent = prev.filter(item => item.questionId !== currentQuestion.id);
            return [...withoutCurrent, { questionId: currentQuestion.id, value }];
        });
    };

    const nextQuestion = () => {
        if (index < QUESTIONS.length - 1) setIndex(index + 1);
    };

    const prevQuestion = () => {
        if (index > 0) setIndex(index - 1);
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
            setError(e.response?.data?.error || 'Failed to submit assessment');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0B1220' }}>
            <div className="w-full max-w-3xl glass-card p-8 md:p-10">
                <AnimatePresence mode="wait">
                    {step === 'welcome' && (
                        <motion.div key="welcome" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(123,63,228,0.2)' }}>
                                    <BrainCircuit size={20} style={{ color: '#A87BFF' }} />
                                </div>
                                <h1 className="text-2xl md:text-3xl font-black text-white">{title}</h1>
                            </div>
                            <p className="text-sm" style={{ color: '#7B8CA6' }}>{subtitle}</p>

                            <div className="mt-8 rounded-xl p-5" style={{ background: 'rgba(17,26,47,0.7)', border: '1px solid rgba(42,169,255,0.15)' }}>
                                <p className="text-sm text-white font-semibold">
                                    {language === 'UZ' ? 'Avval interfeys tilini tanlang:' : 'Сначала выберите язык интерфейса:'}
                                </p>
                                <div className="flex items-center gap-3 mt-4">
                                    <button onClick={() => setLanguage('RU')} className={`px-4 py-2 rounded-xl text-sm font-bold ${language === 'RU' ? 'btn-primary' : 'btn-secondary'}`}>RU</button>
                                    <button onClick={() => setLanguage('UZ')} className={`px-4 py-2 rounded-xl text-sm font-bold ${language === 'UZ' ? 'btn-primary' : 'btn-secondary'}`}>UZ</button>
                                    <Languages size={18} style={{ color: '#7B8CA6' }} />
                                </div>
                            </div>

                            <button
                                onClick={() => setStep('tutorial')}
                                className="mt-8 px-6 py-3 rounded-xl text-sm font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}
                            >
                                {language === 'UZ' ? 'Davom etish' : 'Продолжить'}
                            </button>
                        </motion.div>
                    )}

                    {step === 'tutorial' && (
                        <motion.div key="tutorial" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                            <h2 className="text-xl font-black text-white">
                                {language === 'UZ' ? 'Platformadan qanday foydalaniladi' : 'Как устроено обучение на платформе'}
                            </h2>
                            <div className="mt-6 space-y-3">
                                {[
                                    language === 'UZ' ? '1) Akademiyada kurs -> modul -> dars ketma-ketligini o‘ting.' : '1) В Академии проходите курс -> модуль -> урок по структуре.',
                                    language === 'UZ' ? '2) Har darsdan keyin "Mark complete" qiling va progressni kuzating.' : '2) После урока отмечайте "Mark complete" и отслеживайте прогресс.',
                                    language === 'UZ' ? '3) AI Mentor’dan aynan dars konteksti bo‘yicha savol bering.' : '3) Задавайте AI Mentor вопросы по контексту текущего урока.',
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
                                    {language === 'UZ' ? 'Testni boshlash' : 'Начать тест'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'quiz' && currentQuestion && (
                        <motion.div key="quiz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                            <div className="flex items-center justify-between mb-4 text-xs" style={{ color: '#7B8CA6' }}>
                                <span>{language === 'UZ' ? 'Savol' : 'Вопрос'} {index + 1} / {QUESTIONS.length}</span>
                                <span className="uppercase tracking-wider">{currentQuestion.topic}</span>
                            </div>
                            <div className="h-2 rounded-full mb-6" style={{ background: 'rgba(123,63,228,0.14)' }}>
                                <div className="h-2 rounded-full" style={{ width: `${((index + 1) / QUESTIONS.length) * 100}%`, background: 'linear-gradient(90deg, #7B3FE4, #2AA9FF)' }} />
                            </div>

                            <h2 className="text-xl font-bold text-white">{language === 'UZ' ? currentQuestion.uz : currentQuestion.ru}</h2>

                            <div className="mt-6 space-y-3">
                                {OPTIONS.map((opt) => {
                                    const selected = currentAnswer === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => selectAnswer(opt.value)}
                                            className="w-full text-left rounded-xl p-4 transition-all"
                                            style={{
                                                background: selected ? 'rgba(123,63,228,0.18)' : 'rgba(17,26,47,0.7)',
                                                border: selected ? '1px solid rgba(123,63,228,0.45)' : '1px solid rgba(123,63,228,0.15)',
                                                color: selected ? '#E6EDF7' : '#C8D4E8'
                                            }}
                                        >
                                            {language === 'UZ' ? opt.uz : opt.ru}
                                        </button>
                                    );
                                })}
                            </div>

                            {error && <p className="text-sm mt-4" style={{ color: '#F87171' }}>{error}</p>}

                            <div className="flex justify-between mt-8">
                                <button onClick={prevQuestion} disabled={index === 0} className="btn-secondary px-5 py-2.5 text-sm font-bold disabled:opacity-40">
                                    {language === 'UZ' ? 'Oldingi' : 'Назад'}
                                </button>

                                {index < QUESTIONS.length - 1 ? (
                                    <button onClick={nextQuestion} disabled={!currentAnswer} className="btn-primary px-5 py-2.5 text-sm font-bold disabled:opacity-40">
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
                        <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                                    <CheckCircle2 size={34} style={{ color: '#10B981' }} />
                                </div>
                                <h2 className="text-2xl font-black text-white mt-4">
                                    {language === 'UZ' ? 'Baholash yakunlandi' : 'Оценка завершена'}
                                </h2>
                                <p className="text-sm mt-2" style={{ color: '#7B8CA6' }}>
                                    {language === 'UZ' ? 'Sizning darajangiz:' : 'Ваш уровень:'} <strong className="text-white">{result.level}</strong>
                                </p>
                                <p className="text-sm" style={{ color: '#7B8CA6' }}>
                                    {language === 'UZ' ? 'Natija:' : 'Результат:'} <strong className="text-white">{result.score}%</strong>
                                </p>

                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="mt-8 px-6 py-3 rounded-xl text-sm font-bold text-white inline-flex items-center gap-2"
                                    style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}
                                >
                                    {language === 'UZ' ? 'Akademiyaga o‘tish' : 'Перейти в Академию'}
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
