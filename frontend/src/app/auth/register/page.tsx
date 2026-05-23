'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Zap, User, Mail, Lock, Building2, Briefcase, GraduationCap, ArrowRight } from 'lucide-react';

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
      await register({
        email: form.email, password: form.password, full_name: form.full_name,
        target_company: form.target_company || undefined,
        target_role: form.target_role || undefined,
        college: form.college || undefined,
        graduation_year: form.graduation_year ? Number(form.graduation_year) : undefined,
      });
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4f46e5, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-8 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 relative float"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <Zap size={26} className="text-white" />
            <div className="absolute inset-0 rounded-2xl blur-lg opacity-60"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }} />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">PrepPilot</h1>
          <p className="text-slate-400 text-sm">Start your placement journey today</p>
        </div>

        <div className="glass rounded-3xl p-8"
          style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <h2 className="text-xl font-bold text-white mb-1">Create Account</h2>
          <p className="text-slate-400 text-sm mb-7">Fill in your details to get started</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-indigo-300 mb-2 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="input-field pl-11" placeholder="John Doe" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-indigo-300 mb-2 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field pl-11" placeholder="you@example.com" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-indigo-300 mb-2 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field pl-11" placeholder="Min 8 characters" required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-indigo-300 mb-2 uppercase tracking-wider">Target Company</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                  <select value={form.target_company} onChange={(e) => setForm({ ...form, target_company: e.target.value })}
                    className="input-field pl-11 appearance-none">
                    <option value="" className="bg-[#050816]">Select</option>
                    {COMPANIES.map((c) => <option key={c} value={c} className="bg-[#050816]">{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-indigo-300 mb-2 uppercase tracking-wider">Target Role</label>
                <div className="relative">
                  <Briefcase size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                    className="input-field pl-11" placeholder="SDE, Analyst..." />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-indigo-300 mb-2 uppercase tracking-wider">College</label>
                <div className="relative">
                  <GraduationCap size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })}
                    className="input-field pl-11" placeholder="Your college" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-indigo-300 mb-2 uppercase tracking-wider">Grad Year</label>
                <input type="number" value={form.graduation_year} onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
                  className="input-field" placeholder="2025" />
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
              {isLoading ? 'Creating account...' : <><span>Get Started</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-slate-500 text-sm">
              Already have an account?{' '}
              <a href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
