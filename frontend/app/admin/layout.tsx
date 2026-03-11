'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Cookies from 'js-cookie';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = Cookies.get('token');
        const userStr = Cookies.get('user');

        if (!token || !userStr) {
            router.push('/login');
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (user.role !== 'superadmin') {
                router.push('/dashboard');
                return;
            }
            setIsAuthorized(true);
        } catch (e) {
            router.push('/login');
        }
    }, [router]);

    if (!isAuthorized) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <div className="flex bg-slate-950 min-h-screen">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
