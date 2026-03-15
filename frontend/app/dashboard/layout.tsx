'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const token = Cookies.get('token');
        const userStr = Cookies.get('user');

        if (!token || !userStr) {
            router.replace('/login');
            return;
        }

        let user: any = null;
        try {
            user = JSON.parse(userStr);
        } catch {
            router.replace('/login');
            return;
        }

        if (user.role === 'superadmin') {
            router.replace('/admin');
            return;
        }

        api.get('/auth/assessment/status')
            .then((res) => {
                const onboardingPassed = Boolean(res.data?.onboardingPassed);

                const nextUser = {
                    ...user,
                    onboardingPassed,
                    tradingLevel: res.data?.tradingLevel || user.tradingLevel || 'Beginner',
                    language: res.data?.language || user.language || 'RU',
                };
                Cookies.set('user', JSON.stringify(nextUser), { expires: 7 });

                // Assessment stays optional; no forced redirect on first login.
                if (pathname === '/dashboard/assessment' && onboardingPassed) {
                    router.replace('/dashboard');
                    return;
                }

                setReady(true);
            })
            .catch(() => {
                router.replace('/login');
            });
    }, [pathname, router]);

    if (!ready) {
        return (
            <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0B1220' }}>
                <Loader2 className="animate-spin" size={48} style={{ color: '#7B3FE4' }} />
            </div>
        );
    }

    return <>{children}</>;
}
