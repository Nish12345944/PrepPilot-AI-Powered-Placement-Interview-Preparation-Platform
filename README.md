# PrepPilot — AI-Powered Placement & Interview Preparation Platform

PrepPilot is a production-grade, end-to-end placement preparation platform that uses Generative AI (LLMs) to deliver high-quality, personalized interview training, automated resume reviews, and adaptive coding practice. It is designed to empower candidates to prep for top-tier companies (FAANG, Big Tech, mid-tier, services) with real-time feedback loops.

## Features

- **Profile & Profile Customization**: Maintain your resume, bio, LinkedIn, GitHub links, target roles/companies, and track target skills.
- **AI-Powered Mock Interviews**: Live technical, HR, and aptitude mock sessions. Complete answers via text or speech, transcribed on-the-fly using Gemini's multimodal audio input, and evaluated with structured grading (factuality, clarity, structure).
- **Hardened Coding Playground**: Solve structured algorithmic problems in a Monaco-based Editor. Sandbox supports Python, JS, Java, and C++ with CPU/memory resource limits to mitigate abusive/untrusted scripts. Includes dynamic hints, runtime timing, and complex solution feedbacks.
- **Adaptive Learning Engine**: Dynamically ranks topic masteries. Recommends questions, study guides, and cheat sheets tailored specifically to your weak areas and target companies.
- **Daily Study Planner**: Automated daily plans mapping study resources, coding tasks, and mock sessions against your target company and available preparation schedule.
- **ATS Resume Analyzer**: Rigorous PDF and DOCX parsing with ATS scoring, keyword mapping (matched, missing, suggested), section grading, and improvement logs.
- **AI Career Copilot**: Context-aware chatbot trained on your profiles, resumes, learning tracks, and progress analytics to suggest tailored preparative material.
- **Gamification Engine**: Retain motivation with total XP tracking, dynamic levels (500 XP per level), consecutive streak logs, achievement badges (Task Master, Century Club, Sharp Shooter), and real-time level-up triggers.
- **Real-Time Notification Core**: WebSocket-driven notifications (Socket.IO) push prompt reminders, badge awards, and learning alerts to active sessions.

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Zustand, Monaco Editor, Recharts, Socket.IO Client.
- **Backend**: Node.js, Express, PostgreSQL, Redis, Socket.IO Server, rate limiters, security sandboxing.
- **AI Microservices**: FastAPI, Google Gemini (Gemini 2.5 Flash-Lite for LLM, Gemini Embedding 001 for embeddings) via the official `google-genai` SDK, Python-docx, PyPDF2, scikit-learn.
- **Infrastructure**: Nginx, Docker Compose, Render Configs, GitHub Actions.

## API Overview

- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/forgot-password`, `/api/auth/reset-password`.
- **Profiles**: `/api/profile/` (GET/PUT).
- **Interviews**: `/api/interview/start`, `/api/interview/:session_id/submit`, `/api/interview/:session_id/complete`, `/api/interview/companies`.
- **Coding**: `/api/coding/problems`, `/api/coding/problems/:id`, `/api/coding/submit`, `/api/coding/hint`.
- **Resumes**: `/api/resume/upload` (Multer + MIME-secured), `/api/resume/analyze`.
- **Gamification**: `/api/gamification/achievements`.
- **Notifications**: `/api/notifications/`, `/api/notifications/unread-count`, `/api/notifications/:id/read`.

## AI Provider — Google Gemini

PrepPilot's AI layer runs entirely on **Google Gemini** via the official [`google-genai`](https://pypi.org/project/google-genai/) Python SDK (not the deprecated `google-generativeai` package and not the OpenAI compatibility endpoint).

| Purpose | Model | Env var |
|---|---|---|
| LLM (evaluation, hints, feedback, chat, resume parsing, plans) | `gemini-2.5-flash-lite` | `MODEL_NAME` |
| Embeddings (semantic search, 1536-dim) | `gemini-embedding-001` | `EMBEDDING_MODEL` |
| API key | — | `GEMINI_API_KEY` |

### Getting an API key

1. Create a key at **Google AI Studio**: https://aistudio.google.com/apikey
2. Put it in `ai-services/.env` as `GEMINI_API_KEY=...` (never commit real keys).
3. Restart the AI services: `docker compose restart ai-interview ai-learning ai-resume ai-copilot`.

### Free-tier limitations

Google AI Studio's free tier has **rate limits and daily quotas** (requests-per-minute and requests-per-day caps vary by model). It is **not unlimited**. For production traffic, enable billing on your Google Cloud project or upgrade your AI Studio plan. The services degrade gracefully: when Gemini is unavailable (quota exceeded, rate limited, invalid key, timeout), endpoints return their existing fallback responses instead of crashing.

### Embeddings & database

Embeddings use `gemini-embedding-001` with an output dimension of **1536**, matching the existing pgvector columns (`questions.embedding`, `study_materials.embedding` — both `vector(1536)`). Vectors from the previous OpenAI model are **not compatible** with Gemini vectors even at the same dimension. If you have an existing database with OpenAI-generated embeddings, run:

```
psql "$DATABASE_URL" -f database/migrate_gemini_embeddings.sql
```

This invalidates old vectors (sets them to NULL) and records the active model in `embedding_metadata`. Regenerate embeddings with `shared.gemini_client.embed_texts()` — never mix embeddings from different models.

## Local Setup & Deployment

Refer to the Docker Compose config or deployment guides within `.github/workflows/ci-cd.yml` and `render.yaml` to deploy across environments. Use `database/patch_production.sql` to patch existing installations cleanly.
