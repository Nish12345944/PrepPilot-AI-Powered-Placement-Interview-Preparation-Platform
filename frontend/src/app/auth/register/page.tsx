'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const COMPANIES = ['Amazon', 'Google', 'Microsoft', 'TCS', 'Infosys', 'Wipro', 'Other'];

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '', password: '', full_name: '',
    target_company: '', target_role: '', college: '', graduation_year: '',
  });
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        target_company: form.target_company || undefined,
        target_role: form.target_role || undefined,
        college: form.college || undefined,
        graduation_year: form.graduation_year ? Number(form.graduation_year) : undefined,
      };
      await register(payload);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  };

  const field = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm text-purple-200 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">PrepPilot</h1>
          <p className="text-purple-300">Start your placement journey</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-6">Create Account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {field('full_name', 'Full Name', 'text', 'John Doe')}
            {field('email', 'Email', 'email', 'you@example.com')}
            {field('password', 'Password', 'password', 'Min 8 characters')}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-purple-200 mb-1">Target Company</label>
                <select
                  value={form.target_company}
                  onChange={(e) => setForm({ ...form, target_company: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select</option>
                  {COMPANIES.map((c) => <option key={c} value={c} className="bg-slate-800">{c}</option>)}
                </select>
              </div>
              {field('target_role', 'Target Role', 'text', 'SDE, Data Analyst...')}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {field('college', 'College', 'text', 'Your college')}
              {field('graduation_year', 'Grad Year', 'number', '2025')}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
            >
              {isLoading ? 'Creating account...' : 'Get Started'}
            </button>
          </form>

          <p className="text-center text-white/60 mt-4 text-sm">
            Already have an account?{' '}
            <a href="/auth/login" className="text-purple-400 hover:text-purple-300">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
