'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Filter, MoreVertical, LayoutGrid, List, X, Loader2, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function AdminCourses() {
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [language, setLanguage] = useState('EN');
    const [level, setLevel] = useState('Beginner');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const fetchCourses = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/admin/courses');
            setCourses(res.data);
        } catch (e) {
            console.error(e);
            showToast('Failed to fetch courses');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleFeatureSoon = (e: React.MouseEvent, feature: string) => {
        e.preventDefault();
        showToast(`${feature} feature is coming soon!`);
    };

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return showToast('Title is required');

        setIsCreating(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('language', language);
            formData.append('level', level);
            if (selectedFile) formData.append('file', selectedFile);

            await api.post('/admin/courses', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            showToast('Course created successfully!');
            setIsModalOpen(false);

            // Reset form
            setTitle('');
            setDescription('');
            setLanguage('EN');
            setLevel('Beginner');
            setSelectedFile(null);

            fetchCourses();
        } catch (e) {
            console.error(e);
            showToast('Failed to create course');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-8 relative">
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-slate-900 border border-slate-700 text-white rounded-full shadow-2xl flex items-center space-x-3"
                    >
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-bold tracking-wide">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Course Management</h1>
                    <p className="text-slate-400 mt-1">Create and manage academy educational content</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                    <Plus size={20} className="mr-2" />
                    Create New Course
                </button>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Filter courses..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-primary/50"
                    />
                </div>
                <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-1">
                    <button onClick={(e) => handleFeatureSoon(e, 'Grid View')} className="p-2 bg-slate-800 text-white rounded-lg"><LayoutGrid size={18} /></button>
                    <button onClick={(e) => handleFeatureSoon(e, 'List View')} className="p-2 text-slate-500 hover:text-white transition-colors"><List size={18} /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="glass-card h-64 animate-pulse bg-slate-800/50" />
                    ))
                ) : courses.length === 0 ? (
                    <div className="glass-card col-span-full hover:border-primary/50 transition-all p-12 text-center space-y-4 border-dashed border-2 border-slate-800">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-700">
                            <BookOpen size={32} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">No courses found</h3>
                            <p className="text-slate-500 text-sm mt-1">Start by adding your first curriculum</p>
                        </div>
                    </div>
                ) : (
                    courses.map(course => (
                        <div key={course.id} className="glass-card hover:border-emerald-500/50 transition-all group overflow-hidden cursor-pointer flex flex-col justify-between" onClick={(e) => handleFeatureSoon(e, 'Course Manager')}>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <span className={cn(
                                        "px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider",
                                        course.level === 'Beginner' ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20" :
                                            course.level === 'Intermediate' ? "bg-amber-500/20 text-amber-500 border border-amber-500/20" :
                                                "bg-red-500/20 text-red-500 border border-red-500/20"
                                    )}>{course.level}</span>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">{course.language}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors leading-tight line-clamp-2">{course.title}</h3>
                                    <p className="text-slate-400 text-xs mt-2 line-clamp-2">{course.description || "No description provided."}</p>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                                <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                                <span className="font-medium">{course.lessons_count} Modules/Lessons</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Course Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-xl glass-card p-8 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar"
                        >
                            <div className="flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur pb-4 z-10 border-b border-slate-800 -mx-8 px-8 -mt-8 pt-8">
                                <h2 className="text-2xl font-bold text-white flex items-center">
                                    <BookOpen size={24} className="mr-3 text-emerald-500" />
                                    Draft New Course
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateCourse} className="space-y-5 pt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Course Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                        placeholder="e.g. Master Market Structure"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Description (Optional)</label>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none"
                                        placeholder="Brief overview of the curriculum..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Language</label>
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                                        >
                                            <option value="EN">English (EN)</option>
                                            <option value="RU">Russian (RU)</option>
                                            <option value="UZ">Uzbek (UZ)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Difficulty Level</label>
                                        <select
                                            value={level}
                                            onChange={(e) => setLevel(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                                        >
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <label className="text-sm font-medium text-slate-400">Knowledge Material (PDF/Doc)</label>
                                    <div className="relative border-2 border-dashed border-slate-700 bg-slate-900/50 rounded-xl p-6 text-center hover:bg-slate-800 transition-colors group cursor-pointer">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            accept=".pdf,.doc,.docx"
                                        />
                                        <UploadCloud size={32} className="mx-auto text-slate-500 group-hover:text-emerald-500 transition-colors mb-3" />
                                        <p className="text-sm font-medium text-slate-300">
                                            {selectedFile ? selectedFile.name : "Drag & drop file or click to browse"}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">Optional. The AI will learn from this.</p>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all mt-6"
                                >
                                    {isCreating ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Publish Course'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
