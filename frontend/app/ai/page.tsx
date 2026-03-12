'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    Bot,
    User,
    Sparkles,
    ArrowLeft,
    Image as ImageIcon,
    Paperclip,
    TrendingUp,
    AlertCircle,
    BrainCircuit,
    Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    image?: string;
    timestamp: Date;
}

export default function AIChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hello! I am your TradeMentor AI. I specialize in SMC/ICT, market structure, and trading psychology. How can I help you refine your edge today?",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleFeatureSoon = (e: React.MouseEvent, feature: string) => {
        e.preventDefault();
        showToast(`${feature} feature is coming soon!`);
    };

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClearChat = () => {
        setMessages([
            {
                role: 'assistant',
                content: "Hello! I am your TradeMentor AI. I specialize in SMC/ICT, market structure, and trading psychology. How can I help you refine your edge today?",
                timestamp: new Date()
            }
        ]);
        setInput('');
        removeImage();
        showToast("Chat history cleared");
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
                showToast("Only JPEG and PNG images are allowed");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast("Image must be less than 5MB");
                return;
            }
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
                showToast("Image attached! Ready to send.");
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Prefill from lesson viewer (real action, no dead buttons)
        const stored = typeof window !== 'undefined' ? localStorage.getItem('ai_prefill') : null;
        if (stored && stored.trim()) {
            setInput(stored);
            localStorage.removeItem('ai_prefill');
            return;
        }
        const q = searchParams.get('q');
        if (q && q.trim()) setInput(q);
    }, [searchParams]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input,
            image: imagePreview || undefined,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const payload: any = { message: input };
            if (imagePreview) {
                payload.image = imagePreview;
            }
            const res = await api.post('/ai/chat', payload);
            const aiResponse: Message = {
                role: 'assistant',
                content: res.data.response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
            removeImage();
        } catch (err) {
            console.error(err);
            const errorMsg: Message = {
                role: 'assistant',
                content: "I'm having trouble connecting to my analytical core. Please try again in a moment.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-slate-950 overflow-hidden relative">
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-slate-900 border border-slate-700 text-white rounded-full shadow-2xl flex items-center space-x-3"
                    >
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm font-bold tracking-wide">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar - Quick Knowledge */}
            <aside className="hidden lg:flex w-80 border-r border-slate-800 flex-col bg-slate-900/50 backdrop-blur-xl">
                <div className="p-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-slate-400 hover:text-white transition-colors mb-8 group"
                    >
                        <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </button>

                    <div className="space-y-6">
                        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 space-y-3">
                            <div className="flex items-center text-primary font-bold text-sm">
                                <Sparkles size={16} className="mr-2" />
                                Trading Mentor Mode
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                AI is currently operating in "Strict Mentor" mode. It will only answer trading-related questions.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Suggested Topics</h3>
                            {[
                                "Explain Order Blocks",
                                "Liquidity Grabs",
                                "Risk Management Rules",
                                "Analyzing a BOS"
                            ].map((topic, i) => (
                                <button
                                    key={topic}
                                    onClick={() => setInput(topic)}
                                    className="w-full text-left p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all text-sm text-slate-300"
                                >
                                    {topic}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-auto p-6 border-t border-slate-800">
                    <div className="flex items-center space-x-3 text-slate-500 text-xs">
                        <BrainCircuit size={16} />
                        <span>Model: TradeMentor v1.0 [Premium]</span>
                    </div>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col relative">
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                />

                {/* Chat Header */}
                <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 backdrop-blur-md z-10">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <Bot size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">AI Trading Mentor</h2>
                            <div className="flex items-center text-[10px] text-emerald-500 font-bold uppercase tracking-widest space-x-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span>Always Online</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button onClick={triggerFileInput} className="p-2 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
                            <ImageIcon size={20} />
                        </button>
                        <button onClick={handleClearChat} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold">
                            Clear Chat
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar bg-mesh">
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex w-full max-w-4xl mx-auto items-start space-x-4",
                                msg.role === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-md",
                                msg.role === 'assistant'
                                    ? "bg-primary text-white"
                                    : "bg-slate-800 text-slate-400 border border-slate-700"
                            )}>
                                {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                            </div>

                            <div className={cn(
                                "max-w-[80%] rounded-2xl p-5 shadow-sm",
                                msg.role === 'assistant'
                                    ? "bg-slate-900/80 border border-slate-800 text-slate-200"
                                    : "bg-primary text-white"
                            )}>
                                {msg.image && (
                                    <div className="mb-4">
                                        <img src={msg.image} alt="User upload" className="max-w-[240px] rounded-xl shadow-md border border-white/20" />
                                    </div>
                                )}
                                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                <div className={cn(
                                    "mt-3 text-[10px] opacity-40 uppercase font-bold tracking-widest",
                                    msg.role === 'user' ? "text-right" : "text-left"
                                )}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex w-full max-w-4xl mx-auto items-start space-x-4"
                        >
                            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-md">
                                <Bot size={20} />
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center space-x-2">
                                <Loader2 className="animate-spin text-primary" size={18} />
                                <span className="text-slate-500 text-sm">Thinking...</span>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-8 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
                    <form
                        onSubmit={handleSend}
                        className="max-w-4xl mx-auto relative group"
                    >
                        <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                        <div className="relative glass border border-slate-700/50 rounded-3xl overflow-hidden focus-within:border-primary/50 transition-all shadow-2xl">
                            <div className="px-6 py-2 flex items-center bg-slate-900/40 border-b border-slate-800/50">
                                <div className="flex space-x-4 text-slate-500">
                                    <button type="button" onClick={triggerFileInput} className="hover:text-primary transition-colors"><ImageIcon size={18} /></button>
                                    <button type="button" onClick={(e) => handleFeatureSoon(e, 'Attachments')} className="hover:text-primary transition-colors"><Paperclip size={18} /></button>
                                    <button type="button" onClick={(e) => handleFeatureSoon(e, 'Chart Analysis')} className="hover:text-primary transition-colors"><TrendingUp size={18} /></button>
                                </div>
                            </div>
                            {imagePreview && (
                                <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/50 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <img src={imagePreview} alt="Preview" className="w-10 h-10 rounded object-cover border border-slate-700" />
                                        <span className="text-xs text-slate-400 truncate max-w-[200px]">{selectedImage?.name || 'Image attached'}</span>
                                    </div>
                                    <button type="button" onClick={removeImage} className="text-slate-500 hover:text-red-400 text-xs font-bold">Remove</button>
                                </div>
                            )}
                            <div className="flex items-center p-2">
                                <textarea
                                    rows={1}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend(e);
                                        }
                                    }}
                                    placeholder="Ask about market structure, liquidity, or trading psychology..."
                                    className="flex-1 bg-transparent border-none text-white focus:ring-0 placeholder-slate-600 px-4 py-4 resize-none max-h-40"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="w-12 h-12 bg-primary hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-primary text-white rounded-2xl flex items-center justify-center transition-all flex-shrink-0 mr-2 shadow-lg shadow-primary/20"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </form>
                    <p className="text-center text-[10px] text-slate-600 mt-4 uppercase tracking-[0.2em] font-medium">
                        Educational AI Mentor • Performance Analytical Engine
                    </p>
                </div>
            </main>
        </div>
    );
}
