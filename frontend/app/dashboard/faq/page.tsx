'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronRight, HelpCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

type FaqItem = {
    id: string;
    category: 'ai' | 'courses' | 'import' | 'technical' | 'assessment';
    question: { RU: string; UZ: string };
    answer: { RU: string; UZ: string };
};

const FAQ_ITEMS: FaqItem[] = [
    {
        id: 'ai-mentor',
        category: 'ai',
        question: { RU: 'Что такое AI Mentor?', UZ: 'AI Mentor nima?' },
        answer: {
            RU: 'AI Mentor — это персональный торговый ассистент. Он отвечает только по трейдингу, учитывает ваш язык, уровень и контекст текущего урока.',
            UZ: 'AI Mentor — bu shaxsiy savdo yordamchisi. U faqat trading mavzusida javob beradi va sizning tilingiz, darajangiz hamda joriy dars kontekstini hisobga oladi.'
        }
    },
    {
        id: 'courses-structure',
        category: 'courses',
        question: { RU: 'Как устроены курсы и уроки?', UZ: 'Kurslar va darslar qanday tuzilgan?' },
        answer: {
            RU: 'Материал организован как курс → модуль → урок. Вы открываете курс, изучаете уроки по порядку, отмечаете completion и видите прогресс.',
            UZ: 'Material kurs → modul → dars shaklida tashkil etilgan. Kursni ochib, darslarni ketma-ket o‘tasiz, completion belgilaysiz va progressni ko‘rasiz.'
        }
    },
    {
        id: 'import-books',
        category: 'import',
        question: { RU: 'Как импортируются книги/PDF?', UZ: 'Kitob/PDF importi qanday ishlaydi?' },
        answer: {
            RU: 'Superadmin загружает PDF, система извлекает текст, AI анализирует и автоматически создаёт курс, модуль и уроки.',
            UZ: 'Superadmin PDF yuklaydi, tizim matnni ajratadi, AI tahlil qiladi va avtomatik ravishda kurs, modul hamda darslar yaratadi.'
        }
    },
    {
        id: 'progress',
        category: 'courses',
        question: { RU: 'Как работает progress?', UZ: 'Progress qanday ishlaydi?' },
        answer: {
            RU: 'После изучения урока нажмите “Mark complete”. Платформа обновит прогресс по курсу и покажет завершённые уроки.',
            UZ: 'Darsni tugatgandan keyin “Mark complete” tugmasini bosing. Platforma kurs progressini yangilaydi va tugallangan darslarni ko‘rsatadi.'
        }
    },
    {
        id: 'chart-analysis',
        category: 'ai',
        question: { RU: 'Как работает AI анализ графиков?', UZ: 'AI grafik tahlili qanday ishlaydi?' },
        answer: {
            RU: 'На странице AI загрузите изображение графика (PNG/JPEG), опишите вопрос, и AI даст структурированный разбор.',
            UZ: 'AI sahifasida grafik rasmini (PNG/JPEG) yuklang, savolingizni yozing va AI sizga tuzilgan tahlil beradi.'
        }
    },
    {
        id: 'language-switch',
        category: 'technical',
        question: { RU: 'Как работает смена языка?', UZ: 'Til almashtirish qanday ishlaydi?' },
        answer: {
            RU: 'Язык можно переключить RU/UZ в интерфейсе. Выбор сохраняется в профиле пользователя и влияет на контент и ответы AI.',
            UZ: 'Interfeysda RU/UZ tilini almashtirish mumkin. Tanlov foydalanuvchi profilida saqlanadi va kontent hamda AI javoblariga ta’sir qiladi.'
        }
    },
    {
        id: 'pdf-issue',
        category: 'technical',
        question: { RU: 'Что делать, если PDF не открылся?', UZ: 'PDF ochilmasa nima qilish kerak?' },
        answer: {
            RU: 'Проверьте интернет, обновите страницу (F5), затем Shift+Ctrl+F5. Если проблема остаётся — обратитесь к superadmin.',
            UZ: 'Internetni tekshiring, sahifani yangilang (F5), keyin Shift+Ctrl+F5 bosing. Muammo qolsa, superadminga murojaat qiling.'
        }
    },
    {
        id: 'ai-issue',
        category: 'technical',
        question: { RU: 'Что делать, если AI не отвечает?', UZ: 'AI javob bermasa nima qilish kerak?' },
        answer: {
            RU: 'Повторите запрос через несколько секунд, сократите сообщение и убедитесь, что запрос по теме трейдинга.',
            UZ: 'Bir necha soniyadan so‘ng qayta yuboring, xabarni qisqartiring va savol trading mavzusiga oid ekanini tekshiring.'
        }
    },
    {
        id: 'assessment',
        category: 'assessment',
        question: { RU: 'Как работает assessment?', UZ: 'Assessment qanday ishlaydi?' },
        answer: {
            RU: 'При первом входе вы проходите тест из 10 вопросов. По результату определяется уровень: Beginner / Intermediate / Advanced.',
            UZ: 'Birinchi kirishda 10 savollik testdan o‘tasiz. Natijaga ko‘ra daraja belgilanadi: Beginner / Intermediate / Advanced.'
        }
    },
    {
        id: 'refresh-site',
        category: 'technical',
        question: { RU: 'Как обновить сайт после изменений?', UZ: 'O‘zgarishlardan keyin saytni qanday yangilash kerak?' },
        answer: {
            RU: 'Нажмите F5. Если не помогло — Shift + Ctrl + F5 для принудительной перезагрузки.',
            UZ: 'F5 tugmasini bosing. Yordam bermasa — majburiy yangilash uchun Shift + Ctrl + F5 bosing.'
        }
    },
];

const CATEGORIES: Array<{ id: FaqItem['category'] | 'all'; RU: string; UZ: string }> = [
    { id: 'all', RU: 'Все', UZ: 'Barchasi' },
    { id: 'ai', RU: 'AI Mentor', UZ: 'AI Mentor' },
    { id: 'courses', RU: 'Курсы', UZ: 'Kurslar' },
    { id: 'import', RU: 'Импорт', UZ: 'Import' },
    { id: 'assessment', RU: 'Assessment', UZ: 'Assessment' },
    { id: 'technical', RU: 'Техвопросы', UZ: 'Texnik' },
];

export default function FaqPage() {
    const { language } = useLanguage();
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<FaqItem['category'] | 'all'>('all');
    const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id || null);

    const filtered = useMemo(() => {
        return FAQ_ITEMS.filter(item => {
            const byCategory = category === 'all' || item.category === category;
            const q = item.question[language].toLowerCase();
            const a = item.answer[language].toLowerCase();
            const bySearch = !search.trim() || q.includes(search.toLowerCase()) || a.includes(search.toLowerCase());
            return byCategory && bySearch;
        });
    }, [category, language, search]);

    return (
        <div className="min-h-screen text-white" style={{ background: '#0B1220' }}>
            <div className="max-w-5xl mx-auto px-6 py-10">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="btn-secondary px-4 py-2 text-sm font-bold inline-flex items-center gap-2"
                    >
                        <ArrowLeft size={16} />
                        {language === 'UZ' ? 'Dashboardga qaytish' : 'Назад в Dashboard'}
                    </button>
                </div>

                <div className="glass-card p-6 md:p-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(123,63,228,0.18)' }}>
                            <HelpCircle size={20} style={{ color: '#A87BFF' }} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black">FAQ</h1>
                            <p className="text-sm" style={{ color: '#7B8CA6' }}>
                                {language === 'UZ' ? 'Platforma bo‘yicha tez-tez so‘raladigan savollar' : 'Часто задаваемые вопросы по платформе'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-4">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7B8CA6' }} />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={language === 'UZ' ? 'Savolni qidiring...' : 'Поиск по вопросам...'}
                                className="w-full pl-10 pr-4 py-3 rounded-xl input-base"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${category === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    {cat[language]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {filtered.length === 0 ? (
                            <div className="rounded-xl p-8 text-center" style={{ background: 'rgba(11,18,32,0.6)', border: '1px dashed rgba(123,63,228,0.25)' }}>
                                <p className="text-sm" style={{ color: '#7B8CA6' }}>
                                    {language === 'UZ' ? 'Mos savollar topilmadi.' : 'Подходящие вопросы не найдены.'}
                                </p>
                            </div>
                        ) : filtered.map(item => {
                            const isOpen = openId === item.id;
                            return (
                                <div key={item.id} className="rounded-xl overflow-hidden" style={{ background: 'rgba(11,18,32,0.62)', border: '1px solid rgba(123,63,228,0.14)' }}>
                                    <button
                                        onClick={() => setOpenId(isOpen ? null : item.id)}
                                        className="w-full flex items-center justify-between text-left p-4 hover:bg-white/[0.02] transition-colors"
                                    >
                                        <p className="text-sm font-semibold text-white pr-3">{item.question[language]}</p>
                                        {isOpen ? <ChevronDown size={16} style={{ color: '#A87BFF' }} /> : <ChevronRight size={16} style={{ color: '#7B8CA6' }} />}
                                    </button>
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-4 text-sm" style={{ color: '#C8D4E8', borderTop: '1px solid rgba(123,63,228,0.12)' }}>
                                                    <p className="pt-3">{item.answer[language]}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
