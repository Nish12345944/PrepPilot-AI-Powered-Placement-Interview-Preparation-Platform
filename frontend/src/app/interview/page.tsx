'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Mic, FileText, Clock, Building2, Play, History,
  CheckCircle, ChevronRight, RefreshCw, Trophy, Target,
} from 'lucide-react';

const SESSION_TYPES = [
  { value: 'technical', label: 'Technical', icon: FileText, desc: 'DSA, CS fundamentals, system design' },
  { value: 'hr', label: 'HR Round', icon: Mic, desc: 'Behavioral, situational, STAR method' },
  { value: 'aptitude', label: 'Aptitude', icon: Clock, desc: 'Quant, logical, verbal reasoning' },
  { value: 'coding', label: 'Coding', icon: FileText, desc: 'Live coding problems with AI feedback' },
];

const STATIC_COMPANIES = ['General', 'Amazon', 'Google', 'Microsoft', 'TCS', 'Infosys', 'Wipro'];

const scoreColor = (s: number) =>
  s >= 80 ? 'text-green-400' : s >= 60 ? 'text-yellow-400' : 'text-red-400';

const diffBadge = (d: string) => ({
  easy: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  hard: 'bg-red-500/20 text-red-400',
}[d] || 'bg-slate-500/20 text-slate-400');

export default function InterviewSetupPage() {
  const [config, setConfig] = useState({
    session_type: 'technical',
    company_target: 'General',
    response_mode: 'audio_video' as 'audio_video',
    is_strict_mode: false,
    question_count: 10,
  });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'setup' | 'history'>('setup');
  const [sessions, setSessions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get('/interview/sessions?limit=20');
      setSessions(data);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const startInterview = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/interview/sessions', config);
      // Store questions and selected response mode in sessionStorage (not URL)
      sessionStorage.setItem(
        `session_${data.session.id}`,
        JSON.stringify({ questions: data.questions, responseMode: config.response_mode })
      );
      router.push(`/interview/${data.session.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start interview');
      setLoading(false);
    }
  };

  const formatDuration = (sec: number) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mock Interview</h1>
        <p className="text-slate-400 mt-1">AI-powered interview sessions with real-time evaluation</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-lg p-1 w-fit">
        {(['setup', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize flex items-center gap-1.5 ${
              tab === t ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'history' && <History size={14} />}
            {t}
          </button>
        ))}
      </div>

      {tab === 'setup' && (
        <>
          {/* Session Type */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-medium mb-4">Interview Type</h3>
            <div className="grid grid-cols-2 gap-3">
              {SESSION_TYPES.map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  onClick={() => setConfig({ ...config, session_type: value })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    config.session_type === value
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-slate-600 bg-slate-700/40 hover:border-slate-500'
                  }`}
                >
                  <Icon size={20} className={config.session_type === value ? 'text-purple-400' : 'text-slate-400'} />
                  <p className="text-white font-medium mt-2">{label}</p>
                  <p className="text-slate-400 text-xs mt-1">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-5">
            <h3 className="text-white font-medium">Settings</h3>

            <div>
              <label className="block text-sm text-slate-400 mb-2 flex items-center gap-1">
                <Building2 size={14} /> Target Company
              </label>
              <div className="flex flex-wrap gap-2">
                {STATIC_COMPANIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setConfig({ ...config, company_target: c })}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      config.company_target === c
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Number of Questions</p>
                <p className="text-slate-400 text-xs">Questions per session</p>
              </div>
              <select
                value={config.question_count}
                onChange={(e) => setConfig({ ...config, question_count: parseInt(e.target.value) })}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Strict Mode</p>
                <p className="text-slate-400 text-xs">Timer enforced, no hints allowed</p>
              </div>
              <button
                onClick={() => setConfig({ ...config, is_strict_mode: !config.is_strict_mode })}
                className={`relative w-12 h-6 rounded-full transition-colors ${config.is_strict_mode ? 'bg-purple-600' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.is_strict_mode ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Response Mode</p>
                <p className="text-slate-400 text-xs">Audio + Video with AI transcription</p>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm font-medium">
                <Mic size={14} /> Audio + Video
              </span>
            </div>
          </div>

          <button
            onClick={startInterview}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
            {loading ? 'Starting Session...' : 'Start Interview'}
          </button>
        </>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {historyLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <RefreshCw size={16} className="animate-spin" /> Loading history...
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-10 text-center">
              <History size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No sessions yet. Start your first interview!</p>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/interview/${s.id}`)}
                className="w-full bg-slate-800/60 border border-slate-700 hover:border-slate-500 rounded-xl p-4 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${s.status === 'completed' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    <div>
                      <p className="text-white font-medium capitalize">{s.session_type} Interview</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {s.company_target} · {s.total_questions} questions · {formatDuration(s.duration_sec)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.score != null && (
                      <span className={`text-lg font-bold ${scoreColor(s.score)}`}>
                        {Math.round(s.score)}%
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      s.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {s.status}
                    </span>
                    <ChevronRight size={16} className="text-slate-500" />
                  </div>
                </div>
                <p className="text-slate-500 text-xs mt-2">{new Date(s.created_at).toLocaleString()}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
