'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import { Play, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const LANGUAGES = ['python', 'javascript'];
const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];

export default function CodingPage() {
  const [problems, setProblems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState({ difficulty: 'all', topic: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.difficulty !== 'all') params.set('difficulty', filter.difficulty);
    if (filter.topic) params.set('topic', filter.topic);
    api.get(`/coding/problems?${params}`).then((r) => setProblems(r.data));
  }, [filter]);

  const selectProblem = async (p: any) => {
    const { data } = await api.get(`/coding/problems/${p.id}`);
    setSelected(data);
    setCode(data.starter_code?.[language] || `# Write your solution here\n`);
    setResult(null);
  };

  const runCode = async () => {
    if (!selected || !code.trim()) return;
    setRunning(true);
    try {
      const { data } = await api.post('/coding/submit', {
        problem_id: selected.id,
        language,
        code,
      });
      setResult(data);
      if (data.status === 'accepted') toast.success('All test cases passed! 🎉');
    } catch {
      toast.error('Submission failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex gap-4">
      {/* Problem List */}
      <div className="w-72 flex flex-col gap-3 overflow-hidden">
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setFilter({ ...filter, difficulty: d })}
              className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                filter.difficulty === d ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {problems.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProblem(p)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selected?.id === p.id
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-sm font-medium truncate">{p.title}</span>
                {p.user_status === 'accepted' && <CheckCircle size={14} className="text-green-400 shrink-0" />}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${
                  p.difficulty === 'easy' ? 'text-green-400' :
                  p.difficulty === 'medium' ? 'text-yellow-400' : 'text-red-400'
                }`}>{p.difficulty}</span>
                <span className="text-slate-500 text-xs">{p.topic_name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          Select a problem to start coding
        </div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Problem Description */}
          <div className="w-80 overflow-y-auto bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selected.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                  selected.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>{selected.difficulty}</span>
              </div>
              <h2 className="text-white font-semibold">{selected.title}</h2>
            </div>

            <div className="text-slate-300 text-sm leading-relaxed">
              <ReactMarkdown>{selected.description}</ReactMarkdown>
            </div>

            {selected.constraints && (
              <div>
                <p className="text-slate-400 text-xs font-medium mb-1">Constraints</p>
                <p className="text-slate-300 text-xs font-mono">{selected.constraints}</p>
              </div>
            )}

            {selected.examples?.map((ex: any, i: number) => (
              <div key={i} className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Example {i + 1}</p>
                <p className="text-slate-300 text-xs font-mono">Input: {ex.input}</p>
                <p className="text-slate-300 text-xs font-mono">Output: {ex.output}</p>
                {ex.explanation && <p className="text-slate-400 text-xs mt-1">{ex.explanation}</p>}
              </div>
            ))}
          </div>

          {/* Editor + Results */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setCode(selected.starter_code?.[e.target.value] || '');
                }}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm"
              >
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <button
                onClick={runCode}
                disabled={running}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Play size={14} />
                {running ? 'Running...' : 'Run & Submit'}
              </button>
            </div>

            <div className="flex-1 rounded-xl overflow-hidden border border-slate-700">
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={(v) => setCode(v || '')}
                theme="vs-dark"
                options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false }}
              />
            </div>

            {/* Results */}
            {result && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 max-h-48 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  {result.status === 'accepted'
                    ? <CheckCircle className="text-green-400" size={18} />
                    : <XCircle className="text-red-400" size={18} />}
                  <span className={`font-medium capitalize ${result.status === 'accepted' ? 'text-green-400' : 'text-red-400'}`}>
                    {result.status?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-400 text-sm ml-auto">
                    {result.passed}/{result.total} tests passed
                  </span>
                </div>

                {result.ai_feedback && (
                  <div className="text-slate-300 text-xs space-y-1">
                    <p>Time: <span className="text-yellow-400">{result.ai_feedback.time_complexity}</span></p>
                    <p>Space: <span className="text-blue-400">{result.ai_feedback.space_complexity}</span></p>
                    {result.ai_feedback.suggestions?.map((s: string, i: number) => (
                      <p key={i} className="text-slate-400">• {s}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
