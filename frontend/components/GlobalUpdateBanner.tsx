'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCcw, X } from 'lucide-react';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';

type NoticeResponse = {
    token: string;
    updatedAt: string | null;
    message: string;
};

export default function GlobalUpdateBanner() {
    const [notice, setNotice] = useState<NoticeResponse | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const token = Cookies.get('token');
        if (!token) return;

        api.get('/auth/update-notice')
            .then((res) => {
                const payload = res.data as NoticeResponse;
                const dismissedToken = localStorage.getItem('dismissed_update_notice_token');
                setNotice(payload);
                setVisible(Boolean(payload.token) && dismissedToken !== payload.token);
            })
            .catch(() => {
                // do nothing if notice endpoint unavailable
            });
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.body.style.paddingTop = visible ? '52px' : '';
        return () => {
            document.body.style.paddingTop = '';
        };
    }, [visible]);

    const handleClose = () => {
        if (notice?.token) {
            localStorage.setItem('dismissed_update_notice_token', notice.token);
        }
        setVisible(false);
    };

    if (!visible || !notice) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[300] px-4 py-3"
            style={{
                background: 'linear-gradient(135deg, rgba(123,63,228,0.96), rgba(42,169,255,0.96))',
                boxShadow: '0 10px 30px rgba(123,63,228,0.35)',
                borderBottom: '1px solid rgba(255,255,255,0.22)'
            }}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-white">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                        <RefreshCcw size={16} />
                    </div>
                    <p className="text-sm font-semibold leading-tight">
                        Пожалуйста, обновите сайт с помощью F5. Если не поможет — нажмите Shift + Ctrl + F5.
                    </p>
                </div>
                <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
                    aria-label="Close update banner"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
