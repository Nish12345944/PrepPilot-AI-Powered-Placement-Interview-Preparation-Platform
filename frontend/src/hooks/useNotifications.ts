'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  metadata?: any;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Real-time notifications via Socket.IO with REST fallback.
 * The socket reconnects automatically; we re-sync the unread count on
 * reconnect so a dropped connection never leaves stale counts behind.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      /* non-fatal */
    }
  }, []);

  const fetchList = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications?limit=15');
      setNotifications(data.notifications || []);
      setUnreadCount((data.notifications || []).filter((n: Notification) => !n.is_read).length);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !API_URL) return;

    let cancelled = false;
    fetchUnread();

    const socket = io(API_URL, {
      auth: { token },
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (cancelled) return;
      setConnected(true);
      // Re-sync after any (re)connection — notifications may have been
      // created while the socket was down.
      fetchUnread();
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('notification', (n: Notification) => {
      if (cancelled) return;
      setNotifications((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev].slice(0, 15)));
      setUnreadCount((c) => c + 1);
    });

    return () => {
      cancelled = true;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchUnread]);

  const toggleOpen = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      if (next) fetchList();
      return next;
    });
  }, [fetchList]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.post(`/notifications/${id}/read`);
    } catch {
      fetchUnread();
    }
  }, [fetchUnread]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await api.post('/notifications/read-all');
    } catch {
      fetchUnread();
    }
  }, [fetchUnread]);

  return {
    notifications,
    unreadCount,
    open,
    connected,
    toggleOpen,
    markRead,
    markAllRead,
    close: () => setOpen(false),
  };
}
