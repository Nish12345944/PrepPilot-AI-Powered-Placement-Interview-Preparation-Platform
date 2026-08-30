import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'PrepPilot – AI-Powered Placement Preparation',
  description:
    'Ace your campus placements with Gemini-powered mock interviews, adaptive learning, coding practice, daily planning, and ATS resume analysis.',
  keywords: ['placement preparation', 'mock interview', 'AI interview practice', 'ATS resume checker', 'DSA practice', 'campus placement'],
  openGraph: {
    title: 'PrepPilot – AI-Powered Placement Preparation',
    description: 'Ace your campus placements with AI mock interviews, adaptive learning, coding practice, and ATS resume analysis.',
    type: 'website',
    siteName: 'PrepPilot',
  },
};

const features = [
  {
    icon: '🎙️',
    title: 'AI Mock Interviews',
    desc: 'Practice technical, HR, and aptitude rounds with Gemini AI evaluation — get scored on accuracy, clarity, and structure.',
  },
  {
    icon: '💻',
    title: 'Coding Practice',
    desc: 'Solve DSA problems with a built-in code editor and instant judge. Get AI feedback on complexity and optimizations.',
  },
  {
    icon: '🧠',
    title: 'Adaptive Learning',
    desc: 'The engine tracks your weak topics and serves personalized questions to maximize your mastery score.',
  },
  {
    icon: '📄',
    title: 'ATS Resume Analyzer',
    desc: 'Upload your resume and a job description. Get an ATS score, keyword gaps, and section-by-section improvements.',
  },
  {
    icon: '🤖',
    title: 'AI Copilot',
    desc: 'Ask anything — from "explain recursion" to "how do I prepare for Amazon in 2 weeks". Context-aware answers.',
  },
  {
    icon: '📅',
    title: 'Daily Study Planner',
    desc: 'AI generates a daily plan adjusted by your previous day\'s completion rate and upcoming interview dates.',
  },
];

const companies = ['Think41', 'Deloitte', 'EPAM Systems', 'EXL Service', 'Amazon', 'Microsoft'];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-2xl font-bold">PrepPilot</span>
        <div className="flex gap-3">
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm text-purple-300 hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 py-24 max-w-4xl mx-auto">
        <div className="inline-block bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
          AI-Powered · Free to Start
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
          Crack your placement
          <br />
          <span className="text-purple-400">with AI by your side</span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Mock interviews, adaptive DSA practice, ATS resume scoring, and a personal AI copilot —
          everything you need to land your dream job.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/register"
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-lg transition-colors"
          >
            Start Preparing Free →
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold text-lg transition-colors"
          >
            Log In
          </Link>
        </div>
        <p className="text-white/30 text-sm mt-6">No credit card required</p>
      </section>

      {/* Company targets */}
      <section className="text-center px-6 pb-16">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-wider">Prep for top companies</p>
        <div className="flex flex-wrap justify-center gap-3">
          {companies.map((c) => (
            <span
              key={c}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white/70"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need to get placed</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/40 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-6 py-20 border-t border-white/10">
        <h2 className="text-3xl font-bold mb-4">Ready to start?</h2>
        <p className="text-white/50 mb-8">Create a free account and start preparing smarter with AI.</p>
        <Link
          href="/auth/register"
          className="inline-block px-10 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-lg transition-colors"
        >
          Create Free Account →
        </Link>
      </section>

      {/* Footer */}
      <footer className="text-center px-6 py-8 border-t border-white/10 text-white/30 text-sm">
        © {new Date().getFullYear()} PrepPilot. Built with ❤️ for placement aspirants.
      </footer>
    </div>
  );
}
