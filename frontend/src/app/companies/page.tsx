'use client';
import { useState } from 'react';
import { Building2, Users, IndianRupee, ChevronDown, ChevronUp, CheckCircle, Clock, Search } from 'lucide-react';

const COMPANIES = [
  {
    name: 'Think41',
    logo: 'T4',
    color: '#6366f1',
    type: 'Product / AI',
    description: 'Think41 is an AI-first product engineering company building intelligent software solutions. Known for strong engineering culture, cutting-edge AI/ML work, and early ownership for freshers.',
    roles: ['Software Engineer', 'AI/ML Engineer', 'Full Stack Developer'],
    package: { min: 8, max: 14, avg: 10 },
    intake: '10–20',
    bond: 'None',
    eligibility: '60%+ throughout, 2024/2025 batch',
    process: [
      { step: 'Online Assessment', desc: 'Aptitude + 2 DSA coding problems (90 min)' },
      { step: 'Technical Round 1', desc: 'DSA, problem solving, time & space complexity' },
      { step: 'Technical Round 2', desc: 'System design basics, project deep-dive' },
      { step: 'HR Round', desc: 'Culture fit, communication, career goals' },
    ],
    focus: ['DSA', 'System Design', 'Python / JS', 'AI/ML basics'],
  },
  {
    name: 'Deloitte',
    logo: 'D',
    color: '#86efac',
    type: 'Consulting / Big 4',
    description: 'Deloitte is one of the Big 4 consulting firms offering technology, consulting, and audit services globally. Strong brand for career growth, global exposure, and structured learning paths.',
    roles: ['Analyst', 'Business Technology Analyst', 'Consultant'],
    package: { min: 6, max: 9, avg: 7.5 },
    intake: '60–120',
    bond: 'None',
    eligibility: '60%+ throughout, no active backlogs',
    process: [
      { step: 'Online Assessment', desc: 'Aptitude, verbal, logical reasoning (60 min)' },
      { step: 'Group Discussion', desc: 'Topic-based GD — communication & leadership assessed' },
      { step: 'Technical Interview', desc: 'Core CS, SQL, basic coding, domain knowledge' },
      { step: 'HR Interview', desc: 'Behavioral questions, STAR method, fitment' },
    ],
    focus: ['Aptitude', 'Communication', 'SQL', 'Core CS', 'GD skills'],
  },
  {
    name: 'EPAM Systems',
    logo: 'EP',
    color: '#67e8f9',
    type: 'Product Engineering',
    description: 'EPAM is a global product engineering and digital transformation company. Known for strong technical culture, global project exposure, and excellent learning & development programs.',
    roles: ['Junior Software Engineer', 'Software Engineer Trainee'],
    package: { min: 7, max: 12, avg: 9 },
    intake: '30–60',
    bond: 'None',
    eligibility: '65%+ throughout, CS/IT/ECE preferred',
    process: [
      { step: 'English Assessment', desc: 'Written English proficiency test' },
      { step: 'Coding Assessment', desc: '3 DSA problems on HackerRank (90 min)' },
      { step: 'Technical Interview 1', desc: 'OOP, data structures, algorithms, language fundamentals' },
      { step: 'Technical Interview 2', desc: 'Advanced DSA, system thinking, code review' },
      { step: 'HR Discussion', desc: 'Motivation, team fit, relocation preferences' },
    ],
    focus: ['DSA', 'OOP', 'Java / Python', 'English communication'],
  },
  {
    name: 'EXL Service',
    logo: 'EX',
    color: '#fbbf24',
    type: 'Analytics / BPO',
    description: 'EXL is a leading analytics and digital operations company. Strong in data analytics, insurance, healthcare, and financial services. Good entry point for analytics-focused careers.',
    roles: ['Analyst', 'Data Analyst', 'Operations Analyst', 'Software Developer'],
    package: { min: 4.5, max: 7, avg: 5.5 },
    intake: '40–80',
    bond: 'None',
    eligibility: '60%+ throughout, all branches',
    process: [
      { step: 'Online Test', desc: 'Quantitative aptitude, logical reasoning, verbal ability' },
      { step: 'Technical Round', desc: 'SQL, Excel, basic analytics, Python basics' },
      { step: 'Case Study Round', desc: 'Business case analysis (for analytics roles)' },
      { step: 'HR Round', desc: 'Behavioral, situational questions' },
    ],
    focus: ['SQL', 'Analytics', 'Aptitude', 'Excel', 'Python basics'],
  },
  {
    name: 'TUDIP Technologies',
    logo: 'TU',
    color: '#a78bfa',
    type: 'IT Services / Product',
    description: 'TUDIP is a Pune-based software company focused on product development, IoT, and cloud solutions. Known for good work culture, early responsibility, and close-knit team environment.',
    roles: ['Software Engineer', 'Full Stack Developer', 'QA Engineer'],
    package: { min: 4, max: 6, avg: 4.5 },
    intake: '5–15',
    bond: 'None',
    eligibility: '60%+ throughout, 2024/2025 batch',
    process: [
      { step: 'Aptitude Test', desc: 'Basic aptitude and logical reasoning (45 min)' },
      { step: 'Coding Round', desc: '2 coding problems — arrays, strings, basic logic' },
      { step: 'Technical Interview', desc: 'Core CS, OOP, project discussion, web basics' },
      { step: 'HR Round', desc: 'Communication, attitude, career goals' },
    ],
    focus: ['Core CS', 'OOP', 'Web basics', 'DSA fundamentals'],
  },
  {
    name: 'Cognizant',
    logo: 'CG',
    color: '#34d399',
    type: 'IT Services',
    description: 'Cognizant is a Fortune 500 IT services company and one of the largest campus recruiters in India. Offers multiple hiring tracks (GenC, GenC Pro, GenC Elevate) with varying packages.',
    roles: ['Programmer Analyst Trainee', 'GenC', 'GenC Pro', 'GenC Elevate'],
    package: { min: 4, max: 9, avg: 5.5 },
    intake: '100–250',
    bond: 'None',
    eligibility: '60%+ throughout, no active backlogs',
    process: [
      { step: 'AMCAT / Cognizant Test', desc: 'Aptitude, reasoning, English, coding (90 min)' },
      { step: 'Coding Test', desc: '2 coding problems for GenC Pro/Elevate tracks' },
      { step: 'Technical Interview', desc: 'Core CS, DBMS, OS, OOP, project discussion' },
      { step: 'HR Interview', desc: 'Behavioral, communication, relocation' },
    ],
    focus: ['Aptitude', 'Core CS', 'DBMS', 'OOP', 'Communication'],
  },
  {
    name: 'Infosys',
    logo: 'IN',
    color: '#60a5fa',
    type: 'IT Services',
    description: 'Infosys is a global IT giant and one of India\'s top campus recruiters. Offers roles across software engineering, consulting, and digital transformation with strong training programs.',
    roles: ['Systems Engineer', 'Digital Specialist Engineer', 'Power Programmer'],
    package: { min: 3.6, max: 9, avg: 5 },
    intake: '150–400',
    bond: 'None',
    eligibility: '65%+ throughout, no active backlogs',
    process: [
      { step: 'InfyTQ / HackWithInfy', desc: 'Online platform test — aptitude + coding' },
      { step: 'Aptitude Test', desc: 'Quantitative, logical, verbal (on-campus)' },
      { step: 'Technical Interview', desc: 'Core CS, OOP, DBMS, project discussion' },
      { step: 'HR Interview', desc: 'Communication, attitude, flexibility' },
    ],
    focus: ['Aptitude', 'Core CS', 'OOP', 'DBMS', 'Communication'],
  },
  {
    name: 'Accenture',
    logo: 'AC',
    color: '#f472b6',
    type: 'IT Consulting',
    description: 'Accenture is a global professional services company with capabilities in digital, cloud, and security. One of the largest campus recruiters worldwide with multiple role tracks.',
    roles: ['Associate Software Engineer', 'Advanced App Engineering Analyst', 'Packaged App Dev Analyst'],
    package: { min: 4.5, max: 9, avg: 6.5 },
    intake: '200–500',
    bond: 'None',
    eligibility: '60%+ throughout, all branches',
    process: [
      { step: 'Cognitive & Technical Assessment', desc: 'Aptitude, abstract reasoning, common sense (75 min)' },
      { step: 'Coding Assessment', desc: '2 coding problems — easy to medium difficulty' },
      { step: 'Communication Assessment', desc: 'Spoken English evaluation (automated)' },
      { step: 'HR Interview', desc: 'Behavioral, situational, career goals' },
    ],
    focus: ['Aptitude', 'Coding basics', 'Communication', 'Reasoning'],
  },
  {
    name: 'TCS',
    logo: 'TC',
    color: '#818cf8',
    type: 'IT Services',
    description: 'Tata Consultancy Services is India\'s largest IT company and the biggest campus recruiter. Offers multiple hiring tracks based on NQT performance — Ninja, Digital, and Prime.',
    roles: ['Ninja (NQT)', 'Digital (NQT)', 'Prime (CodeVita)', 'BPS'],
    package: { min: 3.36, max: 9, avg: 4.5 },
    intake: '200–600',
    bond: 'None',
    eligibility: '60%+ throughout, no active backlogs',
    process: [
      { step: 'TCS NQT', desc: 'National Qualifier Test — aptitude, reasoning, verbal, coding' },
      { step: 'Coding Round', desc: '1–2 coding problems (for Digital/Prime tracks)' },
      { step: 'Technical Interview', desc: 'Core CS, OOP, DBMS, project discussion' },
      { step: 'Managerial Round', desc: 'Problem solving, situational questions' },
      { step: 'HR Round', desc: 'Communication, relocation, bond agreement' },
    ],
    focus: ['TCS NQT prep', 'Aptitude', 'Core CS', 'OOP', 'DBMS'],
  },
  {
    name: 'LTIMindtree',
    logo: 'LM',
    color: '#fb923c',
    type: 'IT Services',
    description: 'LTIMindtree (merger of L&T Infotech and Mindtree) is a global technology company offering digital transformation services. Known for good work culture and competitive packages.',
    roles: ['Graduate Engineer Trainee', 'Software Engineer'],
    package: { min: 5, max: 8, avg: 6.5 },
    intake: '80–180',
    bond: 'None',
    eligibility: '60%+ throughout, no active backlogs',
    process: [
      { step: 'Online Assessment', desc: 'Aptitude, logical, verbal, coding (90 min)' },
      { step: 'Coding Round', desc: '2 DSA problems — easy to medium' },
      { step: 'Technical Interview', desc: 'DSA, OOP, DBMS, OS, project discussion' },
      { step: 'HR Interview', desc: 'Behavioral, communication, relocation' },
    ],
    focus: ['DSA', 'Core CS', 'OOP', 'DBMS', 'Aptitude'],
  },
  {
    name: 'PwC',
    logo: 'PW',
    color: '#e879f9',
    type: 'Consulting / Big 4',
    description: 'PricewaterhouseCoopers is a Big 4 firm offering assurance, advisory, and technology consulting. Strong brand for finance + tech hybrid roles with excellent global exposure.',
    roles: ['Technology Consultant', 'Associate', 'Digital Solutions Analyst'],
    package: { min: 6, max: 10, avg: 8 },
    intake: '20–50',
    bond: 'None',
    eligibility: '65%+ throughout, CS/IT/Commerce preferred',
    process: [
      { step: 'Online Assessment', desc: 'Aptitude, situational judgment, verbal reasoning' },
      { step: 'Group Discussion', desc: 'Business/tech topic GD — communication & leadership' },
      { step: 'Technical Interview', desc: 'Domain knowledge, SQL, basic tech concepts' },
      { step: 'Partner / HR Interview', desc: 'Case study, behavioral, culture fit' },
    ],
    focus: ['Aptitude', 'Communication', 'GD skills', 'SQL', 'Business acumen'],
  },
  {
    name: 'Cisco',
    logo: 'CI',
    color: '#22d3ee',
    type: 'Networking / Product',
    description: 'Cisco is a global leader in networking, cybersecurity, and cloud solutions. Highly competitive campus hiring with a strong technical bar, excellent packages, and world-class projects.',
    roles: ['Software Engineer', 'Network Engineer', 'Technical Marketing Engineer'],
    package: { min: 16, max: 24, avg: 20 },
    intake: '5–15',
    bond: 'None',
    eligibility: '70%+ throughout, CS/IT/ECE branches',
    process: [
      { step: 'Online Assessment', desc: 'DSA + networking fundamentals (90 min)' },
      { step: 'Technical Round 1', desc: 'DSA, algorithms, OS, networking concepts' },
      { step: 'Technical Round 2', desc: 'System design, advanced DSA, project deep-dive' },
      { step: 'Technical Round 3', desc: 'Architecture, problem solving, domain expertise' },
      { step: 'HR Round', desc: 'Culture fit, communication, career vision' },
    ],
    focus: ['DSA', 'Networking (CN)', 'OS', 'System Design', 'C / C++'],
  },
  {
    name: 'Wipro',
    logo: 'WI',
    color: '#4ade80',
    type: 'IT Services',
    description: 'Wipro is a leading global IT company offering technology services and consulting. One of the top mass recruiters with multiple hiring tracks — Elite, Turbo, and Project Engineer.',
    roles: ['Project Engineer', 'Elite (NLTH)', 'Turbo'],
    package: { min: 3.5, max: 7, avg: 4.5 },
    intake: '100–250',
    bond: 'None',
    eligibility: '60%+ throughout, no active backlogs',
    process: [
      { step: 'NLTH / Elite Test', desc: 'Aptitude, verbal, logical, coding (90 min)' },
      { step: 'Coding Round', desc: '2 coding problems for Elite/Turbo tracks' },
      { step: 'Technical Interview', desc: 'Core CS, OOP, DBMS, project discussion' },
      { step: 'HR Interview', desc: 'Communication, relocation, behavioral' },
    ],
    focus: ['Aptitude', 'Core CS', 'OOP', 'DBMS', 'Communication'],
  },
  {
    name: 'Capgemini',
    logo: 'CA',
    color: '#f87171',
    type: 'IT Consulting',
    description: 'Capgemini is a global IT and consulting company. Known for large-scale campus hiring, strong training programs (Capgemini University), and diverse project exposure across domains.',
    roles: ['Analyst', 'Senior Analyst', 'Associate Consultant'],
    package: { min: 4, max: 7.5, avg: 5 },
    intake: '80–200',
    bond: 'None',
    eligibility: '60%+ throughout, all branches',
    process: [
      { step: 'Game-Based Assessment', desc: 'Cognitive ability via gamified tests (30 min)' },
      { step: 'Technical + Aptitude Test', desc: 'Core CS, aptitude, pseudocode, reasoning' },
      { step: 'Technical Interview', desc: 'OOP, DBMS, OS, project discussion, coding basics' },
      { step: 'HR Interview', desc: 'Behavioral, communication, career goals' },
    ],
    focus: ['Aptitude', 'Core CS', 'OOP', 'Communication', 'Pseudocode'],
  },
];

const TYPE_COLORS: Record<string, string> = {
  'Product / AI':         'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  'Consulting / Big 4':   'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  'Product Engineering':  'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
  'Analytics / BPO':      'bg-amber-500/15 text-amber-300 border-amber-500/25',
  'IT Services / Product':'bg-violet-500/15 text-violet-300 border-violet-500/25',
  'IT Services':          'bg-blue-500/15 text-blue-300 border-blue-500/25',
  'IT Consulting':        'bg-pink-500/15 text-pink-300 border-pink-500/25',
  'Networking / Product': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
};

const ALL_TYPES = ['All', ...Array.from(new Set(COMPANIES.map((c) => c.type)))];

export default function CompaniesPage() {
  const [search, setSearch]     = useState('');
  const [typeFilter, setType]   = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = COMPANIES.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.roles.some(r => r.toLowerCase().includes(q))) &&
      (typeFilter === 'All' || c.type === typeFilter)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">Company Placement Guide</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Campus drive process, packages &amp; prep tips for {COMPANIES.length} top companies
        </p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, type or role..."
            className="input-field pl-10 w-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ALL_TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                typeFilter === t
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Companies Listed', value: COMPANIES.length, icon: Building2, color: '#6366f1' },
          { label: 'Avg Max Package',  value: `₹${Math.round(COMPANIES.reduce((a, c) => a + c.package.max, 0) / COMPANIES.length)}L`, icon: IndianRupee, color: '#10b981' },
          { label: 'Total Intake / yr', value: '1,500+', icon: Users, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-white font-bold text-lg">{value}</p>
              <p className="text-slate-400 text-xs">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Company Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center text-slate-500">No companies match your search.</div>
        )}

        {filtered.map((company) => {
          const isOpen = expanded === company.name;
          return (
            <div key={company.name} className="glass rounded-2xl overflow-hidden transition-all duration-200"
              style={{ border: isOpen ? `1px solid ${company.color}45` : undefined }}>

              {/* Header row */}
              <button
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(isOpen ? null : company.name)}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: `linear-gradient(135deg, ${company.color}35, ${company.color}15)`, border: `1px solid ${company.color}40` }}>
                  {company.logo}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-white font-bold text-base">{company.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[company.type] || 'bg-slate-500/15 text-slate-300 border-slate-500/25'}`}>
                      {company.type}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1 truncate">{company.description.slice(0, 95)}...</p>
                </div>

                <div className="hidden sm:flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color: company.color }}>
                      ₹{company.package.min}–{company.package.max}L
                    </p>
                    <p className="text-slate-500 text-xs">Package</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">{company.intake}</p>
                    <p className="text-slate-500 text-xs">Intake / yr</p>
                  </div>
                </div>

                <div className="shrink-0 ml-2 text-slate-400">
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-5 pb-6 space-y-6 border-t" style={{ borderColor: `${company.color}20` }}>

                  {/* Description + quick stats */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-5">
                    <div className="lg:col-span-2 space-y-3">
                      <p className="text-slate-300 text-sm leading-relaxed">{company.description}</p>
                      <div>
                        <p className="text-slate-500 text-xs mb-2 uppercase tracking-wider">Roles Offered</p>
                        <div className="flex flex-wrap gap-2">
                          {company.roles.map((r) => (
                            <span key={r} className="text-xs px-2.5 py-1 rounded-lg text-slate-300"
                              style={{ background: `${company.color}15`, border: `1px solid ${company.color}25` }}>
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="glass rounded-xl p-4 space-y-3" style={{ border: `1px solid ${company.color}20` }}>
                      {[
                        { label: 'Avg Package', value: `₹${company.package.avg}L` },
                        { label: 'Max Package', value: `₹${company.package.max}L` },
                        { label: 'Min Package', value: `₹${company.package.min}L` },
                        { label: 'Avg Intake',  value: `${company.intake} students` },
                        { label: 'Bond',        value: company.bond },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">{label}</span>
                          <span className="text-white font-semibold">{value}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t text-xs text-slate-500" style={{ borderColor: `${company.color}20` }}>
                        <span className="font-medium text-slate-400">Eligibility: </span>{company.eligibility}
                      </div>
                    </div>
                  </div>

                  {/* Placement Process */}
                  <div>
                    <h4 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                      <Clock size={14} style={{ color: company.color }} /> Campus Drive Process
                    </h4>
                    <div className="relative pl-2">
                      <div className="absolute left-5 top-3 bottom-3 w-px"
                        style={{ background: `linear-gradient(to bottom, ${company.color}60, transparent)` }} />
                      <div className="space-y-4">
                        {company.process.map((p, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 mt-0.5"
                              style={{ background: `${company.color}25`, border: `1px solid ${company.color}50`, color: company.color }}>
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-white text-sm font-semibold">{p.step}</p>
                              <p className="text-slate-400 text-xs mt-0.5">{p.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Focus Areas */}
                  <div>
                    <h4 className="text-white font-semibold text-sm mb-3">Key Areas to Prepare</h4>
                    <div className="flex flex-wrap gap-2">
                      {company.focus.map((f) => (
                        <span key={f} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium"
                          style={{ background: `${company.color}12`, border: `1px solid ${company.color}30`, color: company.color }}>
                          <CheckCircle size={11} /> {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
