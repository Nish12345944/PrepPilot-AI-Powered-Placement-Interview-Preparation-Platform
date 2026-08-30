import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  target_company?: string;
  total_xp: number;
  level: number;
  current_streak: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    target_company?: string;
    target_role?: string;
    college?: string;
    graduation_year?: number;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          set({ user: data.user });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (formData) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', formData);
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          set({ user: data.user });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        await api.post('/auth/logout').catch(() => {});
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null });
      },

      fetchMe: async () => {
        const { data } = await api.get('/auth/me');
        set({ user: data });
      },
    }),
    { name: 'auth-store', partialize: (s) => ({ user: s.user }) }
  )
);
