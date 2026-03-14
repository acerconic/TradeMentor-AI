'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Globe,
    Mail,
    Smartphone,
    Moon,
    Lock,
    Shield,
    Loader2,
    CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

type UserSettings = {
    language: 'RU' | 'UZ';
    emailNotifications: boolean;
    pushNotifications: boolean;
    darkMode: boolean;
};

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
        onClick={() => onChange(!value)}
        className="w-11 h-6 rounded-full relative transition-colors"
        style={{ background: value ? '#7B3FE4' : 'rgba(148,163,184,0.3)' }}
    >
        <span
            className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
            style={{ left: value ? '22px' : '4px' }}
        />
    </button>
);

export default function SettingsPage() {
    const router = useRouter();
    const { t, setLanguage, language } = useLanguage();
    const [user, setUser] = useState<any>(null);
    const [settings, setSettings] = useState<UserSettings>({
        language,
        emailNotifications: true,
        pushNotifications: true,
        darkMode: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const userStr = Cookies.get('user');
        if (!userStr) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(userStr));

        api.get('/auth/settings')
            .then((res) => {
                const next: UserSettings = {
                    language: res.data?.language === 'UZ' ? 'UZ' : 'RU',
                    emailNotifications: Boolean(res.data?.emailNotifications),
                    pushNotifications: Boolean(res.data?.pushNotifications),
                    darkMode: Boolean(res.data?.darkMode),
                };
                setSettings(next);
                setLanguage(next.language);
            })
            .catch(() => null)
            .finally(() => setIsLoading(false));
    }, [router, setLanguage]);

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            await api.patch('/auth/settings', settings);
            setLanguage(settings.language);
            showToast(t('settings.saved'));
        } catch {
            showToast(t('settings.saveError'));
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen text-white pb-20" style={{ background: '#0B1220' }}>
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-full text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}
                    >
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-3xl mx-auto px-6 pt-12">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-slate-400"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>{t('settings.title')}</h1>
                            <p className="text-slate-500 text-sm">{t('settings.subtitle')}</p>
                        </div>
                    </div>

                    <button
                        onClick={saveSettings}
                        disabled={isSaving || isLoading}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 inline-flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        {t('common.save')}
                    </button>
                </div>

                {isLoading ? (
                    <div className="py-16 flex items-center justify-center text-slate-500">
                        <Loader2 size={24} className="animate-spin mr-2" /> {t('common.loading')}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="glass-card p-6">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">{t('settings.preferences')}</h2>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Globe size={18} className="text-blue-400" />
                                        <div>
                                            <p className="text-sm font-semibold text-white">{t('common.language')}</p>
                                            <p className="text-xs text-slate-500">RU / UZ</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSettings((s) => ({ ...s, language: 'RU' }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${settings.language === 'RU' ? 'btn-primary' : 'btn-secondary'}`}
                                        >RU</button>
                                        <button
                                            onClick={() => setSettings((s) => ({ ...s, language: 'UZ' }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${settings.language === 'UZ' ? 'btn-primary' : 'btn-secondary'}`}
                                        >UZ</button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Mail size={18} className="text-purple-400" />
                                        <div>
                                            <p className="text-sm font-semibold text-white">{t('settings.emailNotifications')}</p>
                                            <p className="text-xs text-slate-500">System emails and updates</p>
                                        </div>
                                    </div>
                                    <Toggle value={settings.emailNotifications} onChange={(v) => setSettings((s) => ({ ...s, emailNotifications: v }))} />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Smartphone size={18} className="text-emerald-400" />
                                        <div>
                                            <p className="text-sm font-semibold text-white">{t('settings.pushNotifications')}</p>
                                            <p className="text-xs text-slate-500">Important product updates</p>
                                        </div>
                                    </div>
                                    <Toggle value={settings.pushNotifications} onChange={(v) => setSettings((s) => ({ ...s, pushNotifications: v }))} />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Moon size={18} className="text-amber-400" />
                                        <div>
                                            <p className="text-sm font-semibold text-white">{t('settings.darkMode')}</p>
                                            <p className="text-xs text-slate-500">Theme preference</p>
                                        </div>
                                    </div>
                                    <Toggle value={settings.darkMode} onChange={(v) => setSettings((s) => ({ ...s, darkMode: v }))} />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">{t('settings.security')}</h2>
                            <div className="space-y-3">
                                <button
                                    onClick={() => router.push('/dashboard/faq')}
                                    className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Lock size={18} className="text-blue-400" />
                                        <div>
                                            <p className="text-sm font-semibold text-white">{t('settings.password')}</p>
                                            <p className="text-xs text-slate-500">Open FAQ for reset instructions</p>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard/faq')}
                                    className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Shield size={18} className="text-emerald-400" />
                                        <div>
                                            <p className="text-sm font-semibold text-white">{t('settings.twoFactor')}</p>
                                            <p className="text-xs text-slate-500">Open FAQ for setup instructions</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
