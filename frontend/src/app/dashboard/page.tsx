'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import {
  Trophy, Flame, Code2, Brain, Target, TrendingUp,
  Mic, FileText, MessageSquare, Calendar, ChevronRight,
  Zap, Star, BookOpen, ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  profile: any; stats: any; recent_sessions: any[];
  topic_performance: any[]; xp_history: any[];
  recent_badges: any[]; weak_topics: any[];
}

const QUICK_ACTIONS = [
  { label: 'Mock Interview', desc: 'AI-powered session', icon: Mic,          href: '/interview',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  { label: 'Coding Practice', desc: 'DSA problems',      icon: Code2,        href: '/coding',      color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  { label: 'AI Copilot',      desc: 'Ask anything',      icon: MessageSquare,href: '/copilot',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  { label: 'Daily Planner',   desc: 'Today\'s tasks',    icon: Calendar,     href: '/planner',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { label: 'Resume Analyzer', desc: 'ATS score',         icon: FileText,     href: '/resume',      color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'   },
  { label: 'Companies',       desc: 'Placement guide',   icon: BookOpen,     href: '/companies',   color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
];

function CircleProgress({ value, size = 80, stroke = 7, color }: { value: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router   = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Redirect unauthenticated users (e.g. after token expiry)
    if (!user && !localStorage.getItem('accessToken')) {
      router.replace('/auth/login');
      return;
    }
    api.get('/dashboard')
      .then((r) => setData(r.data))
      .catch(() => setError(true));
  }, [router, user]);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-24 gap-3">
        <TrendingUp size={36} className="text-slate-600" />
        <p className="text-slate-300 font-semibold">Couldn&apos;t load your dashboard</p>
        <p className="text-slate-500 text-sm">Please check your connection and try again.</p>
        <button
          onClick={() => { setError(false); api.get('/dashboard').then((r) => setData(r.data)).catch(() => setError(true)); }}
          className="btn-primary mt-3 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const xpData = data.xp_history.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    xp: parseInt(d.xp_earned),
  }));

  const radarData = data.topic_performance.slice(0, 7).map((t) => ({
    topic: t.name.split(' ')[0],
    score: Math.round(t.mastery_score || 0),
  }));

  const level      = data.profile?.level ?? 1;
  const xp         = data.profile?.total_xp ?? 0;
  // Backend level formula: level = FLOOR(total_xp / 500) + 1
  const xpPerLevel = 500;
  const xpInLevel  = Math.max(0, xp - (level - 1) * xpPerLevel);
  const xpToNext   = Math.max(0, xpPerLevel - xpInLevel);
  const xpProgress = Math.min(100, Math.round((xpInLevel / xpPerLevel) * 100));
  const streak     = data.profile?.current_streak ?? 0;
  const solved     = data.stats?.problems_solved ?? 0;
  const sessions   = data.stats?.sessions_completed ?? 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden p-7"
        style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.25) 0%, rgba(124,58,237,0.15) 50%, rgba(6,182,212,0.1) 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
        }}>
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3), transparent)' }} />
        <div className="absolute -bottom-8 left-1/3 w-32 h-32 rounded-full blur-2xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent)' }} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-indigo-300 text-sm font-medium mb-1">
              {greeting()}, {user?.full_name?.split(' ')[0]} 👋
            </p>
            <h1 className="text-3xl font-bold text-white mb-2">
              {user?.target_company
                ? <>Preparing for <span className="gradient-text">{user.target_company}</span></>
                : <span className="gradient-text">Your Prep Dashboard</span>}
            </h1>
            <p className="text-slate-400 text-sm max-w-md">
              {streak > 0
                ? `You're on a ${streak}-day streak 🔥 Keep the momentum going!`
                : 'Start practicing today to build your streak and boost your XP.'}
            </p>
          </div>

          {/* XP + Level ring */}
          <div className="flex items-center gap-5 shrink-0">
            <div className="relative flex items-center justify-center">
              <CircleProgress value={xpProgress} size={90} stroke={7} color="#6366f1" />
              <div className="absolute flex flex-col items-center">
                <span className="text-white font-bold text-lg leading-none">{level}</span>
                <span className="text-indigo-400 text-[10px]">LVL</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-white font-bold text-xl">{xp.toLocaleString()} <span className="text-indigo-400 text-sm font-normal">XP</span></p>
              <p className="text-slate-400 text-xs">{xpToNext} XP to Level {level + 1}</p>
              <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <div className="h-full rounded-full" style={{ width: `${xpProgress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Streak + quick stats row */}
        <div className="relative z-10 flex flex-wrap gap-4 mt-6 pt-5 border-t" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
          {[
            { icon: Flame,    label: 'Day Streak',       value: streak,   color: '#f97316' },
            { icon: Code2,    label: 'Problems Solved',  value: solved,   color: '#10b981' },
            { icon: Brain,    label: 'Sessions Done',    value: sessions, color: '#8b5cf6' },
            { icon: Trophy,   label: 'Longest Streak',   value: data.profile?.longest_streak ?? 0, color: '#f59e0b' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-2.5 px-4 py-2 rounded-xl"
              style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
              <Icon size={15} style={{ color }} />
              <div>
                <p className="text-white font-bold text-sm leading-none">{value}</p>
                <p className="text-slate-500 text-[10px] mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <div>
        <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Zap size={14} className="text-indigo-400" /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map(({ label, desc, icon: Icon, href, color, bg }) => (
            <Link key={href} href={href}
              className="group flex flex-col items-center gap-2 p-4 rounded-2xl text-center transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: bg, border: `1px solid ${color}25` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: `${color}20`, border: `1px solid ${color}35` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-white text-xs font-semibold leading-tight">{label}</p>
                <p className="text-slate-500 text-[10px] mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Charts Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* XP Chart — wider */}
        <div className="lg:col-span-3 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <TrendingUp size={15} className="text-indigo-400" /> XP Activity
            </h3>
            <span className="text-slate-500 text-xs">Last 30 days</span>
          </div>
          {xpData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-slate-600 text-sm">No XP activity yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={175}>
              <AreaChart data={xpData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f0c29', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, fontSize: 11 }}
                  labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#a5b4fc' }} />
                <Area type="monotone" dataKey="xp" stroke="#6366f1" strokeWidth={2} fill="url(#xpGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Radar — narrower */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Brain size={15} className="text-purple-400" /> Topic Mastery
          </h3>
          {radarData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-slate-600 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={175}>
              <RadarChart data={radarData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <PolarGrid stroke="rgba(99,102,241,0.12)" />
                <PolarAngleAxis dataKey="topic" tick={{ fill: '#475569', fontSize: 9 }} />
                <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.18} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Weak Areas */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Target size={15} className="text-red-400" /> Weak Areas
          </h3>
          {data.weak_topics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Star size={28} className="text-emerald-400" />
              <p className="text-emerald-400 text-sm font-medium">All strong!</p>
              <p className="text-slate-500 text-xs text-center">No weak topics detected yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.weak_topics.map((t) => (
                <div key={t.name}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-slate-300 text-xs font-medium">{t.name}</span>
                    <span className="text-red-400 text-xs font-bold">{Math.round(t.mastery_score)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${t.mastery_score}%`, background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Mic size={15} className="text-indigo-400" /> Recent Sessions
            </h3>
            <Link href="/interview" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              <ArrowUpRight size={15} />
            </Link>
          </div>
          {data.recent_sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Mic size={28} className="text-slate-600" />
              <p className="text-slate-500 text-sm text-center">No sessions yet</p>
              <Link href="/interview" className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors flex items-center gap-1">
                Start interview <ChevronRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.recent_sessions.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(99,102,241,0.15)' }}>
                      <Brain size={13} className="text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-slate-200 text-xs font-medium capitalize">{s.session_type}</p>
                      <p className="text-slate-600 text-[10px]">{new Date(s.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${s.score >= 70 ? 'text-emerald-400' : s.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {s.score ? `${Math.round(s.score)}%` : s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Badges + right column */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Trophy size={15} className="text-amber-400" /> Badges Earned
          </h3>
          {data.recent_badges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Trophy size={28} className="text-slate-600" />
              <p className="text-slate-500 text-sm text-center">No badges yet</p>
              <p className="text-slate-600 text-xs text-center">Complete sessions to earn badges</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.recent_badges.slice(0, 4).map((b) => (
                <div key={b.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(245,158,11,0.15)' }}>
                    <Trophy size={14} className="text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-amber-300 text-xs font-semibold truncate">{b.name}</p>
                    <p className="text-amber-600/70 text-[10px] truncate">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="h-52 skeleton rounded-3xl" />
      <div className="grid grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 h-56 skeleton rounded-2xl" />
        <div className="col-span-2 h-56 skeleton rounded-2xl" />
      </div>
      <div className="grid grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => <div key={i} className="h-48 skeleton rounded-2xl" />)}
      </div>
    </div>
  );
}
