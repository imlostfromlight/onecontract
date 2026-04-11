import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { MessageCircle, X, Send, Trash2, Bot } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    ts?: string;
}

interface Props {
    documentText?: string; // optional document context
}

export function AIChatWidget({ documentText }: Props) {
    const { token } = useAuth();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Load history when session exists
    useEffect(() => {
        if (open && sessionId && token) {
            fetch(`${API_BASE}/api/chat/history/?session_id=${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(r => r.json())
                .then(data => {
                    if (data.messages?.length) {
                        setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
                    }
                })
                .catch(() => {});
        }
    }, [open, sessionId, token]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = async () => {
        if (!input.trim() || loading || !token) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/chat/message/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    session_id: sessionId,
                    document_text: documentText || '',
                }),
            });
            const data = await res.json();
            if (data.session_id) setSessionId(data.session_id);
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'Ошибка' }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка сети. Попробуйте ещё раз.' }]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = async () => {
        if (!token) return;
        if (sessionId) {
            await fetch(`${API_BASE}/api/chat/clear/?session_id=${sessionId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
        }
        setMessages([]);
        setSessionId(null);
    };

    if (!token) return null;

    return (
        <>
            {/* Floating button */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/40 flex items-center justify-center transition-all hover:scale-105"
                    title="AI Ассистент"
                >
                    <Bot className="w-6 h-6" />
                </button>
            )}

            {/* Chat panel */}
            {open && (
                <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-5rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5" />
                            <div>
                                <p className="font-semibold text-sm">OneContract AI</p>
                                <p className="text-xs text-blue-200">Юридический ассистент</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {messages.length > 0 && (
                                <button onClick={clearChat} className="text-blue-200 hover:text-white p-1 rounded" title="Очистить чат">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="text-blue-200 hover:text-white p-1 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3">
                                <Bot className="w-10 h-10 text-blue-300" />
                                <div>
                                    <p className="font-medium text-gray-600">Привет! Я OneContract AI</p>
                                    <p className="text-sm mt-1">Задайте вопрос о договоре или юридических условиях</p>
                                </div>
                                <div className="flex flex-col gap-2 w-full mt-2">
                                    {[
                                        'Что такое форс-мажор?',
                                        'Какие риски в этом договоре?',
                                        'Объясни термин "неустойка"',
                                    ].map(q => (
                                        <button
                                            key={q}
                                            onClick={() => { setInput(q); }}
                                            className="text-xs text-left px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-gray-600"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                    msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                                }`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="flex-shrink-0 p-3 bg-white border-t border-gray-200">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:bg-white transition-colors">
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                                placeholder="Задайте вопрос..."
                                className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
                                disabled={loading}
                            />
                            <button
                                onClick={send}
                                disabled={!input.trim() || loading}
                                className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex-shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-1">Powered by Groq · Llama 3.3</p>
                    </div>
                </div>
            )}
        </>
    );
}
