'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import NotificationBell from '@/components/NotificationBell';
import {
  LayoutDashboard, Mic, Code2, FileText, MessageSquare,
  Calendar, Trophy, LogOut, Zap, Building2, Menu, X,
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

function Logo() {
  return (
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
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <>
      {/* Logo */}
      <div className="px-5 pt-6 pb-8">
        <Logo />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`nav-item ${active ? 'active' : ''}`}
            >
              <Icon size={17} aria-hidden="true" />
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
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              aria-hidden="true">
              {user?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.full_name}</p>
            <p className="text-indigo-400 text-xs">Lvl {user?.level} · {user?.total_xp?.toLocaleString()} XP</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-xl text-slate-400 hover:text-red-400 text-xs font-medium transition-colors hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-400 outline-none"
        >
          <LogOut size={13} aria-hidden="true" /> Sign out
        </button>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Redirect unauthenticated visitors to login.
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!user && !token) router.replace('/auth/login');
  }, [user, router]);

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: 'rgba(8,6,30,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-indigo-400 outline-none"
        >
          <Menu size={20} />
        </button>
        <span className="text-white font-bold tracking-tight">PrepPilot</span>
        <NotificationBell />
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-[220px] shrink-0 flex-col h-full"
        style={{
          background: 'rgba(8, 6, 30, 0.85)',
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(99,102,241,0.12)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-[260px] max-w-[80vw] flex flex-col transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'rgba(8, 6, 30, 0.97)',
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(99,102,241,0.12)',
        }}
        aria-hidden={!drawerOpen}
      >
        <button
          onClick={() => setDrawerOpen(false)}
          aria-label="Close navigation menu"
          className="absolute top-4 right-3 p-2 rounded-lg text-slate-400 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400 outline-none"
        >
          <X size={18} />
        </button>
        <SidebarContent onNavigate={() => setDrawerOpen(false)} />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="min-h-full p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
