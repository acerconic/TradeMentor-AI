'use client';

import React from 'react';
import { BookOpen, Plus, Search, Filter, MoreVertical, LayoutGrid, List } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminCourses() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Course Management</h1>
                    <p className="text-slate-400 mt-1">Create and manage academy educational content</p>
                </div>
                <button className="flex items-center justify-center px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20">
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
                    <button className="p-2 bg-slate-800 text-white rounded-lg"><LayoutGrid size={18} /></button>
                    <button className="p-2 text-slate-500 hover:text-white transition-colors"><List size={18} /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="glass-card hover:border-primary/50 transition-all p-8 text-center space-y-4 border-dashed border-2 border-slate-800">
                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-700">
                        <BookOpen size={32} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold">No courses found</h3>
                        <p className="text-slate-500 text-sm mt-1">Start by adding your first curriculum</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
