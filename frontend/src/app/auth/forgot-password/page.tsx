'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Zap, Mail, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      // Never reveal whether the account exists — show the same state either way.
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient blobs */}
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
          {sent ? (
            <div className="text-center space-y-4" role="status">
              <div className="text-5xl">📬</div>
              <h2 className="text-xl font-semibold text-white">Check your inbox</h2>
              <p className="text-slate-400 text-sm">
                If an account exists for <span className="text-indigo-300">{email}</span>, a reset
                link has been sent. It expires in 1 hour.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Forgot password?</h2>
              <p className="text-slate-400 text-sm mb-7">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-medium text-indigo-300 mb-2 uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-11"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="btn-primary w-full py-3"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
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

