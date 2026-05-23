'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const userId = params.get('id');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match.');
    if (!token || !userId) return toast.error('Invalid reset link.');

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { userId, token, password });
      toast.success('Password reset! Please log in.');
      router.push('/auth/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid or expired link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-purple-200 mb-1">New Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Min 8 characters"
          minLength={8}
          required
        />
      </div>
      <div>
        <label className="block text-sm text-purple-200 mb-1">Confirm Password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Repeat password"
          minLength={8}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">PrepPilot</h1>
          <p className="text-purple-300">AI-Powered Placement Preparation</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-2">Set new password</h2>
          <p className="text-white/50 text-sm mb-6">Choose a strong password for your account.</p>
          <Suspense fallback={<div className="text-white/50 text-sm">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
          <p className="text-center text-white/60 mt-4 text-sm">
            <a href="/auth/login" className="text-purple-400 hover:text-purple-300">
              ← Back to login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
