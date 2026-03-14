'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function RootPage() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const token = Cookies.get('token');
    const userStr = Cookies.get('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role === 'superadmin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
      <div className="text-4xl font-bold tracking-tight text-white mb-4 animate-pulse">
        Trade<span className="text-primary italic">Mentor</span> AI
      </div>
      <Loader2 className="animate-spin text-primary" size={32} />
      <p className="text-slate-500 text-sm">{t('login.sessionInit')}</p>
    </div>
  );
}
