'use client';
import { useState, useRef } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

export default function ResumePage() {
  const [resume, setResume] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [jd, setJd] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      toast.success('Resume uploaded successfully');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resume || !jd.trim()) return;
    setAnalyzing(true);
    try {
      const { data } = await api.post('/resume/analyze', {
        resume_id: resume.id,
        job_description: jd,
      });
      setAnalysis(data);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Analysis failed';
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const scoreColor = (s: number) => s >= 70 ? 'text-green-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400';
  const scoreBar = (s: number) => s >= 70 ? 'bg-green-500' : s >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">ATS Resume Analyzer</h1>
        <p className="text-slate-400 mt-1">Upload your resume and compare it against a job description</p>
      </div>

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

          {uploading && <p className="text-purple-400 text-sm text-center">Parsing resume...</p>}

          {resume && (
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <FileText size={20} className="text-green-400" />
              <div>
                <p className="text-green-300 text-sm font-medium">Resume uploaded</p>
                {resume.parsed_data?.skills?.length > 0 && (
                  <p className="text-slate-400 text-xs mt-0.5">
                    Skills detected: {resume.parsed_data.skills.slice(0, 5).join(', ')}
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
            disabled={!resume || !jd.trim() || analyzing}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {analyzing ? 'Analyzing...' : 'Analyze Resume'}
          </button>
        </div>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-5">
          {/* ATS Score */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">ATS Score</h3>
              <span className={`text-4xl font-bold ${scoreColor(analysis.ats_score)}`}>
                {Math.round(analysis.ats_score)}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${scoreBar(analysis.ats_score)}`}
                style={{ width: `${analysis.ats_score}%` }}
              />
            </div>
            <p className="text-slate-400 text-sm mt-2">
              Overall fit: <span className="text-white capitalize">{analysis.overall_fit}</span>
            </p>
          </div>

          {/* Section Scores */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-medium mb-4">Section Scores</h3>
            <div className="space-y-3">
              {Object.entries(analysis.section_scores || {}).map(([section, score]: any) => (
                <div key={section} className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm capitalize w-24">{section}</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBar(score)}`} style={{ width: `${score}%` }} />
                  </div>
                  <span className={`text-sm font-medium w-10 text-right ${scoreColor(score)}`}>{score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { label: 'Matched Keywords', items: analysis.keyword_matches?.matched, color: 'green' },
              { label: 'Missing Keywords', items: analysis.keyword_matches?.missing, color: 'red' },
              { label: 'Suggested to Add', items: analysis.keyword_matches?.suggested, color: 'yellow' },
            ].map(({ label, items, color }) => (
              <div key={label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                <h4 className={`text-${color}-400 font-medium text-sm mb-3`}>{label}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(items || []).map((kw: string) => (
                    <span key={kw} className={`text-xs px-2 py-0.5 rounded-full bg-${color}-500/10 text-${color}-300 border border-${color}-500/20`}>
                      {kw}
                    </span>
                  ))}
                  {(!items || items.length === 0) && <p className="text-slate-500 text-xs">None</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Improvements */}
          {analysis.improvements?.length > 0 && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-purple-400" /> Improvement Suggestions
              </h3>
              <div className="space-y-3">
                {analysis.improvements.map((imp: any, i: number) => (
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
      )}
    </div>
  );
}
