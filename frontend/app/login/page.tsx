'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import Cookies from 'js-cookie';
import { useLanguage } from '@/context/LanguageContext';

export default function LoginPage() {
    const { t } = useLanguage();
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { login, password });
            const { token, user } = response.data;

            Cookies.set('token', token, { expires: 7 });
            Cookies.set('user', JSON.stringify(user), { expires: 7 });

            if (user.role === 'superadmin') {
                router.push('/admin');
            } else {
                if (user.onboardingPassed) {
                    router.push('/dashboard');
                } else {
                    router.push('/dashboard/assessment');
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to login. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-mesh flex items-center justify-center p-4 relative">
            {/* Decorative background elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-[120px] animate-pulse-slow" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="glass-card p-8 space-y-8 relative overflow-hidden">
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight text-white">
                            Trade<span className="text-primary italic">Mentor</span> AI
                        </h1>
                        <p className="text-slate-400">{t('login.welcome')}</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">{t('login.login')}</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={login}
                                    onChange={(e) => setLogin(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    placeholder={t('login.enterLogin')}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">{t('login.password')}</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center py-3 bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-primary text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary/25 active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <LogIn size={20} className="mr-2" />
                                    {t('login.signIn')}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="pt-4 text-center">
                        <p className="text-xs text-slate-500">
                            © 2024 TradeMentor AI. Specialized Educational Platform.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
