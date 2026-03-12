'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Settings, Bell, Lock, Globe,
    ArrowLeft, ChevronRight, Moon,
    Smartphone, Mail
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function SettingsPage() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const userStr = Cookies.get('user');
        if (userStr) setUser(JSON.parse(userStr));
        else router.push('/login');
    }, [router]);

    if (!user) return null;

    const sections = [
        {
            title: 'Account',
            items: [
                { icon: Mail, label: 'Email Notifications', desc: 'Manage your email alerts', toggle: true },
                { icon: Smartphone, label: 'Push Notifications', desc: 'Stay updated on mobile', toggle: true },
            ]
        },
        {
            title: 'Security',
            items: [
                { icon: Lock, label: 'Password', desc: 'Change your account password' },
                { icon: Smartphone, label: 'Two-Factor Auth', desc: 'Secure your login' },
            ]
        },
        {
            title: 'Preferences',
            items: [
                { icon: Globe, label: 'Language', desc: 'Choose your preferred language (RU/UZ/EN)' },
                { icon: Moon, label: 'Dark Mode', desc: 'Appearance settings', toggle: true },
            ]
        }
    ];

    return (
        <div className="min-h-screen text-white pb-20" style={{ background: '#0B1220' }}>
            <div className="max-w-3xl mx-auto px-6 pt-12">
                <div className="flex items-center gap-6 mb-12">
                    <button
                        onClick={() => router.back()}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-slate-400"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>Settings</h1>
                        <p className="text-slate-500 text-sm">Manage your profile and preferences.</p>
                    </div>
                </div>

                <div className="space-y-12">
                    {sections.map((section, idx) => (
                        <motion.div
                            key={section.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-600 mb-6 pl-4">{section.title}</h2>
                            <div className="glass-card overflow-hidden">
                                {section.items.map((item, i) => (
                                    <div
                                        key={item.label}
                                        className={`flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors cursor-pointer ${i !== section.items.length - 1 ? 'border-b border-white/5' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center text-slate-400">
                                                <item.icon size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{item.label}</p>
                                                <p className="text-xs text-slate-500">{item.desc}</p>
                                            </div>
                                        </div>

                                        {item.toggle ? (
                                            <div className="w-10 h-6 rounded-full relative transition-colors bg-purple-600">
                                                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all left-5" />
                                            </div>
                                        ) : (
                                            <ChevronRight size={18} className="text-slate-700" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
