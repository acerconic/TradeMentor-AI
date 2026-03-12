export const translations = {
    RU: {
        common: {
            loading: 'Загрузка...',
            error: 'Ошибка',
            success: 'Успешно',
            academy: 'Академия',
            progress: 'Прогресс',
            signals: 'Сигналы',
            soon: 'СКОРО',
            logout: 'Выйти',
            profile: 'Профиль',
            settings: 'Настройки',
            welcomeBack: 'С возвращением',
            goodMorning: 'Доброе утро',
            goodAfternoon: 'Добрый день',
            goodEvening: 'Добрый вечер',
            consultAI: 'Консультация AI',
            askAI: 'Спросить AI',
            activeMentor: 'AI МЕНТОР АКТИВЕН',
            masterMarkets: 'Освойте рынки с AI',
            aiGuidance: 'Мгновенная обратная связь по графикам и психологии.',
            yourProgress: 'ВАШ ПРОГРЕСС',
            skillMatrix: 'Матрица навыков',
            courses: 'Курсы',
            inProgress: 'В процессе',
            completed: 'Завершено',
            availableCourses: 'Доступные курсы',
            lessons: 'уроков',
            start: 'Начать',
            noCourses: 'Курсы пока не добавлены'
        },
        admin: {
            dashboard: 'Дашборд',
            students: 'Студенты',
            importLibrary: 'Импорт библиотеки',
            aiResponses: 'AI Ответы',
            auditLogs: 'Логи аудита',
            newCourse: 'Новый курс'
        }
    },
    UZ: {
        common: {
            loading: 'Yuklanmoqda...',
            error: 'Xatolik',
            success: 'Muvaffaqiyatli',
            academy: 'Akademiya',
            progress: 'Progress',
            signals: 'Signallar',
            soon: 'TEZ ORADA',
            logout: 'Chiqish',
            profile: 'Profil',
            settings: 'Sozlamalar',
            welcomeBack: 'Xush kelibsiz',
            goodMorning: 'Xayrli tong',
            goodAfternoon: 'Xayrli kun',
            goodEvening: 'Xayrli kecha',
            consultAI: 'AI Konsultatsiyasi',
            askAI: 'AI dan so\'rang',
            activeMentor: 'AI MENTOR FAOAL',
            masterMarkets: 'Bozorni AI bilan o\'rganing',
            aiGuidance: 'Grafiklar va psixologiya bo\'yicha tezkor javoblar.',
            yourProgress: 'SIZNING PROGRESSINGIZ',
            skillMatrix: 'Ko\'nikmalar matritsasi',
            courses: 'Kurslar',
            inProgress: 'Jarayonda',
            completed: 'Tugallangan',
            availableCourses: 'Mavjud kurslar',
            lessons: 'darslar',
            start: 'Boshlash',
            noCourses: 'Kurslar hali qo\'shilmagan'
        },
        admin: {
            dashboard: 'Boshqaruv paneli',
            students: 'Talabalar',
            importLibrary: 'Kutubxonani import qilish',
            aiResponses: 'AI Javoblari',
            auditLogs: 'Audit loglari',
            newCourse: 'Yangi kurs'
        }
    }
};

export type Language = 'RU' | 'UZ';
export type TranslationKey = keyof typeof translations.RU;
