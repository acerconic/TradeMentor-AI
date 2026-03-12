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
            <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0B1220' }}>
                <Loader2 className="animate-spin" size={48} style={{ color: '#7B3FE4' }} />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen" style={{ background: '#0B1220' }}>
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto" style={{ minHeight: '100vh' }}>
                {children}
            </main>
        </div>
    );
}
