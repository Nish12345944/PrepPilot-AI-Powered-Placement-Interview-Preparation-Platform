'use client';
import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Upload, FileText, AlertCircle, TrendingUp, History, RefreshCw } from 'lucide-react';

export default function ResumePage() {
  const [resume, setResume] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [jd, setJd] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState<'analyze' | 'history'>('analyze');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/resume/analyses').then(({ data }) => setHistory(data)).catch(() => {});
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('resume', file);
    try {
      const { data } = await api.post('/resume/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResume(data);
      toast.success('Resume uploaded & parsed successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!resume?.id || !jd.trim()) return;
    setAnalyzing(true);
    try {
      const { data } = await api.post('/resume/analyze', {
        resume_id: resume.id,
        job_description: jd,
      });
      setAnalysis(data);
      // Refresh history
      const { data: hist } = await api.get('/resume/analyses');
      setHistory(hist);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const scoreColor = (s: number) => s >= 70 ? 'text-green-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400';
  const scoreBar = (s: number) => s >= 70 ? 'bg-green-500' : s >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const fitBadge = (fit: string) => {
    const map: Record<string, string> = {
      excellent: 'bg-green-500/20 text-green-300 border-green-500/30',
      good: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      fair: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      poor: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return map[fit] || map.fair;
  };

  const AnalysisResult = ({ data }: { data: any }) => (
    <div className="space-y-5">
      {/* ATS Score */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">ATS Score</h3>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${fitBadge(data.overall_fit)}`}>
              {data.overall_fit}
            </span>
            <span className={`text-4xl font-bold ${scoreColor(data.ats_score)}`}>
              {Math.round(data.ats_score)}%
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${scoreBar(data.ats_score)}`}
            style={{ width: `${data.ats_score}%` }}
          />
        </div>
      </div>

      {/* Section Scores */}
      {data.section_scores && Object.keys(data.section_scores).length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-medium mb-4">Section Scores</h3>
          <div className="space-y-3">
            {Object.entries(data.section_scores).map(([section, score]: any) => (
              <div key={section} className="flex items-center gap-3">
                <span className="text-slate-300 text-sm capitalize w-24 shrink-0">{section}</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${scoreBar(score)}`} style={{ width: `${score}%` }} />
                </div>
                <span className={`text-sm font-medium w-10 text-right ${scoreColor(score)}`}>{score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Matched Keywords', items: data.keyword_matches?.matched, colorClass: 'green' },
          { label: 'Missing Keywords', items: data.keyword_matches?.missing, colorClass: 'red' },
          { label: 'Suggested to Add', items: data.keyword_matches?.suggested, colorClass: 'yellow' },
        ].map(({ label, items, colorClass }) => (
          <div key={label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <h4 className={`text-${colorClass}-400 font-medium text-sm mb-3`}>{label}</h4>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {(items || []).length > 0
                ? (items as string[]).map((kw) => (
                    <span
                      key={kw}
                      className={`text-xs px-2 py-0.5 rounded-full bg-${colorClass}-500/10 text-${colorClass}-300 border border-${colorClass}-500/20`}
                    >
                      {kw}
                    </span>
                  ))
                : <p className="text-slate-500 text-xs">None</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Improvements */}
      {(data.improvements || []).length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-purple-400" /> Improvement Suggestions
          </h3>
          <div className="space-y-3">
            {data.improvements.map((imp: any, i: number) => (
              <div key={i} className="flex gap-3 bg-slate-700/40 rounded-lg p-3">
                <AlertCircle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200 text-sm font-medium capitalize">{imp.section}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{imp.issue}</p>
                  <p className="text-purple-300 text-xs mt-1">→ {imp.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">ATS Resume Analyzer</h1>
        <p className="text-slate-400 mt-1">Upload your resume and compare it against a job description</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-lg p-1 w-fit">
        {(['analyze', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize flex items-center gap-1.5 ${
              tab === t ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'history' && <History size={14} />}
            {t}
          </button>
        ))}
      </div>

      {tab === 'analyze' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="text-white font-medium">Your Resume</h3>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-600 hover:border-purple-500 rounded-xl p-8 text-center cursor-pointer transition-colors"
              >
                <Upload size={32} className="text-slate-400 mx-auto mb-3" />
                <p className="text-slate-300 text-sm">Click to upload PDF or DOCX</p>
                <p className="text-slate-500 text-xs mt-1">Max 5MB</p>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleUpload} className="hidden" />
              </div>

              {uploading && (
                <div className="flex items-center gap-2 text-purple-400 text-sm justify-center">
                  <RefreshCw size={14} className="animate-spin" /> Parsing resume...
                </div>
              )}

              {resume && (
                <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <FileText size={20} className="text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-300 text-sm font-medium">Resume uploaded</p>
                    {resume.parsed_data?.skills?.length > 0 && (
                      <p className="text-slate-400 text-xs mt-1">
                        Skills detected: {resume.parsed_data.skills.slice(0, 6).join(', ')}
                        {resume.parsed_data.skills.length > 6 && ` +${resume.parsed_data.skills.length - 6} more`}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* JD Input */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="text-white font-medium">Job Description</h3>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job description here..."
                rows={8}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
              />
              <button
                onClick={handleAnalyze}
                disabled={!resume?.id || !jd.trim() || analyzing}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {analyzing && <RefreshCw size={14} className="animate-spin" />}
                {analyzing ? 'Analyzing...' : 'Analyze Resume'}
              </button>
              {!resume && (
                <p className="text-slate-500 text-xs text-center">Upload a resume first to enable analysis</p>
              )}
            </div>
          </div>

          {analysis && <AnalysisResult data={analysis} />}
        </>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-10 text-center">
              <History size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No analyses yet. Upload a resume and run an analysis.</p>
            </div>
          ) : (
            history.map((h: any) => (
              <div key={h.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 text-xs">{new Date(h.analyzed_at).toLocaleString()}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${fitBadge(h.overall_fit || 'fair')}`}>
                      {h.overall_fit || 'N/A'}
                    </span>
                    <span className={`text-lg font-bold ${scoreColor(h.ats_score)}`}>
                      {Math.round(h.ats_score)}%
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-sm line-clamp-2">{h.job_description}</p>
                {h.keyword_matches?.matched?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {h.keyword_matches.matched.slice(0, 8).map((kw: string) => (
                      <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/20">
                        {kw}
                      </span>
                    ))}
                    {h.keyword_matches.matched.length > 8 && (
                      <span className="text-xs text-slate-500">+{h.keyword_matches.matched.length - 8} more</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
