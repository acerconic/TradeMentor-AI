'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    History,
    Settings,
    LogOut,
    ChevronRight,
    ShieldCheck,
    MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Cookies from 'js-cookie';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Users, label: 'Students', href: '/admin/students' },
    { icon: BookOpen, label: 'Courses', href: '/admin/courses' },
    { icon: MessageSquare, label: 'AI Responses', href: '/admin/ai' },
    { icon: History, label: 'Audit Logs', href: '/admin/logs' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        Cookies.remove('token');
        Cookies.remove('user');
        router.push('/login');
    };

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
            <div className="p-6">
                <div className="flex items-center space-x-2 text-primary font-bold text-xl mb-8">
                    <ShieldCheck size={28} />
                    <span>Admin Panel</span>
                </div>

                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                                    isActive
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <div className="flex items-center space-x-3">
                                    <item.icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </div>
                                {isActive && <ChevronRight size={16} />}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-6 border-t border-slate-800 space-y-4">
                <div className="flex items-center space-x-3 px-2">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-primary font-bold">
                        A
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">Superadmin</p>
                        <p className="text-xs text-slate-500 italic">Access: All</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
}
