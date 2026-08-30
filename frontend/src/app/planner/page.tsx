'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Calendar, CheckCircle, Circle, Clock, Sparkles, RefreshCw, BookOpen, Code2, Mic, FileText } from 'lucide-react';

const TASK_ICONS: Record<string, any> = {
  practice: Code2,
  revision: BookOpen,
  mock_interview: Mic,
  reading: FileText,
};

const TASK_COLORS: Record<string, string> = {
  practice:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
  revision:      'text-purple-400 bg-purple-500/10 border-purple-500/20',
  mock_interview:'text-orange-400 bg-orange-500/10 border-orange-500/20',
  reading:       'text-green-400 bg-green-500/10 border-green-500/20',
};

export default function PlannerPage() {
  const [plan, setPlan]       = useState<any>(null);
  const [tasks, setTasks]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchPlan(); }, []);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/planner/today');
      if (data) { setPlan(data.plan); setTasks(data.tasks); }
      else { setPlan(null); setTasks([]); }
    } catch {
      toast.error('Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/planner/generate');
      setPlan(data.plan);
      setTasks(data.tasks || []);
      toast.success(data.already_existed ? "Today's plan already exists" : 'Daily plan generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  };

  const setTaskStatus = async (task: any, newStatus: 'pending' | 'completed' | 'skipped') => {
    try {
      const { data } = await api.patch(`/planner/tasks/${task.id}`, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...data } : t)));
    } catch {
      toast.error('Failed to update task');
    }
  };

  const toggleTask = (task: any) => {
    setTaskStatus(task, task.status === 'completed' ? 'pending' : 'completed');
  };

  const completed = tasks.filter((t) => t.status === 'completed').length;
  const activeTasks = tasks.filter((t) => t.status !== 'skipped').length;
  const progress  = activeTasks ? Math.round((completed / activeTasks) * 100) : 100;
  const today     = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-24 bg-slate-800 rounded-xl" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-800 rounded-xl" />)}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar size={24} className="text-purple-400" /> Daily Planner
          </h1>
          <p className="text-slate-400 text-sm mt-1">{today}</p>
        </div>
        <button
          onClick={generatePlan}
          disabled={generating}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          {generating
            ? <><RefreshCw size={15} className="animate-spin" /> Generating...</>
            : <><Sparkles size={15} /> {plan ? 'Regenerate' : 'Generate Plan'}</>}
        </button>
      </div>

      {!plan ? (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-12 text-center space-y-4">
          <Sparkles size={40} className="text-purple-400 mx-auto" />
          <p className="text-white font-semibold text-lg">No plan for today yet</p>
          <p className="text-slate-400 text-sm">Click "Generate Plan" to get an AI-personalized study schedule based on your weak topics and goals.</p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">Today's Progress</span>
              <span className="text-slate-400 text-sm">{completed}/{activeTasks} tasks</span>
            </div>
            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-slate-400 text-xs mt-2">{progress}% complete</p>
          </div>

          {/* Tasks */}
          <div className="space-y-3">
            {tasks.map((task) => {
              const Icon = TASK_ICONS[task.task_type] || BookOpen;
              const colorClass = TASK_COLORS[task.task_type] || 'text-slate-400 bg-slate-500/10 border-slate-500/20';
              const done = task.status === 'completed';
              const skipped = task.status === 'skipped';
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task)}
                  role="checkbox"
                  aria-checked={done}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleTask(task);
                    }
                  }}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-indigo-400 outline-none ${
                    done
                      ? 'bg-slate-800/30 border-slate-700/50 opacity-60'
                      : skipped
                      ? 'bg-slate-800/20 border-slate-800 opacity-50'
                      : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {done
                    ? <CheckCircle size={22} className="text-green-400 shrink-0 mt-0.5" />
                    : <Circle size={22} className="text-slate-500 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${done || skipped ? 'line-through text-slate-500' : 'text-white'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
                        <Icon size={11} /> {task.task_type?.replace('_', ' ')}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500 text-xs">
                        <Clock size={11} /> {task.duration_min} min
                      </span>
                      {skipped && (
                        <span className="text-slate-500 text-xs italic">skipped</span>
                      )}
                    </div>
                  </div>
                  {!done && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskStatus(task, skipped ? 'pending' : 'skipped');
                      }}
                      aria-label={skipped ? `Mark "${task.title}" as pending` : `Skip "${task.title}"`}
                      className="shrink-0 text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 outline-none"
                    >
                      {skipped ? 'Undo' : 'Skip'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {progress === 100 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
              <p className="text-green-400 font-semibold">🎉 All tasks completed! Great work today!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
