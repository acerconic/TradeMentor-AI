'use client';

import React, { useState, useEffect } from 'react';
import {
    BookOpen, Plus, Search, X, Loader2, Library,
    ChevronDown, ChevronRight, FileText, Layers, Trash2,
    Sparkles, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Lesson { id: string; title: string; summary: string; pdf_path: string; sort_order: number; }
interface Module { id: string; title: string; sort_order: number; lessons?: Lesson[]; }
interface Course {
    id: string; title: string; description: string; category: string;
    level: string; language: string; created_at: string;
    modules_count: number; lessons_count: number;
}

const LEVEL_COLORS: Record<string, string> = {
    Beginner: 'badge-green', Intermediate: 'badge-amber', Advanced: 'badge-blue'
};
const CAT_COLORS: Record<string, string> = {
    SMC: 'badge-purple', ICT: 'badge-blue', 'Price Action': 'badge-green',
    'Risk Management': 'badge-amber', Psychology: 'badge-blue', Other: 'badge-purple'
};

export default function AdminCourses() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
    const [courseModules, setCourseModules] = useState<Record<string, Module[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadingModules, setLoadingModules] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [search, setSearch] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [language, setLanguage] = useState('RU');
    const [level, setLevel] = useState('Beginner');
    const [category, setCategory] = useState('SMC');
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const router = useRouter();

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchCourses = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/admin/courses');
            setCourses(res.data || []);
        } catch (e: any) {
            showToast(e.response?.data?.details || 'Failed to load courses', false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchCourses(); }, []);

    const toggleExpand = async (courseId: string) => {
        if (expandedCourse === courseId) {
            setExpandedCourse(null);
            return;
        }
        setExpandedCourse(courseId);
        if (courseModules[courseId]) return;

        setLoadingModules(courseId);
        try {
            const res = await api.get(`/courses/${courseId}/lessons`);
            setCourseModules(prev => ({ ...prev, [courseId]: res.data || [] }));
        } catch (e) {
            setCourseModules(prev => ({ ...prev, [courseId]: [] }));
        } finally {
            setLoadingModules(null);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setIsCreating(true);
        try {
            await api.post('/admin/courses', { title, description, language, level, category });
            showToast('Course created successfully!');
            setIsModalOpen(false);
            setTitle(''); setDescription('');
            await fetchCourses();
        } catch (e: any) {
            showToast(e.response?.data?.details || 'Failed to create course', false);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string, courseTitle: string) => {
        if (!confirm(`Delete course "${courseTitle}"? This will remove all its modules and lessons.`)) return;
        try {
            await api.delete(`/admin/courses/${id}`);
            showToast('Course deleted');
            await fetchCourses();
        } catch {
            showToast('Failed to delete', false);
        }
    };

    const filtered = courses.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.category || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 relative">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -50, x: '-50%' }}
                        className="fixed top-5 left-1/2 z-[200] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold text-white"
                        style={{
                            background: toast.ok ? 'linear-gradient(135deg, #7B3FE4, #2AA9FF)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                            boxShadow: toast.ok ? '0 8px 32px rgba(123,63,228,0.4)' : '0 8px 32px rgba(239,68,68,0.4)'
                        }}
                    >
                        {toast.ok ? <Check size={16} /> : <X size={16} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <BookOpen size={30} style={{ color: '#7B3FE4' }} />
                        Courses
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: '#7B8CA6' }}>
                        {courses.length} course{courses.length !== 1 ? 's' : ''} total
                        {' · '}{courses.reduce((s, c) => s + (c.lessons_count || 0), 0)} total lessons
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/admin/import')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                        style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.3)', color: '#A87BFF' }}
                    >
                        <Library size={18} /> Import PDF
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg, #7B3FE4, #5B2DB0)', boxShadow: '0 4px 20px rgba(123,63,228,0.35)' }}
                    >
                        <Plus size={18} /> New Course
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#7B8CA6' }} />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search courses or categories..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-sm input-base"
                    style={{ background: '#111A2F' }}
                />
            </div>

            {/* Courses list */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 size={36} className="animate-spin" style={{ color: '#7B3FE4' }} />
                    <p style={{ color: '#7B8CA6' }}>Loading courses...</p>
                </div>
            ) : filtered.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card p-16 text-center"
                    style={{ border: '2px dashed rgba(123,63,228,0.2)' }}
                >
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                        style={{ background: 'rgba(123,63,228,0.1)' }}>
                        <BookOpen size={32} style={{ color: '#7B3FE4' }} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No courses yet</h3>
                    <p className="text-sm mb-6" style={{ color: '#7B8CA6' }}>
                        Create a course manually or import PDFs from the library
                    </p>
                    <div className="flex justify-center gap-3">
                        <button onClick={() => setIsModalOpen(true)}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #7B3FE4, #5B2DB0)' }}>
                            <Plus size={16} className="inline mr-2" /> Create Course
                        </button>
                        <button onClick={() => router.push('/admin/import')}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold"
                            style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.3)', color: '#A87BFF' }}>
                            <Library size={16} className="inline mr-2" /> Import PDFs
                        </button>
                    </div>
                </motion.div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((course, i) => (
                        <motion.div
                            key={course.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="glass-card overflow-hidden"
                        >
                            {/* Course row */}
                            <div
                                className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                onClick={() => toggleExpand(course.id)}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: 'linear-gradient(135deg, rgba(123,63,228,0.25), rgba(42,169,255,0.15))' }}>
                                        <BookOpen size={20} style={{ color: '#A87BFF' }} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-white text-base">{course.title}</h3>
                                            {course.category && (
                                                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', CAT_COLORS[course.category] || 'badge-purple')}>
                                                    {course.category}
                                                </span>
                                            )}
                                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', LEVEL_COLORS[course.level] || 'badge-green')}>
                                                {course.level || 'Beginner'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-xs" style={{ color: '#7B8CA6' }}>
                                                <Layers size={11} className="inline mr-1" />{course.modules_count || 0} modules
                                            </span>
                                            <span className="text-xs" style={{ color: '#7B8CA6' }}>
                                                <FileText size={11} className="inline mr-1" />{course.lessons_count || 0} lessons
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDelete(course.id, course.title); }}
                                        className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    {loadingModules === course.id
                                        ? <Loader2 size={18} className="animate-spin" style={{ color: '#7B3FE4' }} />
                                        : expandedCourse === course.id
                                            ? <ChevronDown size={18} style={{ color: '#7B3FE4' }} />
                                            : <ChevronRight size={18} style={{ color: '#7B8CA6' }} />
                                    }
                                </div>
                            </div>

                            {/* Expanded modules / lessons */}
                            <AnimatePresence>
                                {expandedCourse === course.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid rgba(123,63,228,0.1)' }}>
                                            {!courseModules[course.id] ? (
                                                <p className="text-sm py-4 text-center" style={{ color: '#7B8CA6' }}>Loading...</p>
                                            ) : courseModules[course.id].length === 0 ? (
                                                <div className="py-6 text-center">
                                                    <p className="text-sm" style={{ color: '#7B8CA6' }}>No modules yet</p>
                                                    <p className="text-xs mt-1" style={{ color: '#3D4D63' }}>
                                                        Import a PDF to auto-create lessons
                                                    </p>
                                                </div>
                                            ) : courseModules[course.id].map(mod => (
                                                <div key={mod.id} className="rounded-xl p-4" style={{ background: 'rgba(11,18,32,0.6)', border: '1px solid rgba(123,63,228,0.1)' }}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Layers size={14} style={{ color: '#2AA9FF' }} />
                                                        <span className="text-sm font-bold text-white">{mod.title}</span>
                                                        <span className="text-xs badge-blue px-2 py-0.5 rounded-full">
                                                            {(mod.lessons || []).length} lessons
                                                        </span>
                                                    </div>
                                                    {(mod.lessons || []).length === 0 ? (
                                                        <p className="text-xs pl-5" style={{ color: '#3D4D63' }}>No lessons in this module</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {(mod.lessons || []).map((lesson, li) => (
                                                                <button
                                                                    key={lesson.id}
                                                                    onClick={() => router.push(`/admin/lessons/${lesson.id}`)}
                                                                    className="w-full flex items-start gap-3 pl-5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
                                                                >
                                                                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0"
                                                                        style={{ background: 'rgba(123,63,228,0.2)', color: '#A87BFF' }}>
                                                                        {li + 1}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-white">{lesson.title}</p>
                                                                        {lesson.summary && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#7B8CA6' }}>{lesson.summary}</p>}
                                                                        {lesson.pdf_path && (
                                                                            <div className="flex items-center gap-1 mt-1">
                                                                                <FileText size={10} style={{ color: '#7B3FE4' }} />
                                                                                <span className="text-[10px]" style={{ color: '#7B3FE4' }}>PDF attached</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Course Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(7,14,26,0.85)', backdropFilter: 'blur(8px)' }}
                        onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md rounded-2xl p-6"
                            style={{ background: '#111A2F', border: '1px solid rgba(123,63,228,0.25)' }}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Sparkles size={20} style={{ color: '#7B3FE4' }} /> New Course
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold mb-2 block" style={{ color: '#7B8CA6' }}>Course Title *</label>
                                    <input
                                        value={title} onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. SMC Trading Mastery"
                                        className="w-full px-4 py-3 rounded-xl text-white text-sm input-base"
                                        style={{ background: '#0B1220' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold mb-2 block" style={{ color: '#7B8CA6' }}>Description</label>
                                    <textarea
                                        value={description} onChange={e => setDescription(e.target.value)}
                                        placeholder="Course description..."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl text-white text-sm input-base resize-none"
                                        style={{ background: '#0B1220' }}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Category', value: category, setter: setCategory, options: ['SMC', 'ICT', 'Price Action', 'Risk Management', 'Psychology', 'Technical', 'Other'] },
                                        { label: 'Level', value: level, setter: setLevel, options: ['Beginner', 'Intermediate', 'Advanced'] },
                                        { label: 'Language', value: language, setter: setLanguage, options: ['RU', 'UZ', 'EN'] },
                                    ].map(({ label, value, setter, options }) => (
                                        <div key={label}>
                                            <label className="text-xs font-semibold mb-2 block" style={{ color: '#7B8CA6' }}>{label}</label>
                                            <select
                                                value={value} onChange={e => setter(e.target.value)}
                                                className="w-full px-3 py-3 rounded-xl text-white text-sm input-base"
                                                style={{ background: '#0B1220' }}
                                            >
                                                {options.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="submit" disabled={isCreating || !title.trim()}
                                    className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 mt-2"
                                    style={{ background: 'linear-gradient(135deg, #7B3FE4, #5B2DB0)', boxShadow: '0 4px 20px rgba(123,63,228,0.35)' }}
                                >
                                    {isCreating ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Create Course'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
