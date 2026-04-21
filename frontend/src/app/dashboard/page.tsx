'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Trophy, Flame, Code2, Brain, Target, TrendingUp } from 'lucide-react';

interface DashboardData {
  profile: any;
  stats: any;
  recent_sessions: any[];
  topic_performance: any[];
  xp_history: any[];
  recent_badges: any[];
  weak_topics: any[];
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data));
  }, []);

  if (!data) return <DashboardSkeleton />;

  const radarData = data.topic_performance.slice(0, 8).map((t) => ({
    topic: t.name.split(' ')[0],
    score: Math.round(t.mastery_score || 0),
  }));

  const xpData = data.xp_history.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    xp: parseInt(d.xp_earned),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1">
            {user?.target_company ? `Preparing for ${user.target_company}` : 'Keep up the great work!'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-xl px-4 py-2">
          <Flame className="text-orange-400" size={20} />
          <span className="text-orange-300 font-semibold">{data.profile?.current_streak} day streak</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total XP', value: data.profile?.total_xp?.toLocaleString(), icon: Trophy, color: 'yellow' },
          { label: 'Level', value: data.profile?.level, icon: TrendingUp, color: 'purple' },
          { label: 'Problems Solved', value: data.stats?.problems_solved, icon: Code2, color: 'green' },
          { label: 'Sessions Done', value: data.stats?.sessions_completed, icon: Brain, color: 'blue' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className={`w-10 h-10 rounded-lg bg-${color}-500/20 flex items-center justify-center mb-3`}>
              <Icon size={20} className={`text-${color}-400`} />
            </div>
            <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
            <p className="text-slate-400 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* XP History */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">XP Earned (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={xpData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Line type="monotone" dataKey="xp" stroke="#a855f7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Topic Radar */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Topic Mastery</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="topic" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Radar dataKey="score" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weak Topics + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Target size={18} className="text-red-400" /> Weak Areas
          </h3>
          <div className="space-y-3">
            {data.weak_topics.length === 0 && (
              <p className="text-slate-400 text-sm">No weak topics detected yet. Keep practicing!</p>
            )}
            {data.weak_topics.map((t) => (
              <div key={t.name} className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">{t.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${t.mastery_score}%` }}
                    />
                  </div>
                  <span className="text-red-400 text-xs w-8">{Math.round(t.mastery_score)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Recent Sessions</h3>
          <div className="space-y-2">
            {data.recent_sessions.length === 0 && (
              <p className="text-slate-400 text-sm">No sessions yet. Start your first mock interview!</p>
            )}
            {data.recent_sessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                <div>
                  <p className="text-slate-200 text-sm capitalize">{s.session_type} Interview</p>
                  <p className="text-slate-500 text-xs">{new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-semibold ${s.score >= 70 ? 'text-green-400' : s.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {s.score ? `${Math.round(s.score)}%` : s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Badges */}
      {data.recent_badges.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Recent Badges</h3>
          <div className="flex gap-4 flex-wrap">
            {data.recent_badges.map((b) => (
              <div key={b.name} className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                <Trophy size={16} className="text-yellow-400" />
                <div>
                  <p className="text-yellow-300 text-sm font-medium">{b.name}</p>
                  <p className="text-yellow-500/70 text-xs">{b.description}</p>
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
    <div className="space-y-6 animate-pulse">
      <div className="h-16 bg-slate-800 rounded-xl" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-800 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 bg-slate-800 rounded-xl" />
        <div className="h-64 bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
}
