'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Trophy, Flame, Code2, Brain, Target, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';

interface DashboardData {
  profile: any; stats: any; recent_sessions: any[];
  topic_performance: any[]; xp_history: any[];
  recent_badges: any[]; weak_topics: any[];
}

const STAT_CARDS = [
  { key: 'total_xp',         label: 'Total XP',        icon: Trophy,    from: '#f59e0b', to: '#d97706', textColor: 'text-amber-400' },
  { key: 'level',            label: 'Level',           icon: TrendingUp, from: '#6366f1', to: '#4f46e5', textColor: 'text-indigo-400' },
  { key: 'problems_solved',  label: 'Problems Solved', icon: Code2,     from: '#10b981', to: '#059669', textColor: 'text-emerald-400' },
  { key: 'sessions_done',    label: 'Sessions Done',   icon: Brain,     from: '#06b6d4', to: '#0891b2', textColor: 'text-cyan-400' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => { api.get('/dashboard').then((r) => setData(r.data)); }, []);

  if (!data) return <DashboardSkeleton />;

  const radarData = data.topic_performance.slice(0, 8).map((t) => ({
    topic: t.name.split(' ')[0], score: Math.round(t.mastery_score || 0),
  }));
  const xpData = data.xp_history.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    xp: parseInt(d.xp_earned),
  }));

  const statValues: Record<string, any> = {
    total_xp:        data.profile?.total_xp?.toLocaleString(),
    level:           data.profile?.level,
    problems_solved: data.stats?.problems_solved,
    sessions_done:   data.stats?.sessions_completed,
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-indigo-400" />
            <span className="text-indigo-400 text-sm font-medium">
              {user?.target_company ? `Preparing for ${user.target_company}` : 'Your Dashboard'}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, <span className="gradient-text">{user?.full_name?.split(' ')[0]}</span> 👋
          </h1>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
          style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)' }}>
          <Flame className="text-orange-400" size={18} />
          <span className="text-orange-300 font-semibold text-sm">{data.profile?.current_streak ?? 0} day streak</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, from, to, textColor }) => (
          <div key={key} className="stat-card group cursor-default"
            style={{ background: `linear-gradient(135deg, rgba(15,12,41,0.8), rgba(15,12,41,0.6))` }}>
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `linear-gradient(135deg, ${from}08, ${to}05)` }} />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `linear-gradient(135deg, ${from}20, ${to}15)`, border: `1px solid ${from}30` }}>
                <Icon size={18} style={{ color: from }} />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{statValues[key] ?? '—'}</p>
              <p className="text-slate-400 text-xs font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-400" /> XP Earned — Last 30 Days
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={xpData}>
              <defs>
                <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f0c29', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="xp" stroke="#6366f1" strokeWidth={2} fill="url(#xpGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <Brain size={16} className="text-purple-400" /> Topic Mastery
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(99,102,241,0.15)" />
              <PolarAngleAxis dataKey="topic" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weak Areas */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Target size={16} className="text-red-400" /> Weak Areas
          </h3>
          <div className="space-y-3">
            {data.weak_topics.length === 0 ? (
              <p className="text-slate-500 text-sm">No weak topics yet — keep practicing!</p>
            ) : data.weak_topics.map((t) => (
              <div key={t.name}>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 text-sm">{t.name}</span>
                  <span className="text-red-400 text-xs font-medium">{Math.round(t.mastery_score)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${t.mastery_score}%`, background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Recent Sessions</h3>
          <div className="space-y-2">
            {data.recent_sessions.length === 0 ? (
              <p className="text-slate-500 text-sm">No sessions yet. Start your first mock interview!</p>
            ) : data.recent_sessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.15)' }}>
                    <Brain size={14} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-slate-200 text-sm capitalize font-medium">{s.session_type} Interview</p>
                    <p className="text-slate-500 text-xs">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${s.score >= 70 ? 'text-emerald-400' : s.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                  {s.score ? `${Math.round(s.score)}%` : s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Badges */}
      {data.recent_badges.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" /> Recent Badges
          </h3>
          <div className="flex gap-3 flex-wrap">
            {data.recent_badges.map((b) => (
              <div key={b.name} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Trophy size={15} className="text-amber-400" />
                <div>
                  <p className="text-amber-300 text-sm font-semibold">{b.name}</p>
                  <p className="text-amber-500/60 text-xs">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
      <div className="h-16 skeleton" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton" />)}
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div className="h-60 skeleton" />
        <div className="h-60 skeleton" />
      </div>
    </div>
  );
}
