'use client';
import { useEffect, useRef } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

const TYPE_ICON: Record<string, string> = {
  achievement: '🏆',
  reminder: '⏰',
  learning: '📚',
  system: '🔔',
};

export default function NotificationBell() {
  const { notifications, unreadCount, open, toggleOpen, markRead, markAllRead, close } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggleOpen}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 outline-none"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] z-50 rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(15,12,41,0.97)',
            border: '1px solid rgba(99,102,241,0.25)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-white text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs font-medium"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                <Bell size={24} className="text-slate-600" />
                <p className="text-slate-500 text-sm">No notifications yet</p>
                <p className="text-slate-600 text-xs">Badge awards and reminders will appear here.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`w-full text-left flex gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 outline-none ${
                    n.is_read ? 'opacity-60 hover:bg-white/[0.02]' : 'hover:bg-indigo-500/10'
                  }`}
                >
                  <span aria-hidden="true" className="text-base shrink-0 mt-0.5">
                    {TYPE_ICON[n.type] || '🔔'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-white text-xs font-semibold truncate">{n.title}</span>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" aria-label="unread" />}
                    </span>
                    <span className="block text-slate-400 text-xs mt-0.5 line-clamp-2">{n.body}</span>
                    <span className="block text-slate-600 text-[10px] mt-1">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
