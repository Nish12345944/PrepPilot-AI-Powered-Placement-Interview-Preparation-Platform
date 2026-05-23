'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import {
  Play, Send, CheckCircle, XCircle, Clock, ChevronRight,
  Lightbulb, AlertTriangle, RotateCcw, ChevronDown, ChevronUp,
} from 'lucide-react';

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];

const LANGUAGES: { id: string; label: string; monaco: string }[] = [
  { id: 'python',     label: 'Python',     monaco: 'python' },
  { id: 'java',       label: 'Java',       monaco: 'java' },
  { id: 'cpp',        label: 'C++',        monaco: 'cpp' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
];

const DEFAULT_STARTERS: Record<string, string> = {
  python:     '# Write your solution here\n',
  java:       'import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) throws Exception {\n        // Write your solution here\n    }\n}\n',
  cpp:        '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
  javascript: '// Write your solution here\n',
};

type TestResult = {
  case_id: string | null;
  passed: boolean;
  output: string | null;
  expected: string | null;
  error: string | null;
  time_ms: number;
  is_hidden: boolean;
};

type JudgeResult = {
  status: string;
  passed: number;
  total: number;
  test_results: TestResult[];
  runtime_ms: number;
  compile_error: string | null;
  ai_feedback: {
    time_complexity?: string;
    space_complexity?: string;
    suggestions?: string[];
    optimized_code?: string | null;
  } | null;
};

const diffColor = (d: string) =>
  d === 'easy' ? 'text-green-400' : d === 'medium' ? 'text-yellow-400' : 'text-red-400';
const diffBg = (d: string) =>
  d === 'easy' ? 'bg-green-500/20 text-green-400' : d === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400';
const statusColor = (s: string) =>
  s === 'accepted' ? 'text-green-400' : s === 'compile_error' ? 'text-orange-400' : 'text-red-400';

export default function CodingPage() {
  const [problems, setProblems]     = useState<any[]>([]);
  const [selected, setSelected]     = useState<any>(null);
  const [code, setCode]             = useState('');
  const [language, setLanguage]     = useState('python');
  const [result, setResult]         = useState<JudgeResult | null>(null);
  const [running, setRunning]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter]         = useState({ difficulty: 'all' });
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<'description' | 'submissions'>('description');
  const [resultTab, setResultTab]   = useState(0);
  const [hint, setHint]             = useState<{ hint: string; approach_name?: string } | null>(null);
  const [hintLevel, setHintLevel]   = useState(1);
  const [hintLoading, setHintLoading] = useState(false);
  const [showHint, setShowHint]     = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.difficulty !== 'all') params.set('difficulty', filter.difficulty);
    setLoading(true);
    api.get(`/coding/problems?${params}`)
      .then((r) => setProblems(r.data))
      .catch(() => setProblems([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const selectProblem = async (p: any) => {
    const { data } = await api.get(`/coding/problems/${p.id}`);
    setSelected(data);
    setCode(data.starter_code?.[language] || DEFAULT_STARTERS[language]);
    setResult(null);
    setHint(null);
    setHintLevel(1);
    setShowHint(false);
    setActiveTab('description');
    setResultTab(0);
  };

  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    if (selected) {
      setCode(selected.starter_code?.[lang] || DEFAULT_STARTERS[lang]);
    }
    setResult(null);
  };

  const resetCode = () => {
    if (selected) setCode(selected.starter_code?.[language] || DEFAULT_STARTERS[language]);
  };

  const runCode = async (submitAll = false) => {
    if (!selected || !code.trim()) return;
    submitAll ? setSubmitting(true) : setRunning(true);
    try {
      const { data } = await api.post('/coding/submit', {
        problem_id: selected.id,
        language,
        code,
      });
      setResult(data);
      setResultTab(0);
      setShowHint(false);
      if (data.status === 'accepted') {
        toast.success('All test cases passed! 🎉');
      } else if (data.status === 'compile_error') {
        toast.error('Compilation error — check the output panel');
      } else {
        toast.error(`${data.passed}/${data.total} test cases passed`);
      }
    } catch {
      toast.error('Submission failed');
    } finally {
      setRunning(false);
      setSubmitting(false);
    }
  };

  const fetchHint = async () => {
    if (!selected) return;
    setHintLoading(true);
    const wrongCases = result?.test_results?.filter((r) => !r.passed && !r.is_hidden).slice(0, 3) || [];
    try {
      const { data } = await api.post('/coding/hint', {
        problem_id: selected.id,
        code,
        language,
        error: result?.compile_error || result?.test_results?.find((r) => r.error)?.error || null,
        wrong_cases: wrongCases,
        hint_level: hintLevel,
      });
      setHint(data);
      setShowHint(true);
    } catch {
      toast.error('Could not fetch hint');
    } finally {
      setHintLoading(false);
    }
  };

  const loadSubmissions = async () => {
    if (!selected) return;
    const { data } = await api.get(`/coding/problems/${selected.id}/submissions`);
    setSubmissions(data);
    setActiveTab('submissions');
  };

  const visibleResults = result?.test_results?.filter((r) => !r.is_hidden) || [];

  return (
    <div className="h-[calc(100vh-64px)] flex gap-0 overflow-hidden bg-slate-950">
      {/* ── Problem List ─────────────────────────────────────────── */}
      <div className="w-64 flex flex-col border-r border-slate-800 overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex gap-1 flex-wrap">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setFilter({ difficulty: d })}
              className={`px-2 py-0.5 rounded text-xs capitalize transition-colors ${
                filter.difficulty === d ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center text-slate-500 text-sm">Loading...</div>
          ) : problems.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-500 text-sm px-4 text-center">No problems found</div>
          ) : (
            problems.map((p, i) => (
              <button
                key={p.id}
                onClick={() => selectProblem(p)}
                className={`w-full text-left px-4 py-3 border-b border-slate-800/60 transition-colors ${
                  selected?.id === p.id ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs w-5">{i + 1}.</span>
                  {p.user_status === 'accepted'
                    ? <CheckCircle size={12} className="text-green-400 shrink-0" />
                    : <div className="w-3 h-3 rounded-full border border-slate-600 shrink-0" />}
                  <span className="text-slate-200 text-sm truncate">{p.title}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 pl-7">
                  <span className={`text-xs ${diffColor(p.difficulty)}`}>{p.difficulty}</span>
                  <span className="text-slate-600 text-xs">{p.topic_name}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Main Area ────────────────────────────────────────────── */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-3">
          <ChevronRight size={40} />
          <p className="text-lg">Select a problem to start</p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Problem Description Panel */}
          <div className="w-[380px] flex flex-col border-r border-slate-800 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-800">
              {(['description', 'submissions'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => tab === 'submissions' ? loadSubmissions() : setActiveTab('description')}
                  className={`px-4 py-2.5 text-sm capitalize transition-colors ${
                    activeTab === tab ? 'text-white border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'description' ? (
                <div className="space-y-4">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${diffBg(selected.difficulty)}`}>
                      {selected.difficulty}
                    </span>
                    <h2 className="text-white font-semibold text-lg mt-2">{selected.title}</h2>
                    {selected.topic_name && (
                      <span className="text-slate-500 text-xs">{selected.topic_name}</span>
                    )}
                  </div>

                  <div className="text-slate-300 text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{selected.description}</ReactMarkdown>
                  </div>

                  {selected.examples?.map((ex: any, i: number) => (
                    <div key={i} className="bg-slate-800/60 rounded-lg p-3 space-y-1">
                      <p className="text-slate-400 text-xs font-medium">Example {i + 1}</p>
                      <p className="text-slate-300 text-xs font-mono bg-slate-900/60 rounded px-2 py-1">
                        <span className="text-slate-500">Input: </span>{ex.input}
                      </p>
                      <p className="text-slate-300 text-xs font-mono bg-slate-900/60 rounded px-2 py-1">
                        <span className="text-slate-500">Output: </span>{ex.output}
                      </p>
                      {ex.explanation && <p className="text-slate-400 text-xs">{ex.explanation}</p>}
                    </div>
                  ))}

                  {selected.constraints && (
                    <div>
                      <p className="text-slate-400 text-xs font-medium mb-1">Constraints</p>
                      <pre className="text-slate-300 text-xs font-mono bg-slate-800/60 rounded p-3 whitespace-pre-wrap">
                        {selected.constraints}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {submissions.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center mt-8">No submissions yet</p>
                  ) : (
                    submissions.map((s: any) => (
                      <div key={s.id} className="bg-slate-800/60 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <span className={`text-sm font-medium capitalize ${
                            s.status === 'accepted' ? 'text-green-400' : 'text-red-400'
                          }`}>{s.status?.replace(/_/g, ' ')}</span>
                          <p className="text-slate-500 text-xs mt-0.5">{s.language} · {s.runtime_ms}ms</p>
                        </div>
                        <span className="text-slate-600 text-xs">
                          {new Date(s.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Editor + Results Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
              <div className="flex gap-1">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => changeLanguage(l.id)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      language === l.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetCode}
                  title="Reset to starter code"
                  className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => runCode(false)}
                  disabled={running || submitting}
                  className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                >
                  <Play size={12} />
                  {running ? 'Running...' : 'Run'}
                </button>
                <button
                  onClick={() => runCode(true)}
                  disabled={running || submitting}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                >
                  <Send size={12} />
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language={LANGUAGES.find((l) => l.id === language)?.monaco || 'python'}
                value={code}
                onChange={(v) => setCode(v || '')}
                onMount={(editor) => { editorRef.current = editor; }}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  tabSize: language === 'python' ? 4 : 2,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  bracketPairColorization: { enabled: true },
                  padding: { top: 12 },
                }}
              />
            </div>

            {/* Results Panel */}
            {result && (
              <div className="h-56 border-t border-slate-800 bg-slate-900 flex flex-col overflow-hidden">
                {/* Status bar */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800">
                  {result.status === 'accepted'
                    ? <CheckCircle size={16} className="text-green-400" />
                    : result.status === 'compile_error'
                    ? <AlertTriangle size={16} className="text-orange-400" />
                    : <XCircle size={16} className="text-red-400" />}
                  <span className={`text-sm font-medium capitalize ${statusColor(result.status)}`}>
                    {result.status.replace(/_/g, ' ')}
                  </span>
                  {result.status !== 'compile_error' && (
                    <span className="text-slate-500 text-xs">
                      {result.passed}/{result.total} passed
                    </span>
                  )}
                  {result.runtime_ms > 0 && (
                    <span className="text-slate-500 text-xs flex items-center gap-1 ml-auto">
                      <Clock size={11} /> {result.runtime_ms}ms
                    </span>
                  )}
                  {/* Hint button */}
                  {result.status !== 'accepted' && (
                    <button
                      onClick={() => {
                        if (showHint) { setShowHint(false); return; }
                        fetchHint();
                      }}
                      disabled={hintLoading}
                      className="ml-2 flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                      <Lightbulb size={13} />
                      {hintLoading ? 'Thinking...' : showHint ? 'Hide hint' : `Hint (lvl ${hintLevel})`}
                    </button>
                  )}
                  {result.status !== 'accepted' && !showHint && (
                    <div className="flex gap-1">
                      {[1, 2, 3].map((l) => (
                        <button
                          key={l}
                          onClick={() => setHintLevel(l)}
                          className={`w-5 h-5 rounded text-xs transition-colors ${
                            hintLevel === l ? 'bg-yellow-500/30 text-yellow-400' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-hidden flex">
                  {/* Compile error */}
                  {result.compile_error ? (
                    <div className="flex-1 overflow-y-auto p-4">
                      <p className="text-orange-400 text-xs font-medium mb-2">Compilation Error</p>
                      <pre className="text-red-300 text-xs font-mono whitespace-pre-wrap bg-red-500/5 rounded p-3 border border-red-500/20">
                        {result.compile_error}
                      </pre>
                    </div>
                  ) : showHint && hint ? (
                    /* Hint panel */
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb size={14} className="text-yellow-400" />
                        <span className="text-yellow-400 text-xs font-medium">
                          {hint.approach_name ? `Hint — ${hint.approach_name}` : `Hint (Level ${hintLevel})`}
                        </span>
                        {hintLevel < 3 && (
                          <button
                            onClick={() => { setHintLevel(hintLevel + 1); setHint(null); }}
                            className="ml-auto text-xs text-slate-500 hover:text-slate-300"
                          >
                            Need more help →
                          </button>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{hint.hint}</p>
                    </div>
                  ) : (
                    /* Test case tabs + detail */
                    <div className="flex-1 flex overflow-hidden">
                      {/* Case tabs */}
                      <div className="w-28 border-r border-slate-800 overflow-y-auto py-2">
                        {visibleResults.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => setResultTab(i)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                              resultTab === i ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {r.passed
                              ? <CheckCircle size={11} className="text-green-400 shrink-0" />
                              : <XCircle size={11} className="text-red-400 shrink-0" />}
                            Case {i + 1}
                          </button>
                        ))}
                        {/* AI feedback tab */}
                        {result.ai_feedback && (
                          <button
                            onClick={() => setResultTab(visibleResults.length)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                              resultTab === visibleResults.length ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <Lightbulb size={11} className="text-purple-400 shrink-0" />
                            Analysis
                          </button>
                        )}
                      </div>

                      {/* Case detail */}
                      <div className="flex-1 overflow-y-auto p-4 text-xs font-mono space-y-3">
                        {resultTab < visibleResults.length ? (
                          (() => {
                            const r = visibleResults[resultTab];
                            return (
                              <>
                                {r.error && (
                                  <div>
                                    <p className="text-red-400 font-sans font-medium mb-1">Error</p>
                                    <pre className="text-red-300 bg-red-500/5 border border-red-500/20 rounded p-2 whitespace-pre-wrap">{r.error}</pre>
                                  </div>
                                )}
                                {r.output !== null && (
                                  <div>
                                    <p className="text-slate-400 font-sans mb-1">Your Output</p>
                                    <pre className={`rounded p-2 whitespace-pre-wrap ${r.passed ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                                      {r.output || '(empty)'}
                                    </pre>
                                  </div>
                                )}
                                {r.expected !== null && !r.passed && (
                                  <div>
                                    <p className="text-slate-400 font-sans mb-1">Expected</p>
                                    <pre className="bg-slate-800 text-slate-300 rounded p-2 whitespace-pre-wrap">{r.expected}</pre>
                                  </div>
                                )}
                                <p className="text-slate-600 font-sans">Runtime: {r.time_ms}ms</p>
                              </>
                            );
                          })()
                        ) : (
                          /* AI Analysis tab */
                          result.ai_feedback && (
                            <div className="space-y-3 font-sans">
                              <div className="flex gap-4">
                                <div className="bg-slate-800 rounded px-3 py-2">
                                  <p className="text-slate-500 text-xs">Time</p>
                                  <p className="text-yellow-400 font-medium">{result.ai_feedback.time_complexity || 'N/A'}</p>
                                </div>
                                <div className="bg-slate-800 rounded px-3 py-2">
                                  <p className="text-slate-500 text-xs">Space</p>
                                  <p className="text-blue-400 font-medium">{result.ai_feedback.space_complexity || 'N/A'}</p>
                                </div>
                              </div>
                              {result.ai_feedback.suggestions?.map((s, i) => (
                                <div key={i} className="flex gap-2 text-slate-300 text-sm">
                                  <span className="text-purple-400 shrink-0">•</span>
                                  <span>{s}</span>
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
