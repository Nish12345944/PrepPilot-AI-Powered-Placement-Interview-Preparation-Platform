'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Mic, Code2, FileText, MessageSquare,
  Calendar, Trophy, LogOut, Zap, Building2,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/interview',   label: 'Interview',   icon: Mic },
  { href: '/coding',      label: 'Coding',      icon: Code2 },
  { href: '/resume',      label: 'Resume',      icon: FileText },
  { href: '/copilot',     label: 'Copilot',     icon: MessageSquare },
  { href: '/planner',     label: 'Planner',     icon: Calendar },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/companies',   label: 'Companies',   icon: Building2 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 flex flex-col h-full"
        style={{
          background: 'rgba(8, 6, 30, 0.85)',
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(99,102,241,0.12)',
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <Zap size={18} className="text-white" />
              </div>
              <div className="absolute inset-0 rounded-xl blur-md opacity-50"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }} />
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-tight">PrepPilot</span>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="pulse-dot" style={{ width: 6, height: 6 }} />
                <span className="text-emerald-400 text-[10px] font-medium">AI Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div className="p-3 m-3 rounded-2xl"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.full_name}</p>
              <p className="text-indigo-400 text-xs">Lvl {user?.level} · {user?.total_xp?.toLocaleString()} XP</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-xl text-slate-400 hover:text-red-400 text-xs font-medium transition-colors hover:bg-red-500/10"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
