'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Plus, Bot, User, Copy, Check, Trash2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  { label: 'Explain Dynamic Programming', icon: '🧠' },
  { label: 'How to prepare for Amazon SDE?', icon: '🏢' },
  { label: 'Write a binary search in Python', icon: '💻' },
  { label: 'STAR method for HR rounds', icon: '🎯' },
  { label: 'Time complexity of quicksort', icon: '⏱️' },
  { label: 'Difference between BFS and DFS', icon: '🌳' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  );
}

function MessageContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none
      prose-p:leading-relaxed prose-p:my-1.5
      prose-headings:text-white prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
      prose-strong:text-white prose-strong:font-semibold
      prose-ul:my-2 prose-li:my-0.5
      prose-ol:my-2
      prose-blockquote:border-indigo-500 prose-blockquote:text-slate-300
      prose-code:text-indigo-300 prose-code:bg-indigo-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => (
            <div className="relative group my-3">
              <pre className="bg-[#0d0b1e] border border-indigo-500/20 rounded-xl p-4 overflow-x-auto text-xs font-mono leading-relaxed">
                {children}
              </pre>
            </div>
          ),
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return <code className="text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>;
            }
            return <code className="text-slate-200 text-xs font-mono" {...props}>{children}</code>;
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-slate-700 px-3 py-2 text-left text-slate-300 bg-slate-800/60 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-slate-700/50 px-3 py-2 text-slate-300">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function CopilotPage() {
  const [sessions, setSessions]         = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages]         = useState<any[]>([]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.get('/chat/sessions').then((r) => setSessions(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [input]);

  const loadSession = async (sessionId: string) => {
    setActiveSession(sessionId);
    const { data } = await api.get(`/chat/sessions/${sessionId}/messages`);
    setMessages(data);
  };

  const newChat = () => {
    setActiveSession(null);
    setMessages([]);
    textareaRef.current?.focus();
  };

  const sendMessage = useCallback(async (text?: string) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setInput('');
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setMessages((prev) => [...prev, { role: 'user', content: userMsg, created_at: new Date().toISOString() }]);

    try {
      const { data } = await api.post('/chat/message', {
        session_id: activeSession,
        message: userMsg,
      });

      if (!activeSession) {
        setActiveSession(data.session_id);
        setSessions((prev) => [
          { id: data.session_id, title: userMsg.substring(0, 45), created_at: new Date().toISOString() },
          ...prev,
        ]);
      }
      setMessages((prev) => [...prev, data.message]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send message');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeSession]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] gap-0 overflow-hidden" style={{ margin: '-24px' }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 flex flex-col border-r overflow-hidden"
        style={{ background: 'rgba(8,6,30,0.9)', borderColor: 'rgba(99,102,241,0.12)' }}>
        <div className="p-3">
          <button onClick={newChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:-translate-y-px"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 15px rgba(99,102,241,0.3)' }}>
            <Plus size={15} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {sessions.length === 0 && (
            <p className="text-slate-600 text-xs text-center py-4">No conversations yet</p>
          )}
          {sessions.map((s) => (
            <button key={s.id} onClick={() => loadSession(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors truncate ${
                activeSession === s.id
                  ? 'text-indigo-300 bg-indigo-500/15 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}>
              <p className="truncate font-medium">{s.title || 'New conversation'}</p>
              <p className="text-slate-600 text-[10px] mt-0.5">{new Date(s.created_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Chat Area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-mesh">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full gap-8 px-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 relative"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  <Zap size={28} className="text-white" />
                  <div className="absolute inset-0 rounded-2xl blur-xl opacity-50"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }} />
                </div>
                <h2 className="text-white text-2xl font-bold mb-2">PrepPilot Copilot</h2>
                <p className="text-slate-400 text-sm max-w-sm">Your AI career coach. Ask me anything about DSA, interviews, companies, or your prep journey.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-2xl">
                {SUGGESTIONS.map((s) => (
                  <button key={s.label} onClick={() => sendMessage(s.label)}
                    className="text-left px-4 py-3 rounded-xl text-sm transition-all hover:-translate-y-0.5 glass-hover"
                    style={{ background: 'rgba(15,12,41,0.6)' }}>
                    <span className="mr-2">{s.icon}</span>
                    <span className="text-slate-300">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600'
                      : 'bg-gradient-to-br from-violet-600 to-indigo-600'
                  }`}>
                    {msg.role === 'user'
                      ? <User size={15} className="text-white" />
                      : <Bot size={15} className="text-white" />}
                  </div>

                  {/* Bubble */}
                  <div className={`group relative max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    {msg.role === 'user' ? (
                      <div className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
                        {msg.content}
                      </div>
                    ) : (
                      <div className="px-5 py-4 rounded-2xl rounded-tl-sm w-full"
                        style={{ background: 'rgba(15,12,41,0.7)', border: '1px solid rgba(99,102,241,0.15)' }}>
                        <MessageContent content={msg.content} />
                      </div>
                    )}
                    {/* Copy button */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex justify-end">
                      <CopyButton text={msg.content} />
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-600 to-indigo-600">
                    <Bot size={15} className="text-white" />
                  </div>
                  <div className="px-5 py-4 rounded-2xl rounded-tl-sm"
                    style={{ background: 'rgba(15,12,41,0.7)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div className="flex gap-1.5 items-center">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input Bar ─────────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-3 border-t" style={{ borderColor: 'rgba(99,102,241,0.12)', background: 'rgba(8,6,30,0.6)', backdropFilter: 'blur(20px)' }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end rounded-2xl p-3"
              style={{ background: 'rgba(15,12,41,0.8)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything — DSA, interviews, companies, code..."
                rows={1}
                className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm resize-none outline-none leading-relaxed"
                style={{ maxHeight: 160, minHeight: 24 }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: input.trim() ? '0 4px 15px rgba(99,102,241,0.4)' : 'none' }}>
                <Send size={15} className="text-white" />
              </button>
            </div>
            <p className="text-slate-600 text-[10px] text-center mt-2">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  );
}
