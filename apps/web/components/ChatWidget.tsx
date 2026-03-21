'use client';

import { useState, useRef, useEffect } from 'react';
import { appConfig } from '@pawroute/config';
import { api } from '../lib/api';

const c = appConfig.brand.colors;

interface Message { role: 'user' | 'bot'; text: string; }

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: `Hi! I'm ${appConfig.product.name}'s AI assistant 🐾 How can I help you today?` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  if (!appConfig.features.aiChatbot) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const r = await api.post('/ai/chat', { message: text });
      setMessages((prev) => [...prev, { role: 'bot', text: r.data.data.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', text: 'Sorry, I had trouble responding. Please try again!' }]);
    } finally { setLoading(false); }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl z-50 transition-transform hover:scale-110"
        style={{ backgroundColor: c.primary }}>
        {open ? '✕' : '🐾'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 w-80 bg-white rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden"
          style={{ maxHeight: 480 }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: c.primary }}>
            <span className="text-xl">🐾</span>
            <div>
              <p className="text-white font-semibold text-sm">{appConfig.product.name} Assistant</p>
              <p className="text-white/70 text-xs">Ask me anything!</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: 320 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                  m.role === 'user' ? 'text-white' : 'bg-gray-100 text-gray-800'
                }`}
                  style={m.role === 'user' ? { backgroundColor: c.primary } : {}}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-2xl text-sm text-gray-500">
                  <span className="animate-pulse">…</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a message..."
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-primary"
              style={{ '--tw-ring-color': c.primary } as any}
            />
            <button onClick={send} disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40"
              style={{ backgroundColor: c.primary }}>
              ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}
