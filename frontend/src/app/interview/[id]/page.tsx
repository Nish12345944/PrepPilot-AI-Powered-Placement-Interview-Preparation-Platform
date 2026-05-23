'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Clock, ChevronRight, CheckCircle, XCircle, Lightbulb,
  RefreshCw, Trophy, Target, BarChart2, ArrowLeft,
} from 'lucide-react';

type Phase = 'loading' | 'question' | 'evaluated' | 'completing' | 'results' | 'review';

const scoreColor = (s: number) => s >= 70 ? 'text-green-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400';
const scoreBar = (s: number) => s >= 70 ? 'bg-green-500' : s >= 50 ? 'bg-yellow-500' : 'bg-red-500';
const diffBadge = (d: string) => ({
  easy: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  hard: 'bg-red-500/20 text-red-400',
}[d] || 'bg-slate-500/20 text-slate-400');

export default function InterviewSessionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [responseMode, setResponseMode] = useState<'text' | 'audio_video'>('text');
  const [timeLeft, setTimeLeft] = useState(300);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [captureError, setCaptureError] = useState('');
  const [finalFeedback, setFinalFeedback] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [reviewResponses, setReviewResponses] = useState<any[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const submittedRef = useRef(false);
  const answerRef = useRef('');

  // Keep answerRef in sync for timer callback
  useEffect(() => { answerRef.current = answer; }, [answer]);

  // Load questions from sessionStorage or fetch completed session
  useEffect(() => {
    const stored = sessionStorage.getItem(`session_${sessionId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const qs = Array.isArray(parsed) ? parsed : parsed.questions || [];
        setQuestions(qs);
        setResponseMode(parsed.responseMode || 'text');
        setTimeLeft(qs[0]?.time_limit_sec || 300);
        setPhase('question');
        return;
      } catch {}
    }
    // No questions in storage — fetch session (review mode for completed)
    fetchSessionForReview();
  }, [sessionId]);

  const fetchSessionForReview = async () => {
    try {
      const { data } = await api.get(`/interview/sessions/${sessionId}`);
      setSessionData(data.session);
      setReviewResponses(data.responses || []);
      if (data.session.status === 'completed') {
        setFinalFeedback(data.session.ai_feedback || {});
        setPhase('review');
      } else {
        toast.error('Session data not found. Please start a new session.');
        router.push('/interview');
      }
    } catch {
      toast.error('Failed to load session');
      router.push('/interview');
    }
  };

  const getTranscriptionText = (data: any) => {
    if (!data) return '';
    if (typeof data === 'string') return data;
    return data.text || data.transcription || data.result || data.transcribed_text || '';
  };

  const cleanupMedia = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
    setMediaRecorder(null);
    setMediaStream(null);
  };

  const initializeMedia = async () => {
    setCaptureError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCaptureError('Your browser does not support media capture.');
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
      };

      setMediaStream(stream);
      setMediaRecorder(recorder);
      return { stream, recorder };
    } catch (err) {
      console.error(err);
      setCaptureError('Camera and microphone access is required for audio/video mode.');
      return null;
    }
  };

  const startRecording = async () => {
    let recorder = mediaRecorder;
    if (!recorder) {
      const initialized = await initializeMedia();
      if (!initialized) return;
      recorder = initialized.recorder;
    }
    if (!recorder) return;
    setRecordedBlob(null);
    setTranscript('');
    setAnswer('');
    setCaptureError('');
    try {
      recorder.start();
      setRecording(true);
      setMediaRecorder(recorder);
    } catch (err) {
      console.error(err);
      setCaptureError('Unable to start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    setRecording(false);
  };

  const retryRecording = () => {
    if (recording) {
      stopRecording();
    }
    cleanupMedia();
    setRecordedBlob(null);
    setTranscript('');
    setAnswer('');
    setCaptureError('');
    setRecording(false);
  };

  const handleUploadRecording = async () => {
    if (!recordedBlob) {
      toast.error('No recording available. Please record your response first.');
      return;
    }
    setTranscribing(true);
    setCaptureError('');

    try {
      const formData = new FormData();
      formData.append('audio', recordedBlob, 'response.webm');
      const { data } = await api.post('/interview/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const transcriptText = getTranscriptionText(data);
      if (!transcriptText) {
        setCaptureError('Transcription returned empty text. Please try again.');
      }
      setTranscript(transcriptText);
      setAnswer(transcriptText);
    } catch (err: any) {
      console.error(err);
      setCaptureError(err.response?.data?.error || 'Transcription failed.');
    } finally {
      setTranscribing(false);
    }
  };

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, [mediaRecorder, mediaStream]);

  // Timer
  useEffect(() => {
    if (phase !== 'question') return;
    submittedRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          if (!submittedRef.current) {
            submittedRef.current = true;
            if (responseMode === 'audio_video' && recording) {
              stopRecording();
            }
            submitAnswer(answerRef.current || '(No answer — time expired)');
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentIdx, responseMode, recording]);

  const submitAnswer = useCallback(async (ans: string) => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const currentQ = questions[currentIdx];
    try {
      const { data } = await api.post(`/interview/sessions/${sessionId}/respond`, {
        question_id: currentQ.id,
        user_answer: ans || '(No answer provided)',
        time_taken_sec: (currentQ.time_limit_sec || 300) - timeLeft,
        session_type: currentQ.type,
      });
      setEvaluation(data.evaluation);
      setPhase('evaluated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit answer');
      setPhase('question');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, questions, currentIdx, sessionId, timeLeft]);

  const handleSubmit = () => {
    if (!answer.trim()) {
      if (responseMode === 'audio_video') {
        toast.error('Please record and transcribe your response first');
      } else {
        toast.error('Please write an answer before submitting');
      }
      return;
    }
    submittedRef.current = true;
    submitAnswer(answer);
  };

  const handleNext = async () => {
    const isLast = currentIdx + 1 >= questions.length;
    if (isLast) {
      setPhase('completing');
      try {
        const { data } = await api.post(`/interview/sessions/${sessionId}/complete`);
        setFinalFeedback(data.feedback);
        setSessionData(data.session);
        sessionStorage.removeItem(`session_${sessionId}`);
        setPhase('results');
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to complete session');
        setPhase('evaluated');
      }
    } else {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      setAnswer('');
      setEvaluation(null);
      setShowHint(false);
      setTimeLeft(questions[next]?.time_limit_sec || 300);
      setPhase('question');
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
        <RefreshCw size={20} className="animate-spin" /> Loading session...
      </div>
    );
  }

  // ── Completing ───────────────────────────────────────────────────────────
  if (phase === 'completing') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <RefreshCw size={24} className="animate-spin text-purple-400" />
        <p className="text-white font-medium">Generating your session feedback...</p>
        <p className="text-slate-500 text-sm">This may take a few seconds</p>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────
  if (phase === 'results' && finalFeedback) {
    return <SessionResults feedback={finalFeedback} session={sessionData} onDone={() => router.push('/dashboard')} onReview={() => fetchSessionForReview()} />;
  }

  // ── Review (completed session) ───────────────────────────────────────────
  if (phase === 'review') {
    return <SessionReview session={sessionData} responses={reviewResponses} feedback={finalFeedback} onBack={() => router.push('/interview')} />;
  }

  const currentQ = questions[currentIdx];
  const progress = ((currentIdx + (phase === 'evaluated' ? 1 : 0)) / questions.length) * 100;

  // ── Active Session ───────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm">
            Question <span className="text-white font-medium">{currentIdx + 1}</span> of {questions.length}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diffBadge(currentQ?.difficulty)}`}>
            {currentQ?.difficulty}
          </span>
          <span className="text-xs text-slate-500 capitalize">{currentQ?.type}</span>
        </div>
        <div className={`flex items-center gap-1.5 font-mono font-bold text-sm px-3 py-1.5 rounded-lg ${
          timeLeft < 60 ? 'bg-red-500/20 text-red-400' : timeLeft < 120 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-300'
        }`}>
          <Clock size={14} />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
        <h2 className="text-white text-lg font-semibold leading-snug">{currentQ?.title}</h2>
        <p className="text-slate-300 mt-3 leading-relaxed text-sm">{currentQ?.description}</p>

        {currentQ?.hints?.length > 0 && phase === 'question' && (
          <div className="mt-4">
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center gap-1.5 text-yellow-400 text-sm hover:text-yellow-300 transition-colors"
            >
              <Lightbulb size={14} /> {showHint ? 'Hide hint' : 'Show hint'}
            </button>
            {showHint && (
              <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-300 text-sm">
                {currentQ.hints[0]}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Answer / Evaluation */}
      {phase === 'question' && (
        <div className="space-y-3">
          {responseMode === 'audio_video' ? (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-300 text-sm mb-3">Live preview</p>
                  <div className="relative overflow-hidden rounded-xl bg-black/80">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-72 w-full object-cover bg-slate-900"
                    />
                    {captureError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-red-300 p-4">
                        {captureError}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                    <p className="text-white text-sm font-medium mb-2">Speaking instructions</p>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Record your answer with audio and video, then transcribe it to send to the AI evaluator.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <button
                      onClick={startRecording}
                      disabled={recording}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl"
                    >
                      Start Recording
                    </button>
                    <button
                      onClick={stopRecording}
                      disabled={!recording}
                      className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl"
                    >
                      Stop Recording
                    </button>
                    <button
                      onClick={handleUploadRecording}
                      disabled={recording || !recordedBlob || transcribing}
                      className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl"
                    >
                      {transcribing ? 'Transcribing...' : 'Upload & Transcribe'}
                    </button>
                    <button
                      onClick={retryRecording}
                      className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl"
                    >
                      Retry Recording
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>{recording ? 'Recording...' : recordedBlob ? 'Recording ready' : 'No recording yet'}</span>
                  <span>{transcript ? 'Transcript available' : 'Transcript pending'}</span>
                </div>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={recordedBlob ? 'Edit your transcribed answer...' : 'Record and transcribe to see your answer here.'}
                  rows={8}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm leading-relaxed"
                  disabled={!recordedBlob && !transcribing}
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !answer.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  {submitting ? 'Evaluating with AI...' : 'Submit Answer'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={8}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm leading-relaxed"
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !answer.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting && <RefreshCw size={16} className="animate-spin" />}
                {submitting ? 'Evaluating with AI...' : 'Submit Answer'}
              </button>
            </>
          )}
        </div>
      )}

      {phase === 'evaluated' && evaluation && (
        <EvaluationCard
          evaluation={evaluation}
          onNext={handleNext}
          isLast={currentIdx + 1 >= questions.length}
        />
      )}
    </div>
  );
}

// ── Evaluation Card ───────────────────────────────────────────────────────────

function EvaluationCard({ evaluation, onNext, isLast }: { evaluation: any; onNext: () => void; isLast: boolean }) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
        {/* Score header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {evaluation.is_correct
              ? <CheckCircle className="text-green-400" size={22} />
              : <XCircle className="text-red-400" size={22} />}
            <span className="text-white font-semibold">
              {evaluation.is_correct ? 'Well done!' : 'Needs Improvement'}
            </span>
          </div>
          <span className={`text-3xl font-bold ${scoreColor(evaluation.score)}`}>
            {Math.round(evaluation.score)}<span className="text-lg text-slate-500">/100</span>
          </span>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Accuracy', val: evaluation.accuracy },
            { label: 'Clarity', val: evaluation.clarity },
            { label: 'Structure', val: evaluation.structure },
          ].map(({ label, val }) => (
            <div key={label} className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-slate-400 text-xs">{label}</p>
                <p className={`text-sm font-semibold ${scoreColor(val || 0)}`}>{Math.round(val || 0)}</p>
              </div>
              <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${scoreBar(val || 0)}`} style={{ width: `${val || 0}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Keywords */}
        {evaluation.keywords_matched?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {evaluation.keywords_matched.map((kw: string) => (
              <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20">
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Feedback */}
        <div className="bg-slate-700/40 rounded-lg p-4">
          <p className="text-slate-400 text-xs mb-1.5 font-medium">AI Feedback</p>
          <p className="text-slate-200 text-sm leading-relaxed">{evaluation.feedback}</p>
        </div>

        {/* Ideal answer */}
        {evaluation.optimized_answer && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400 text-xs mb-1.5 font-medium">Ideal Answer</p>
            <p className="text-slate-200 text-sm leading-relaxed">{evaluation.optimized_answer}</p>
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {isLast ? (
          <><Trophy size={18} /> View Results</>
        ) : (
          <>Next Question <ChevronRight size={18} /></>
        )}
      </button>
    </div>
  );
}

// ── Session Results ───────────────────────────────────────────────────────────

function SessionResults({ feedback, session, onDone, onReview }: any) {
  const score = session?.score ? Math.round(session.score) : 0;
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="text-center space-y-2">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold text-white">Session Complete!</h1>
        <p className={`text-4xl font-bold ${scoreColor(score)}`}>{score}<span className="text-xl text-slate-400">/100</span></p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-5">
        <p className="text-slate-300 leading-relaxed">{feedback.overall_assessment}</p>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="text-green-400 font-medium mb-3 flex items-center gap-1.5">
              <CheckCircle size={16} /> Strengths
            </p>
            <ul className="space-y-2">
              {(feedback.strengths || []).map((s: string, i: number) => (
                <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-green-400 mt-0.5 shrink-0">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-yellow-400 font-medium mb-3 flex items-center gap-1.5">
              <Target size={16} /> Improve
            </p>
            <ul className="space-y-2">
              {(feedback.areas_to_improve || []).map((s: string, i: number) => (
                <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5 shrink-0">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {feedback.recommended_topics?.length > 0 && (
          <div>
            <p className="text-purple-400 font-medium mb-2 text-sm">Recommended Topics</p>
            <div className="flex flex-wrap gap-2">
              {feedback.recommended_topics.map((t: string) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20">{t}</span>
              ))}
            </div>
          </div>
        )}

        {feedback.next_steps?.length > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
            <p className="text-purple-400 font-medium mb-2 text-sm">Next Steps</p>
            <ul className="space-y-1.5">
              {feedback.next_steps.map((s: string, i: number) => (
                <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                  <ChevronRight size={14} className="text-purple-400 mt-0.5 shrink-0" /> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onReview}
          className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <BarChart2 size={18} /> Review Answers
        </button>
        <button
          onClick={onDone}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

// ── Session Review ────────────────────────────────────────────────────────────

function SessionReview({ session, responses, feedback, onBack }: any) {
  const score = session?.score ? Math.round(session.score) : 0;
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white capitalize">
            {session?.session_type} Interview Review
          </h1>
          <p className="text-slate-400 text-sm">
            {session?.company_target} · Score: <span className={scoreColor(score)}>{score}/100</span>
          </p>
        </div>
      </div>

      {/* Overall feedback summary */}
      {feedback?.overall_assessment && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-300 text-sm leading-relaxed">{feedback.overall_assessment}</p>
        </div>
      )}

      {/* Per-question responses */}
      <div className="space-y-4">
        {responses.map((r: any, i: number) => {
          const eval_ = typeof r.ai_evaluation === 'string'
            ? JSON.parse(r.ai_evaluation || '{}')
            : r.ai_evaluation || {};
          return (
            <div key={r.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-500 text-xs">Q{i + 1}</span>
                    {r.difficulty && <span className={`text-xs px-1.5 py-0.5 rounded-full ${diffBadge(r.difficulty)}`}>{r.difficulty}</span>}
                  </div>
                  <p className="text-white font-medium text-sm">{r.title || `Question ${i + 1}`}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.is_correct
                    ? <CheckCircle size={16} className="text-green-400" />
                    : <XCircle size={16} className="text-red-400" />}
                  <span className={`font-bold ${scoreColor(r.score)}`}>{Math.round(r.score || 0)}</span>
                </div>
              </div>

              <div className="bg-slate-700/40 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Your Answer</p>
                <p className="text-slate-200 text-sm leading-relaxed">{r.user_answer}</p>
              </div>

              {eval_.feedback && (
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">AI Feedback</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{eval_.feedback}</p>
                </div>
              )}

              {eval_.optimized_answer && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-400 text-xs mb-1">Ideal Answer</p>
                  <p className="text-slate-200 text-sm leading-relaxed">{eval_.optimized_answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onBack}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Start New Interview
      </button>
    </div>
  );
}
