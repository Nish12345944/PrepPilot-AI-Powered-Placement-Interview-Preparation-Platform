-- ============================================================
-- PrepPilot Database Schema
-- PostgreSQL 15+
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for embeddings

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('student', 'admin', 'mentor');
CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE interview_type AS ENUM ('technical', 'hr', 'aptitude', 'coding', 'system_design');
CREATE TYPE question_type AS ENUM ('mcq', 'coding', 'subjective', 'behavioral');
CREATE TYPE session_status AS ENUM ('pending', 'active', 'completed', 'abandoned');
CREATE TYPE plan_status AS ENUM ('pending', 'completed', 'skipped', 'rescheduled');
CREATE TYPE badge_type AS ENUM ('streak', 'accuracy', 'speed', 'completion', 'special');

-- ============================================================
-- USERS & AUTH
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    role            user_role DEFAULT 'student',
    is_verified     BOOLEAN DEFAULT FALSE,
    target_company  VARCHAR(100),
    target_role     VARCHAR(100),
    experience_level VARCHAR(20) DEFAULT 'fresher', -- fresher, 0-2, 2-5, 5+
    college         VARCHAR(255),
    graduation_year INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_profiles (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio             TEXT,
    linkedin_url    TEXT,
    github_url      TEXT,
    skills          TEXT[],          -- ['Python', 'React', 'SQL']
    weak_topics     TEXT[],
    strong_topics   TEXT[],
    current_streak  INTEGER DEFAULT 0,
    longest_streak  INTEGER DEFAULT 0,
    total_xp        INTEGER DEFAULT 0,
    level           INTEGER DEFAULT 1,
    last_active     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUESTIONS BANK
-- ============================================================
CREATE TABLE topics (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    category    VARCHAR(100) NOT NULL, -- DSA, OS, DBMS, HR, Aptitude
    parent_id   INTEGER REFERENCES topics(id),
    description TEXT
);

CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id        INTEGER REFERENCES topics(id),
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    type            question_type NOT NULL,
    difficulty      difficulty NOT NULL,
    company_tags    TEXT[],          -- ['Amazon', 'Google', 'TCS']
    role_tags       TEXT[],          -- ['SDE', 'Data Analyst']
    options         JSONB,           -- for MCQ: [{text, is_correct}]
    correct_answer  TEXT,
    explanation     TEXT,
    hints           TEXT[],
    time_limit_sec  INTEGER DEFAULT 300,
    xp_reward       INTEGER DEFAULT 10,
    embedding       vector(1536),    -- for semantic search
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coding_problems (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id     UUID REFERENCES questions(id) ON DELETE CASCADE,
    starter_code    JSONB,           -- {python: '...', java: '...', cpp: '...'}
    test_cases      JSONB NOT NULL,  -- [{input, expected_output, is_hidden}]
    constraints     TEXT,
    examples        JSONB,           -- [{input, output, explanation}]
    solution_code   JSONB,           -- reference solutions
    time_complexity VARCHAR(50),
    space_complexity VARCHAR(50)
);

-- ============================================================
-- INTERVIEW SESSIONS
-- ============================================================
CREATE TABLE interview_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type    interview_type NOT NULL,
    company_target  VARCHAR(100),
    status          session_status DEFAULT 'pending',
    is_strict_mode  BOOLEAN DEFAULT FALSE,
    total_questions INTEGER DEFAULT 0,
    score           DECIMAL(5,2),
    ai_feedback     JSONB,           -- overall session feedback
    duration_sec    INTEGER,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE interview_responses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id),
    user_answer     TEXT,
    audio_url       TEXT,            -- for voice responses
    is_correct      BOOLEAN,
    score           DECIMAL(5,2),   -- 0-100
    time_taken_sec  INTEGER,
    ai_evaluation   JSONB,          -- {accuracy, clarity, structure, keywords_matched, feedback}
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CODING SUBMISSIONS
-- ============================================================
CREATE TABLE code_submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id      UUID NOT NULL REFERENCES coding_problems(id),
    language        VARCHAR(30) NOT NULL,
    code            TEXT NOT NULL,
    status          VARCHAR(30),     -- accepted, wrong_answer, tle, runtime_error
    test_results    JSONB,           -- [{case_id, passed, output, expected, time_ms}]
    runtime_ms      INTEGER,
    memory_kb       INTEGER,
    ai_feedback     JSONB,           -- {complexity_analysis, suggestions, optimized_code}
    submitted_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADAPTIVE LEARNING ENGINE
-- ============================================================
CREATE TABLE user_performance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id        INTEGER NOT NULL REFERENCES topics(id),
    attempts        INTEGER DEFAULT 0,
    correct         INTEGER DEFAULT 0,
    avg_time_sec    DECIMAL(8,2),
    mastery_score   DECIMAL(5,2) DEFAULT 0, -- 0-100, computed by AI
    last_attempted  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

CREATE TABLE learning_paths (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    target_company  VARCHAR(100),
    target_date     DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE learning_path_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path_id         UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    topic_id        INTEGER REFERENCES topics(id),
    question_id     UUID REFERENCES questions(id),
    order_index     INTEGER NOT NULL,
    is_completed    BOOLEAN DEFAULT FALSE,
    recommended_by  VARCHAR(50) DEFAULT 'ai', -- ai, manual
    completed_at    TIMESTAMPTZ
);

-- ============================================================
-- STUDY MATERIALS
-- ============================================================
CREATE TABLE study_materials (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    topic_id        INTEGER REFERENCES topics(id),
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    material_type   VARCHAR(50),     -- notes, flashcards, revision_plan, cheatsheet
    is_ai_generated BOOLEAN DEFAULT TRUE,
    company_target  VARCHAR(100),
    embedding       vector(1536),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DAILY PLANNER
-- ============================================================
CREATE TABLE daily_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date       DATE NOT NULL,
    total_tasks     INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    ai_generated    BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, plan_date)
);

CREATE TABLE plan_tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id         UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    task_type       VARCHAR(50),     -- practice, revision, mock_interview, reading
    topic_id        INTEGER REFERENCES topics(id),
    question_id     UUID REFERENCES questions(id),
    duration_min    INTEGER DEFAULT 30,
    status          plan_status DEFAULT 'pending',
    order_index     INTEGER NOT NULL,
    completed_at    TIMESTAMPTZ
);

-- ============================================================
-- RESUME ANALYZER
-- ============================================================
CREATE TABLE resumes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_url        TEXT NOT NULL,
    raw_text        TEXT,
    parsed_data     JSONB,           -- {skills, experience, education, projects}
    is_active       BOOLEAN DEFAULT TRUE,
    uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resume_analyses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id       UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_description TEXT,
    ats_score       DECIMAL(5,2),
    keyword_matches JSONB,           -- {matched: [], missing: [], suggested: []}
    section_scores  JSONB,           -- {skills: 80, experience: 70, ...}
    improvements    JSONB,           -- [{section, issue, suggestion}]
    analyzed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GAMIFICATION
-- ============================================================
CREATE TABLE badges (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url    TEXT,
    type        badge_type NOT NULL,
    criteria    JSONB NOT NULL      -- {metric, threshold, condition}
);

CREATE TABLE user_badges (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id    INTEGER NOT NULL REFERENCES badges(id),
    earned_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

CREATE TABLE xp_transactions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      INTEGER NOT NULL,
    reason      VARCHAR(255) NOT NULL,
    reference_id UUID,              -- session_id, submission_id, etc.
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leaderboard_snapshots (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period      VARCHAR(20) NOT NULL, -- weekly, monthly, all_time
    rank        INTEGER NOT NULL,
    xp          INTEGER NOT NULL,
    snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    body        TEXT NOT NULL,
    type        VARCHAR(50),         -- reminder, achievement, suggestion, alert
    is_read     BOOLEAN DEFAULT FALSE,
    metadata    JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI COPILOT CHAT
-- ============================================================
CREATE TABLE chat_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL, -- user, assistant
    content     TEXT NOT NULL,
    metadata    JSONB,               -- {intent, tokens_used, model}
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMPANY PREP
-- ============================================================
CREATE TABLE companies (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    logo_url    TEXT,
    description TEXT,
    difficulty  difficulty DEFAULT 'medium',
    rounds      JSONB,               -- [{name, type, duration_min}]
    focus_areas TEXT[]
);

CREATE TABLE company_questions (
    company_id  INTEGER NOT NULL REFERENCES companies(id),
    question_id UUID NOT NULL REFERENCES questions(id),
    frequency   INTEGER DEFAULT 1,  -- how often asked
    PRIMARY KEY (company_id, question_id)
);

-- ============================================================
-- PORTFOLIO / GITHUB ANALYZER
-- ============================================================
CREATE TABLE portfolio_analyses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_url      TEXT,
    repo_data       JSONB,           -- parsed repo info
    analysis_result JSONB,           -- {strengths, weaknesses, suggestions, score}
    analyzed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_company ON questions USING GIN(company_tags);
CREATE INDEX idx_interview_sessions_user ON interview_sessions(user_id);
CREATE INDEX idx_code_submissions_user ON code_submissions(user_id);
CREATE INDEX idx_user_performance_user ON user_performance(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_xp_transactions_user ON xp_transactions(user_id);

-- Vector similarity search index
CREATE INDEX idx_questions_embedding ON questions USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_materials_embedding ON study_materials USING ivfflat (embedding vector_cosine_ops);

-- ============================================================
-- SEED: Topics
-- ============================================================
INSERT INTO topics (name, category) VALUES
('Arrays', 'DSA'), ('Linked Lists', 'DSA'), ('Trees', 'DSA'),
('Graphs', 'DSA'), ('Dynamic Programming', 'DSA'), ('Sorting', 'DSA'),
('Hashing', 'DSA'), ('Recursion', 'DSA'), ('Stacks & Queues', 'DSA'),
('Binary Search', 'DSA'), ('Operating Systems', 'CS Core'),
('DBMS', 'CS Core'), ('Computer Networks', 'CS Core'),
('OOP Concepts', 'CS Core'), ('System Design', 'Advanced'),
('Behavioral Questions', 'HR'), ('Aptitude - Quant', 'Aptitude'),
('Aptitude - Logical', 'Aptitude'), ('Aptitude - Verbal', 'Aptitude');

INSERT INTO companies (name, difficulty, rounds, focus_areas) VALUES
('Amazon', 'hard', '[{"name":"Online Assessment","type":"coding"},{"name":"Technical","type":"technical"},{"name":"Bar Raiser","type":"behavioral"}]', ARRAY['DSA','System Design','Leadership Principles']),
('TCS', 'easy', '[{"name":"Aptitude","type":"aptitude"},{"name":"Technical","type":"technical"},{"name":"HR","type":"hr"}]', ARRAY['Aptitude','OOP','DBMS']),
('Infosys', 'easy', '[{"name":"Hackathon","type":"coding"},{"name":"Technical","type":"technical"},{"name":"HR","type":"hr"}]', ARRAY['Aptitude','Programming Basics']),
('Google', 'hard', '[{"name":"Phone Screen","type":"coding"},{"name":"Onsite x4","type":"technical"},{"name":"Hiring Committee","type":"behavioral"}]', ARRAY['DSA','System Design','Algorithms']),
('Microsoft', 'hard', '[{"name":"Online Assessment","type":"coding"},{"name":"Technical x3","type":"technical"},{"name":"As Appropriate","type":"behavioral"}]', ARRAY['DSA','OOP','System Design']);

INSERT INTO badges (name, description, type, criteria) VALUES
('First Blood', 'Complete your first interview', 'completion', '{"metric":"interviews_completed","threshold":1}'),
('7-Day Streak', 'Practice 7 days in a row', 'streak', '{"metric":"current_streak","threshold":7}'),
('Code Ninja', 'Solve 50 coding problems', 'completion', '{"metric":"problems_solved","threshold":50}'),
('Sharp Shooter', 'Achieve 90%+ accuracy in a session', 'accuracy', '{"metric":"session_accuracy","threshold":90}'),
('Speed Demon', 'Solve a hard problem in under 10 minutes', 'speed', '{"metric":"hard_problem_time","threshold":600}');
