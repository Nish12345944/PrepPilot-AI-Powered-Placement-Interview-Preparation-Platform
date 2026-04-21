'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Clock, ChevronRight, CheckCircle, XCircle, Lightbulb } from 'lucide-react';

export default function InterviewSessionPage() {
  const { id: sessionId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const questions = JSON.parse(decodeURIComponent(searchParams.get('questions') || '[]'));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(questions[0]?.time_limit_sec || 300);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState<any>(null);
  const [startTime] = useState(Date.now());

  const currentQ = questions[currentIdx];

  // Countdown timer
  useEffect(() => {
    if (evaluation || sessionComplete) return;
    const timer = setInterval(() => {
      setTimeLeft((t: number) => {
        if (t <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIdx, evaluation]);

  const handleSubmit = useCallback(async () => {
    if (submitting || !answer.trim()) return;
    setSubmitting(true);
    try {
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const { data } = await api.post(`/interview/sessions/${sessionId}/respond`, {
        session_id: sessionId,
        question_id: currentQ.id,
        user_answer: answer,
        time_taken_sec: timeTaken,
        session_type: currentQ.type,
      });
      setEvaluation(data.evaluation);
    } catch {
      toast.error('Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  }, [answer, currentQ, sessionId, startTime, submitting]);

  const handleNext = async () => {
    if (currentIdx + 1 >= questions.length) {
      // Complete session
      try {
        const { data } = await api.post(`/interview/sessions/${sessionId}/complete`);
        setFinalFeedback(data.feedback);
        setSessionComplete(true);
      } catch {
        toast.error('Failed to complete session');
      }
    } else {
      setCurrentIdx((i) => i + 1);
      setAnswer('');
      setEvaluation(null);
      setShowHint(false);
      setTimeLeft(questions[currentIdx + 1]?.time_limit_sec || 300);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (sessionComplete && finalFeedback) {
    return <SessionResults feedback={finalFeedback} onDone={() => router.push('/dashboard')} />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm">Question {currentIdx + 1} of {questions.length}</span>
        <div className={`flex items-center gap-2 font-mono font-bold ${timeLeft < 60 ? 'text-red-400' : 'text-slate-300'}`}>
          <Clock size={16} />
          {formatTime(timeLeft)}
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-700 rounded-full">
        <div
          className="h-full bg-purple-500 rounded-full transition-all"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            currentQ?.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
            currentQ?.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {currentQ?.difficulty}
          </span>
          <span className="text-xs text-slate-500 capitalize">{currentQ?.type}</span>
        </div>
        <h2 className="text-white text-lg font-medium">{currentQ?.title}</h2>
        <p className="text-slate-300 mt-2 leading-relaxed">{currentQ?.description}</p>

        {/* Hint */}
        {currentQ?.hints?.length > 0 && !evaluation && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="mt-3 flex items-center gap-1 text-yellow-400 text-sm hover:text-yellow-300"
          >
            <Lightbulb size={14} /> {showHint ? 'Hide hint' : 'Show hint'}
          </button>
        )}
        {showHint && (
          <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-300 text-sm">
            {currentQ.hints[0]}
          </div>
        )}
      </div>

      {/* Answer area */}
      {!evaluation ? (
        <div className="space-y-3">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            rows={8}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !answer.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {submitting ? 'Evaluating...' : 'Submit Answer'}
          </button>
        </div>
      ) : (
        <EvaluationCard evaluation={evaluation} userAnswer={answer} onNext={handleNext} isLast={currentIdx + 1 >= questions.length} />
      )}
    </div>
  );
}

function EvaluationCard({ evaluation, userAnswer, onNext, isLast }: any) {
  const scoreColor = evaluation.score >= 70 ? 'text-green-400' : evaluation.score >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {evaluation.is_correct
              ? <CheckCircle className="text-green-400" size={22} />
              : <XCircle className="text-red-400" size={22} />}
            <span className="text-white font-medium">{evaluation.is_correct ? 'Correct!' : 'Needs Improvement'}</span>
          </div>
          <span className={`text-2xl font-bold ${scoreColor}`}>{Math.round(evaluation.score)}/100</span>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Accuracy', val: evaluation.accuracy },
            { label: 'Clarity', val: evaluation.clarity },
            { label: 'Structure', val: evaluation.structure },
          ].map(({ label, val }) => (
            <div key={label} className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-white font-semibold">{Math.round(val || 0)}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-700/40 rounded-lg p-4 mb-3">
          <p className="text-slate-400 text-xs mb-1">AI Feedback</p>
          <p className="text-slate-200 text-sm">{evaluation.feedback}</p>
        </div>

        {evaluation.optimized_answer && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400 text-xs mb-1 font-medium">Ideal Answer</p>
            <p className="text-slate-200 text-sm">{evaluation.optimized_answer}</p>
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {isLast ? 'View Results' : 'Next Question'}
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function SessionResults({ feedback, onDone }: any) {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-white text-center">Session Complete! 🎉</h1>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-4">
        <p className="text-slate-300">{feedback.overall_assessment}</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-green-400 font-medium mb-2">Strengths</p>
            <ul className="space-y-1">
              {feedback.strengths?.map((s: string, i: number) => (
                <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                  <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" /> {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-yellow-400 font-medium mb-2">Improve</p>
            <ul className="space-y-1">
              {feedback.areas_to_improve?.map((s: string, i: number) => (
                <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                  <ChevronRight size={14} className="text-yellow-400 mt-0.5 shrink-0" /> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {feedback.next_steps?.length > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
            <p className="text-purple-400 font-medium mb-2">Next Steps</p>
            <ul className="space-y-1">
              {feedback.next_steps.map((s: string, i: number) => (
                <li key={i} className="text-slate-300 text-sm">• {s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button onClick={onDone} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors">
        Back to Dashboard
      </button>
    </div>
  );
}
