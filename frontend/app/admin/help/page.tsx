'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export default function AdminHelpPage() {
    const router = useRouter();

    return (
        <div className="space-y-6">
            <button
                onClick={() => router.push('/admin')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.25)', color: '#A87BFF' }}
            >
                <ArrowLeft size={16} /> Back to admin
            </button>

            <div className="glass-card p-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(123,63,228,0.2)' }}>
                        <HelpCircle size={20} style={{ color: '#A87BFF' }} />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Admin Help / FAQ</h1>
                </div>

                <div className="space-y-3 text-sm" style={{ color: '#C8D4E8' }}>
                    <div className="rounded-xl p-4" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(123,63,228,0.14)' }}>
                        <p className="font-bold text-white mb-1">How to import books?</p>
                        <p>Open <strong>/admin/import</strong>, upload PDF or scan library. System will auto-create course/module/lessons and students will see them in Academy.</p>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(123,63,228,0.14)' }}>
                        <p className="font-bold text-white mb-1">How to inspect AI interactions?</p>
                        <p>Open <strong>/admin/ai</strong>, use search/filter and click "View full log" to inspect prompt, response and metadata.</p>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'rgba(11,18,32,0.55)', border: '1px solid rgba(123,63,228,0.14)' }}>
                        <p className="font-bold text-white mb-1">How to troubleshoot users?</p>
                        <p>Open <strong>/admin/students</strong> and copy login or jump to logs. Open <strong>/admin/logs</strong> to track login, lesson and AI events.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
