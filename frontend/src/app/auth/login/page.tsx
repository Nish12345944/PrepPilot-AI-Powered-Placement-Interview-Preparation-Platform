'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, user } = useAuthStore();
  const router = useRouter();

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    if (user && localStorage.getItem('accessToken')) router.replace('/dashboard');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      router.push('/dashboard');
    } catch (err: any) {
      const msg =
        err.response?.status === 401
          ? 'Invalid email or password.'
          : err.response?.data?.error || 'Login failed. Please try again.';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4f46e5, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-8 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 relative float"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <Zap size={26} className="text-white" />
            <div className="absolute inset-0 rounded-2xl blur-lg opacity-60"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }} />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">PrepPilot</h1>
          <p className="text-slate-400 text-sm">AI-Powered Placement Preparation</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8"
          style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-7">Sign in to continue your prep journey</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-indigo-300 mb-2 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field pl-11"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="login-password" className="text-xs font-medium text-indigo-300 uppercase tracking-wider">Password</label>
                <a href="/auth/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-11 pr-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-slate-500 text-sm">
              Don&apos;t have an account?{' '}
              <a href="/auth/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Create one free
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
