'use client';
import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

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
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">PrepPilot</h1>
          <p className="text-purple-300">AI-Powered Placement Preparation</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📬</div>
              <h2 className="text-xl font-semibold text-white">Check your inbox</h2>
              <p className="text-white/60 text-sm">
                If an account exists for <span className="text-purple-300">{email}</span>, a reset
                link has been sent. It expires in 1 hour.
              </p>
              <a href="/auth/login" className="block text-purple-400 hover:text-purple-300 text-sm mt-4">
                ← Back to login
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-white mb-2">Forgot password?</h2>
              <p className="text-white/50 text-sm mb-6">
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-purple-200 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-white/60 mt-4 text-sm">
                <a href="/auth/login" className="text-purple-400 hover:text-purple-300">
                  ← Back to login
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
