'use client';
import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { Send, Plus, Bot, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CopilotPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/chat/sessions').then((r) => setSessions(r.data));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSession = async (sessionId: string) => {
    setActiveSession(sessionId);
    const { data } = await api.get(`/chat/sessions/${sessionId}/messages`);
    setMessages(data);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    // Optimistic update
    setMessages((prev) => [...prev, { role: 'user', content: userMsg, created_at: new Date() }]);

    try {
      const { data } = await api.post('/chat/message', {
        session_id: activeSession,
        message: userMsg,
      });

      if (!activeSession) {
        setActiveSession(data.session_id);
        setSessions((prev) => [{ id: data.session_id, title: userMsg.substring(0, 40), created_at: new Date() }, ...prev]);
      }

      setMessages((prev) => [...prev, data.message]);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTIONS = [
    'Explain Dynamic Programming with examples',
    'How do I prepare for Amazon interviews?',
    'What is the STAR method for HR rounds?',
    'Debug this: why does my binary search fail?',
  ];

  return (
    <div className="h-[calc(100vh-80px)] flex gap-4">
      {/* Sidebar */}
      <div className="w-64 flex flex-col gap-3">
        <button
          onClick={() => { setActiveSession(null); setMessages([]); }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} /> New Chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors truncate ${
                activeSession === s.id ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {s.title || 'New conversation'}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-6">
              <div className="text-center">
                <Bot size={48} className="text-purple-400 mx-auto mb-3" />
                <h2 className="text-white text-xl font-semibold">PrepPilot Copilot</h2>
                <p className="text-slate-400 mt-1">Your AI career coach. Ask me anything.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="text-left bg-slate-700/60 hover:bg-slate-700 border border-slate-600 rounded-xl p-3 text-slate-300 text-sm transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-purple-600' : 'bg-slate-600'
              }`}>
                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white rounded-tr-sm'
                  : 'bg-slate-700/80 text-slate-200 rounded-tl-sm'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-slate-700/80 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask anything about interviews, concepts, or your prep..."
              className="flex-1 bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white p-3 rounded-xl transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
