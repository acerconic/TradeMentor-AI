'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '@/lib/translations';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('RU');

    useEffect(() => {
        const saved = localStorage.getItem('language') as Language;
        if (saved && (saved === 'RU' || saved === 'UZ')) {
            setLanguageState(saved);
        }

        const token = Cookies.get('token');
        if (!token) return;

        api.get('/auth/me')
            .then((res) => {
                const fromApi = (res.data?.language || '').toUpperCase();
                const normalized = fromApi === 'UZ' ? 'UZ' : 'RU';

                if (!saved) {
                    setLanguageState(normalized);
                    localStorage.setItem('language', normalized);
                }

                const userStr = Cookies.get('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        user.language = normalized;
                        Cookies.set('user', JSON.stringify(user), { expires: 7 });
                    } catch {
                        // ignore cookie parse errors
                    }
                }
            })
            .catch(() => {
                // ignore auth/language sync errors on client init
            });
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);

        const userStr = Cookies.get('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                user.language = lang;
                Cookies.set('user', JSON.stringify(user), { expires: 7 });
            } catch {
                // ignore cookie parse errors
            }
        }

        const token = Cookies.get('token');
        if (token) {
            api.patch('/auth/language', { language: lang }).catch(() => {
                // keep UI responsive even if API sync fails
            });
        }
    };

    const t = (path: string) => {
        const keys = path.split('.');
        let current: any = translations[language];
        let fallback: any = translations.RU;

        for (const key of keys) {
            current = current?.[key];
            fallback = fallback?.[key];
        }

        if (typeof current === 'string') return current;
        if (typeof fallback === 'string') return fallback;
        return '';
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within LanguageProvider');
    return context;
}
