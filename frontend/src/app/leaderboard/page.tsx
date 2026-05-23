'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Trophy, Medal, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const PERIODS = [
  { id: 'weekly',   label: 'This Week' },
  { id: 'monthly',  label: 'This Month' },
  { id: 'all_time', label: 'All Time' },
];

const rankStyle = (rank: number) => {
  if (rank === 1) return 'text-yellow-400';
  if (rank === 2) return 'text-slate-300';
  if (rank === 3) return 'text-orange-400';
  return 'text-slate-500';
};

const rankBg = (rank: number) => {
  if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/30';
  if (rank === 2) return 'bg-slate-500/10 border-slate-500/30';
  if (rank === 3) return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-slate-800/60 border-slate-700';
};

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [period, setPeriod]   = useState('weekly');
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/dashboard/leaderboard?period=${period}`)
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [period]);

  const myRank = rows.find((r) => r.full_name === user?.full_name);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy size={24} className="text-yellow-400" /> Leaderboard
        </h1>
        <p className="text-slate-400 text-sm mt-1">Top performers ranked by XP earned</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 bg-slate-800/60 border border-slate-700 rounded-xl p-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* My rank banner */}
      {myRank && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-purple-300 text-sm font-medium">Your Rank</span>
          <div className="flex items-center gap-3">
            <span className="text-white font-bold">#{myRank.rank}</span>
            <span className="flex items-center gap-1 text-yellow-400 text-sm font-semibold">
              <Zap size={14} /> {parseInt(myRank.xp).toLocaleString()} XP
            </span>
          </div>
        </div>
      )}

      {/* Top 3 podium */}
      {!loading && rows.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[rows[1], rows[0], rows[2]].map((r, i) => {
            const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3;
            return (
              <div
                key={r.full_name}
                className={`flex flex-col items-center p-4 rounded-xl border ${rankBg(actualRank)} ${i === 1 ? 'scale-105' : ''}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-2 ${
                  actualRank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                  actualRank === 2 ? 'bg-slate-500/20 text-slate-300' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {r.full_name?.[0]?.toUpperCase()}
                </div>
                <p className="text-white text-xs font-medium text-center truncate w-full">{r.full_name}</p>
                <p className={`text-xs font-bold mt-1 ${rankStyle(actualRank)}`}>
                  {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : '🥉'} #{actualRank}
                </p>
                <p className="text-slate-400 text-xs mt-1 flex items-center gap-0.5">
                  <Zap size={10} className="text-yellow-400" />{parseInt(r.xp).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />
          ))
        ) : rows.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-10 text-center">
            <Trophy size={36} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No data yet for this period. Start earning XP!</p>
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r.full_name + r.rank}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${
                r.full_name === user?.full_name
                  ? 'bg-purple-500/10 border-purple-500/30'
                  : rankBg(r.rank)
              }`}
            >
              <span className={`w-8 text-center font-bold text-sm ${rankStyle(r.rank)}`}>
                {r.rank <= 3
                  ? r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'
                  : `#${r.rank}`}
              </span>
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {r.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${r.full_name === user?.full_name ? 'text-purple-300' : 'text-white'}`}>
                  {r.full_name} {r.full_name === user?.full_name && <span className="text-xs text-slate-500">(you)</span>}
                </p>
              </div>
              <div className="flex items-center gap-1 text-yellow-400 font-semibold text-sm shrink-0">
                <Zap size={14} /> {parseInt(r.xp).toLocaleString()} XP
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
