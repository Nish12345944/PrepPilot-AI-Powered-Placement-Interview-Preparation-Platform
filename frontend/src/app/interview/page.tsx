'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Mic, FileText, Clock, Building2, Play } from 'lucide-react';

const SESSION_TYPES = [
  { value: 'technical', label: 'Technical', icon: FileText, desc: 'DSA, CS fundamentals, system design' },
  { value: 'hr', label: 'HR Round', icon: Mic, desc: 'Behavioral, situational, STAR method' },
  { value: 'aptitude', label: 'Aptitude', icon: Clock, desc: 'Quant, logical, verbal reasoning' },
  { value: 'coding', label: 'Coding', icon: FileText, desc: 'Live coding problems with AI feedback' },
];

const COMPANIES = ['Amazon', 'Google', 'Microsoft', 'TCS', 'Infosys', 'Wipro', 'General'];

export default function InterviewSetupPage() {
  const [config, setConfig] = useState({
    session_type: 'technical',
    company_target: 'General',
    is_strict_mode: false,
    question_count: 10,
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const startInterview = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/interview/sessions', config);
      router.push(`/interview/${data.session.id}?questions=${encodeURIComponent(JSON.stringify(data.questions))}`);
    } catch {
      toast.error('Failed to start interview');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mock Interview</h1>
        <p className="text-slate-400 mt-1">Configure your AI-powered interview session</p>
      </div>

      {/* Session Type */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-medium mb-4">Interview Type</h3>
        <div className="grid grid-cols-2 gap-3">
          {SESSION_TYPES.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => setConfig({ ...config, session_type: value })}
              className={`p-4 rounded-xl border text-left transition-all ${
                config.session_type === value
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-slate-600 bg-slate-700/40 hover:border-slate-500'
              }`}
            >
              <Icon size={20} className={config.session_type === value ? 'text-purple-400' : 'text-slate-400'} />
              <p className="text-white font-medium mt-2">{label}</p>
              <p className="text-slate-400 text-xs mt-1">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Company + Settings */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-white font-medium">Settings</h3>

        <div>
          <label className="block text-sm text-slate-400 mb-2">
            <Building2 size={14} className="inline mr-1" /> Target Company
          </label>
          <div className="flex flex-wrap gap-2">
            {COMPANIES.map((c) => (
              <button
                key={c}
                onClick={() => setConfig({ ...config, company_target: c })}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  config.company_target === c
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm">Questions</p>
            <p className="text-slate-400 text-xs">Number of questions in this session</p>
          </div>
          <select
            value={config.question_count}
            onChange={(e) => setConfig({ ...config, question_count: parseInt(e.target.value) })}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
          >
            {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} questions</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm">Strict Mode</p>
            <p className="text-slate-400 text-xs">Timer enforced, no hints allowed</p>
          </div>
          <button
            onClick={() => setConfig({ ...config, is_strict_mode: !config.is_strict_mode })}
            className={`w-12 h-6 rounded-full transition-colors ${config.is_strict_mode ? 'bg-purple-600' : 'bg-slate-600'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${config.is_strict_mode ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <button
        onClick={startInterview}
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        <Play size={20} />
        {loading ? 'Starting...' : 'Start Interview'}
      </button>
    </div>
  );
}
