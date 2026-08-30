'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Lock, ArrowLeft, XCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const userId = params.get('id');

  // Missing or incomplete link — fail fast with a clear state.
  if (!token || !userId) {
    return (
      <div className="text-center space-y-4 py-4" role="alert">
        <XCircle size={40} className="text-red-400 mx-auto" />
        <h2 className="text-lg font-semibold text-white">Invalid reset link</h2>
        <p className="text-slate-400 text-sm">
          This password reset link is missing required information. Please request a new one.
        </p>
        <Link href="/auth/forgot-password" className="btn-primary inline-block text-sm">
          Request new link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { userId, token, password });
      toast.success('Password reset! Please log in with your new password.');
      router.push('/auth/login');
    } catch (err: any) {
      const msg = /expired|invalid/i.test(err.response?.data?.error || '')
        ? 'This reset link is invalid or has expired. Please request a new one.'
        : err.response?.data?.error || 'Password reset failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="reset-password" className="block text-xs font-medium text-indigo-300 mb-2 uppercase tracking-wider">
          New Password
        </label>
        <div className="relative">
          <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field pl-11 pr-11"
            placeholder="Min 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      </div>
      <div>
        <label htmlFor="reset-confirm" className="block text-xs font-medium text-indigo-300 mb-2 uppercase tracking-wider">
          Confirm Password
        </label>
        <div className="relative">
          <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            id="reset-confirm"
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input-field pl-11 pr-11"
            placeholder="Repeat password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-slate-400 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
          className="accent-indigo-500"
        />
        Show passwords
      </label>
      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="btn-primary w-full py-3"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4f46e5, transparent)' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 relative float"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">PrepPilot</h1>
          <p className="text-slate-400 text-sm">AI-Powered Placement Preparation</p>
        </div>
        <div className="glass rounded-3xl p-8"
          style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <h2 className="text-xl font-bold text-white mb-1">Set new password</h2>
          <p className="text-slate-400 text-sm mb-7">Choose a strong password for your account.</p>
          <Suspense fallback={<div className="text-slate-500 text-sm">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <Link href="/auth/login" className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
              <ArrowLeft size={14} /> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
