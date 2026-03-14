'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Library,
    Upload,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    Sparkles,
    BookOpen,
    BarChart3,
    Loader2,
    ExternalLink
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Material {
    id: string;
    original_name: string;
    detected_category: string | null;
    status: 'pending' | 'processed' | 'failed';
    error_message: string | null;
    course_id: string | null;
    lesson_id: string | null;
    ai_metadata?: string | null;
    created_at: string;
}

interface ImportResult {
    success: boolean;
    course_title?: string;
    lesson_title?: string;
    lessons_created?: number;
    category?: string;
    error?: string;
}

const StatusBadge = ({ status }: { status: Material['status'] }) => {
    if (status === 'processed') return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full badge-green">
            <CheckCircle2 size={12} /> Processed
        </span>
    );
    if (status === 'failed') return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full badge-amber">
            <XCircle size={12} /> Failed
        </span>
    );
    return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full badge-blue">
            <Clock size={12} /> Pending
        </span>
    );
};

export default function ImportLibraryPage() {
    const router = useRouter();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
    const [isScanningLibrary, setIsScanningLibrary] = useState(false);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [scanResult, setScanResult] = useState<{ message: string; processed: number; failed: number; total: number } | null>(null);
    const [uploadResult, setUploadResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchMaterials = async () => {
        setIsLoadingMaterials(true);
        try {
            const res = await api.get('/admin/materials');
            setMaterials(res.data);
        } catch (e) {
            // Table may not exist yet
        } finally {
            setIsLoadingMaterials(false);
        }
    };

    useEffect(() => { fetchMaterials(); }, []);

    const handleScanLibrary = async () => {
        setIsScanningLibrary(true);
        setScanResult(null);
        try {
            const res = await api.post('/admin/import-library');
            setScanResult(res.data);
            showToast(`Library scan complete! ${res.data.processed} PDFs processed.`, 'success');
            await fetchMaterials();
        } catch (e: any) {
            showToast(e.response?.data?.error || 'Library scan failed', 'error');
        } finally {
            setIsScanningLibrary(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            showToast('Only PDF files are supported', 'error');
            return;
        }

        setIsUploadingFile(true);
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.post('/admin/import-pdf', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setUploadResult(res.data);
            if (res.data.success) {
                const lessonsCreated = Number(res.data.lessons_created) || 1;
                showToast(`✅ PDF ingested! Created ${lessonsCreated} lesson${lessonsCreated > 1 ? 's' : ''}.`, 'success');
            } else {
                showToast(res.data.error || 'Ingestion failed', 'error');
            }
            await fetchMaterials();
        } catch (e: any) {
            showToast(e.response?.data?.error || 'Upload failed', 'error');
        } finally {
            setIsUploadingFile(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const processedCount = materials.filter(m => m.status === 'processed').length;
    const failedCount = materials.filter(m => m.status === 'failed').length;

    const getMaterialMeta = (material: Material) => {
        try {
            return material.ai_metadata ? JSON.parse(material.ai_metadata) : null;
        } catch {
            return null;
        }
    };

    const getSourceLanguage = (material: Material) => {
        const meta = getMaterialMeta(material);
        return String(meta?.source_language || '').toUpperCase() || 'UNKNOWN';
    };

    const getLessonsCreated = (material: Material) => {
        const meta = getMaterialMeta(material);
        const count = Number(meta?.lessons_created || 0);
        return count > 0 ? count : 1;
    };

    return (
        <div className="space-y-8 relative">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -50, x: '-50%' }}
                        className="fixed top-6 left-1/2 z-[200] px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 text-white text-sm font-semibold"
                        style={{
                            background: toast.type === 'success' ? 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                            boxShadow: toast.type === 'success' ? '0 8px 32px rgba(123,63,228,0.4)' : '0 8px 32px rgba(239,68,68,0.4)'
                        }}
                    >
                        {toast.type === 'success' ? <Sparkles size={16} /> : <XCircle size={16} />}
                        <span>{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Library size={32} style={{ color: '#7B3FE4' }} />
                        AI Library Import
                    </h1>
                    <p className="mt-1" style={{ color: '#7B8CA6' }}>
                        Upload PDFs — AI will automatically create courses and lessons
                    </p>
                </div>
                <button
                    onClick={handleScanLibrary}
                    disabled={isScanningLibrary}
                    className="flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #7B3FE4, #5B2DB0)', boxShadow: '0 4px 20px rgba(123,63,228,0.35)' }}
                >
                    {isScanningLibrary ? <Loader2 size={20} className="animate-spin" /> : <Library size={20} />}
                    {isScanningLibrary ? 'Scanning library...' : 'Scan data/library'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Total Materials', value: materials.length, icon: FileText, color: '#2AA9FF' },
                    { label: 'Processed', value: processedCount, icon: CheckCircle2, color: '#10B981' },
                    { label: 'Failed', value: failedCount, icon: XCircle, color: '#F59E0B' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="glass-card p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, color }}>
                            <Icon size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7B8CA6' }}>{label}</p>
                            <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Scan result */}
            <AnimatePresence>
                {scanResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-5 border-l-4"
                        style={{ borderLeftColor: '#7B3FE4' }}
                    >
                        <div className="flex items-start gap-3">
                            <Sparkles size={20} style={{ color: '#7B3FE4' }} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-white">Library Scan Complete</p>
                                <p className="text-sm mt-1" style={{ color: '#7B8CA6' }}>{scanResult.message}</p>
                                <div className="flex gap-4 mt-3">
                                    <span className="text-xs font-bold" style={{ color: '#10B981' }}>✅ {scanResult.processed} processed</span>
                                    <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>⚠️ {scanResult.failed} failed</span>
                                    <span className="text-xs font-bold" style={{ color: '#7B8CA6' }}>Total: {scanResult.total}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload drop zone */}
            <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                className="glass-card p-10 text-center relative transition-all cursor-pointer"
                style={{
                    border: dragOver ? '2px dashed #7B3FE4' : '2px dashed rgba(123,63,228,0.3)',
                    background: dragOver ? 'rgba(123,63,228,0.08)' : undefined
                }}
                onClick={() => document.getElementById('pdf-upload-input')?.click()}
            >
                <input
                    id="pdf-upload-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                />
                {isUploadingFile ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: 'rgba(123,63,228,0.2)' }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: '#7B3FE4' }} />
                        </div>
                        <div>
                            <p className="text-white font-bold text-lg">Processing PDF...</p>
                            <p className="text-sm mt-1" style={{ color: '#7B8CA6' }}>Extracting text and classifying with AI</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{ background: dragOver ? 'rgba(123,63,228,0.3)' : 'rgba(123,63,228,0.15)', boxShadow: dragOver ? '0 0 30px rgba(123,63,228,0.3)' : 'none' }}>
                            <Upload size={32} style={{ color: '#7B3FE4' }} />
                        </div>
                        <div>
                            <p className="text-white font-bold text-lg">{dragOver ? 'Drop your PDF here!' : 'Upload a PDF'}</p>
                            <p className="text-sm mt-1" style={{ color: '#7B8CA6' }}>Drag & drop or click to browse. AI will auto-classify and create lessons.</p>
                        </div>
                        <span className="px-4 py-2 text-xs font-bold rounded-full badge-purple">PDF Only</span>
                    </div>
                )}
            </div>

            {/* Upload result */}
            <AnimatePresence>
                {uploadResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-5 border-l-4"
                        style={{ borderLeftColor: uploadResult.success ? '#10B981' : '#EF4444' }}
                    >
                        <div className="flex items-start gap-3">
                            {uploadResult.success ? <CheckCircle2 size={20} className="mt-0.5 shrink-0" style={{ color: '#10B981' }} /> : <XCircle size={20} className="mt-0.5 shrink-0" style={{ color: '#EF4444' }} />}
                            <div>
                                <p className="font-semibold text-white">{uploadResult.success ? 'PDF Ingested Successfully' : 'Ingestion Failed'}</p>
                                {uploadResult.success ? (
                                    <div className="flex gap-4 mt-2">
                                        <span className="text-xs font-bold badge-purple px-2.5 py-1 rounded-full">{uploadResult.category}</span>
                                        <span className="text-xs" style={{ color: '#7B8CA6' }}>Course: <strong className="text-white">{uploadResult.course_title}</strong></span>
                                        <span className="text-xs" style={{ color: '#7B8CA6' }}>First lesson: <strong className="text-white">{uploadResult.lesson_title}</strong></span>
                                        <span className="text-xs" style={{ color: '#7B8CA6' }}>Total lessons: <strong className="text-white">{uploadResult.lessons_created || 1}</strong></span>
                                    </div>
                                ) : (
                                    <p className="text-sm mt-1" style={{ color: '#F87171' }}>{uploadResult.error}</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Materials Table */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <BarChart3 size={20} style={{ color: '#2AA9FF' }} />
                        Import History
                    </h2>
                    <button onClick={fetchMaterials} className="p-2 rounded-xl text-slate-500 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <RefreshCw size={16} className={isLoadingMaterials ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(123,63,228,0.15)', background: 'rgba(11,18,32,0.5)' }}>
                                    {['File Name', 'Category', 'Status', 'AI Output', 'Imported At', 'Actions'].map(h => (
                                        <th key={h} className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#7B8CA6' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingMaterials ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center" style={{ color: '#7B8CA6' }}>
                                        <Loader2 size={24} className="animate-spin mx-auto mb-2" style={{ color: '#7B3FE4' }} />
                                        Loading...
                                    </td></tr>
                                ) : materials.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(123,63,228,0.1)' }}>
                                                <Library size={28} style={{ color: '#7B3FE4' }} />
                                            </div>
                                            <p className="font-semibold" style={{ color: '#7B8CA6' }}>No materials imported yet</p>
                                            <p className="text-sm" style={{ color: '#3D4D63' }}>Use "Scan data/library" or upload a PDF above</p>
                                        </div>
                                    </td></tr>
                                ) : materials.map((mat) => {
                                    const meta = getMaterialMeta(mat);
                                    const lessonTitles = Array.isArray(meta?.lesson_titles)
                                        ? meta.lesson_titles.map((item: any) => String(item || '').trim()).filter(Boolean).slice(0, 3)
                                        : [];

                                    return (
                                    <tr key={mat.id} className="table-row-hover transition-colors" style={{ borderBottom: '1px solid rgba(123,63,228,0.08)' }}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(42,169,255,0.15)' }}>
                                                    <FileText size={16} style={{ color: '#2AA9FF' }} />
                                                </div>
                                                <span className="text-sm text-white font-medium line-clamp-1">{mat.original_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {mat.detected_category ? (
                                                <span className="badge-purple px-2.5 py-1 rounded-full text-xs font-bold">{mat.detected_category}</span>
                                            ) : (
                                                <span style={{ color: '#3D4D63' }}>—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={mat.status} /></td>
                                        <td className="px-6 py-4">
                                            {mat.status === 'processed' ? (
                                                <div className="space-y-1.5 text-[11px]" style={{ color: '#9AB1D2' }}>
                                                    <p>Lessons: <strong className="text-white">{getLessonsCreated(mat)}</strong></p>
                                                    <p>Source: <strong className="text-white">{getSourceLanguage(mat)}</strong></p>
                                                    {meta?.module_title && <p>Module: <strong className="text-white">{String(meta.module_title)}</strong></p>}
                                                    {Array.isArray(meta?.step_blocks_per_lesson) && (
                                                        <p>Steps/lesson: <strong className="text-white">{meta.step_blocks_per_lesson.join(', ')}</strong></p>
                                                    )}
                                                    {Array.isArray(meta?.visual_blocks_per_lesson) && (
                                                        <p>Visual/lesson: <strong className="text-white">{meta.visual_blocks_per_lesson.join(', ')}</strong></p>
                                                    )}
                                                    {lessonTitles.length > 0 && (
                                                        <p className="line-clamp-2" style={{ color: '#C8D4E8' }}>
                                                            {lessonTitles.join(' · ')}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs" style={{ color: '#7B8CA6' }}>No AI output yet</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm" style={{ color: '#7B8CA6' }}>
                                            {new Date(mat.created_at).toLocaleDateString()} {new Date(mat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {mat.course_id && (
                                                    <button
                                                        onClick={() => router.push('/admin/courses')}
                                                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-300 hover:text-white inline-flex items-center gap-1"
                                                    >
                                                        <BookOpen size={11} /> Course
                                                    </button>
                                                )}
                                                {mat.lesson_id && (
                                                    <button
                                                        onClick={() => router.push(`/admin/lessons/${mat.lesson_id}`)}
                                                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-300 hover:text-white inline-flex items-center gap-1"
                                                    >
                                                        <ExternalLink size={11} /> Lesson
                                                    </button>
                                                )}
                                                {mat.status === 'failed' && mat.error_message && (
                                                    <span className="text-[11px]" style={{ color: '#F87171' }}>
                                                        {mat.error_message}
                                                    </span>
                                                )}
                                                {mat.status === 'processed' && (
                                                    <span className="text-[11px]" style={{ color: '#7B8CA6' }}>
                                                        Ready
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
