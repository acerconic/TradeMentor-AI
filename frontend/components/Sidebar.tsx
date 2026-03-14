'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    History,
    LogOut as LogOutIcon,
    ChevronRight,
    MessageSquare,
    Library,
    HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Cookies from 'js-cookie';
import { useLanguage } from '@/context/LanguageContext';



export default function Sidebar() {
    const { t, language, setLanguage } = useLanguage();
    const pathname = usePathname();
    const router = useRouter();

    const menuItems = [
        { icon: LayoutDashboard, label: t('admin.dashboard'), href: '/admin' },
        { icon: Users, label: t('admin.students'), href: '/admin/students' },
        { icon: BookOpen, label: t('admin.courses'), href: '/admin/courses' },
        { icon: Library, label: t('admin.importLibrary'), href: '/admin/import' },
        { icon: MessageSquare, label: t('admin.aiResponses'), href: '/admin/ai' },
        { icon: History, label: t('admin.auditLogs'), href: '/admin/logs' },
        { icon: HelpCircle, label: t('admin.help'), href: '/admin/help' },
    ];

    const handleLogout = () => {
        Cookies.remove('token');
        Cookies.remove('user');
        router.push('/login');
    };

    return (
        <aside className="w-64 flex flex-col h-screen sticky top-0" style={{ background: '#080F1E', borderRight: '1px solid rgba(123,63,228,0.15)' }}>
            {/* Logo */}
            <div className="p-6 pb-4">
                <div className="mb-8">
                    <Image
                        src="/logo.png"
                        alt="TradeMentor AI"
                        width={180}
                        height={60}
                        className="object-contain"
                        priority
                    />
                </div>
            </div>

            {/* Language Switcher */}
            <div className="px-6 mb-6">
                <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5">
                    <button
                        onClick={() => setLanguage('RU')}
                        className={cn(
                            "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                            language === 'RU' ? "bg-purple-600 text-white" : "text-slate-500 hover:text-slate-300"
                        )}
                    >RU</button>
                    <button
                        onClick={() => setLanguage('UZ')}
                        className={cn(
                            "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                            language === 'UZ' ? "bg-purple-600 text-white" : "text-slate-500 hover:text-slate-300"
                        )}
                    >UZ</button>
                </div>
            </div>

            <div className="p-6 pb-4 pt-0">
                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all group text-sm",
                                    isActive
                                        ? "text-white font-semibold"
                                        : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                                )}
                                style={isActive ? {
                                    background: 'linear-gradient(135deg, rgba(123,63,228,0.2) 0%, rgba(42,169,255,0.1) 100%)',
                                    border: '1px solid rgba(123,63,228,0.3)',
                                    boxShadow: '0 0 20px rgba(123,63,228,0.1)'
                                } : {}}
                            >
                                <div className="flex items-center space-x-3">
                                    <item.icon size={18} className={isActive ? '' : ''} style={{ color: isActive ? '#A87BFF' : undefined }} />
                                    <span>{item.label}</span>
                                </div>
                                {isActive && <ChevronRight size={14} style={{ color: '#7B3FE4' }} />}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom */}
            <div className="mt-auto p-5" style={{ borderTop: '1px solid rgba(123,63,228,0.1)' }}>
                <div className="flex items-center space-x-3 mb-4 px-1">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' }}>
                        A
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">Superadmin</p>
                        <p className="text-[10px]" style={{ color: '#7B3FE4' }}>Full Access</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-sm font-medium"
                >
                    <LogOutIcon size={18} />
                    <span>{t('common.logout')}</span>
                </button>
            </div>
        </aside>
    );
}
