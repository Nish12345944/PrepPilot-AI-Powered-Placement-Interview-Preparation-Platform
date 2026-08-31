# PrepPilot â€” AI-Powered Placement & Interview Preparation Platform

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

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, Zustand, Monaco Editor, Recharts, Socket.IO Client.
- **Backend**: Node.js, Express, PostgreSQL (pgvector), Redis, Socket.IO Server, rate limiters, Joi validation, security sandboxing.
- **AI Microservices**: FastAPI, Google Gemini (Gemini 2.5 Flash-Lite for LLM, Gemini Embedding 001 for embeddings) via the official `google-genai` SDK, Python-docx, PyPDF2, scikit-learn.
- **Infrastructure**: Nginx, Docker Compose, Render Configs, GitHub Actions.

## API Overview

All routes are under `/api` on the backend service. Authenticated routes require a `Bearer` access token.

- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`.
- **Profiles**: `GET|PUT /profile`.
- **Interviews**: `POST /interview/sessions`, `GET /interview/sessions`, `GET /interview/sessions/:id`, `POST /interview/sessions/:id/respond`, `POST /interview/sessions/:id/complete`, `POST /interview/transcribe` (multipart audio). `GET /interview/companies` and `GET /interview/questions` are public.
- **Coding**: `GET /coding/problems`, `GET /coding/problems/:id`, `POST /coding/submit`, `POST /coding/hint`, `GET /coding/problems/:problem_id/submissions`.
- **Learning**: `GET /learning/path`, `GET /learning/next`, `GET /learning/materials`, `POST /learning/materials/generate`.
- **Planner**: `POST /planner/generate`, `GET /planner/today`, `PATCH /planner/tasks/:task_id`.
- **Dashboard**: `GET /dashboard`, `GET /dashboard/leaderboard?period=weekly|monthly|all_time`.
- **Chat / Copilot**: `POST /chat/message`, `GET /chat/sessions`, `GET /chat/sessions/:session_id/messages`.
- **Resumes**: `POST /resume/upload` (Multer + MIME-secured), `POST /resume/analyze`, `GET /resume/analyses`, `GET /resume`.
- **Gamification**: `GET /gamification/achievements`.
- **Notifications**: `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`.

## AI Provider â€” Google Gemini

PrepPilot's AI layer runs entirely on **Google Gemini** via the official [`google-genai`](https://pypi.org/project/google-genai/) Python SDK (not the deprecated `google-generativeai` package and not the OpenAI compatibility endpoint).

| Purpose | Model | Env var |
|---|---|---|
| LLM (evaluation, hints, feedback, chat, resume parsing, plans) | `gemini-2.5-flash-lite` | `MODEL_NAME` |
| Embeddings (semantic search, 1536-dim) | `gemini-embedding-001` | `EMBEDDING_MODEL` |
| API key | â€” | `GEMINI_API_KEY` |

### Getting an API key

1. Create a key at **Google AI Studio**: https://aistudio.google.com/apikey
2. Put it in `ai-services/.env` as `GEMINI_API_KEY=...` (never commit real keys).
3. Restart the AI services: `docker compose restart ai-interview ai-learning ai-resume ai-copilot`.

### Free-tier limitations

Google AI Studio's free tier has **rate limits and daily quotas** (requests-per-minute and requests-per-day caps vary by model). It is **not unlimited**. For production traffic, enable billing on your Google Cloud project or upgrade your AI Studio plan. The services degrade gracefully: when Gemini is unavailable (quota exceeded, rate limited, invalid key, timeout), endpoints return their existing fallback responses instead of crashing.

### Embeddings & database

Embeddings use `gemini-embedding-001` with an output dimension of **1536**, matching the existing pgvector columns (`questions.embedding`, `study_materials.embedding` â€” both `vector(1536)`). Vectors from the previous OpenAI model are **not compatible** with Gemini vectors even at the same dimension. If you have an existing database with OpenAI-generated embeddings, run:

```
psql "$DATABASE_URL" -f database/migrate_gemini_embeddings.sql
```

This invalidates old vectors (sets them to NULL) and records the active model in `embedding_metadata`. Regenerate embeddings with `shared.gemini_client.embed_texts()` â€” never mix embeddings from different models.

## Architecture

PrepPilot is composed of independently deployable services communicating over HTTP.

| Service          | Port | Image                                  | Notes |
|------------------|------|----------------------------------------|-------|
| Frontend         | 3000 | `frontend/Dockerfile`                  | Standalone Next.js server |
| Backend API      | 5000 | `backend/Dockerfile`                   | Express + Socket.IO |
| AI Interview     | 8001 | `ai-services/Dockerfile.base`          | Evaluation + code judge + transcription |
| AI Learning      | 8002 | `ai-services/Dockerfile.base`          | Recommendations, materials, plans |
| AI Resume        | 8003 | `ai-services/Dockerfile.base`          | Resume parsing + ATS scoring |
| AI Copilot       | 8004 | `ai-services/Dockerfile.base`          | Conversational assistant |
| PostgreSQL       | 5432 | `pgvector/pgvector:pg16`               | Primary database |
| Redis            | 6379 | `redis:7-alpine`                       | Cache / pub-sub / blacklist |
| Nginx            | 80   | `nginx:alpine`                         | Optional reverse proxy |

**Data flow:** Browser â†’ Nginx â†’ Frontend/Backend â†’ PostgreSQL, Redis, and the four AI microservices â†’ Google Gemini. The AI services are internal-only (not exposed to the browser) and contain no business data.

> **Security boundary:** user-submitted code is executed by the **AI Interview service's judge** under resource limits (memory 256 MB, CPU 5 s, max 64 processes, 10 MB files) with process-group cleanup and a dedicated non-root container user. Do not mount host paths or grant extra capabilities to that container.

## Environment configuration

Environment variables are split by concern; `.env` files are **never committed** (only `*.example` files are).

| File                          | Purpose |
|-------------------------------|---------|
| `.env.example` â†’ `.env`       | Root: PostgreSQL credentials + frontend URLs shared by Docker Compose |
| `backend/.env.example`        | Backend secrets (JWT, SMTP, AI service hosts, S3) |
| `ai-services/.env.example`    | Gemini API key, model names, database/Redis URLs |
| `frontend/.env.local.example` | Frontend build-time URLs (`NEXT_PUBLIC_*`) |

> **Frontend build-time variables:** `NEXT_PUBLIC_API_URL` (and the optional `NEXT_PUBLIC_WS_URL`) are **inlined into the client bundle at build time**. They must be full URLs including the `/api` suffix (e.g. `https://api.example.com/api`). Changing them requires rebuilding the frontend image.

## Local setup (without Docker)

1. `cp .env.example .env` and fill in the values (see `backend/.env.example` and `ai-services/.env.example`).
2. Start PostgreSQL (with pgvector) and Redis.
3. `cd ai-services && pip install -r requirements.txt` then `uvicorn interview.main:app --port 8001 --reload` (repeat for learning/resume/copilot on ports 8002–8004).
4. `cd backend && npm install && npm run dev` (port 5000).
5. `cd frontend && npm install && npm run dev` (port 3000).

## Docker setup

```bash
cp .env.example .env                       # set POSTGRES_PASSWORD, etc.
cd ai-services && cp .env.example .env     # set GEMINI_API_KEY
cd ../backend  && cp .env.example .env     # set JWT secrets, SMTP, etc.
cd ..
docker compose up --build
```

- Database is initialised automatically from `database/schema.sql` + seeds on a **fresh** volume.
- The backend waits for PostgreSQL/Redis health checks before starting; the frontend waits for the backend.
- `docker compose down` stops services; `docker compose down -v` also wipes the database/Redis volumes.

> **Clean-checkout note:** `POSTGRES_PASSWORD` is required by `docker-compose.yml` interpolation. Copy `.env.example` to `.env` and set it before running Compose.

## Database setup

- **Fresh install:** Docker Compose mounts `database/*.sql` into `docker-entrypoint-initdb.d/` — applied automatically on first boot (empty volume).
- **Existing install:** apply `database/patch_production.sql` (adds constraints, indexes, badges idempotently):
  ```bash
  psql "$DATABASE_URL" -f database/patch_production.sql
  ```
- **Gemini embedding migration** (only if migrating from old embeddings): `psql "$DATABASE_URL" -f database/migrate_gemini_embeddings.sql`.

## Health & readiness

- **Backend**: `/health` (liveness) and `/health/ready` which separately reports `postgres` and `redis` and returns 503 when the database is unreachable.
- **AI services**: lightweight `/health` endpoints that only check whether a Gemini API key is configured — no expensive Gemini calls.
- Each Dockerfile declares a `HEALTHCHECK`.

## Rate limiting / abuse protection

| Scope | Limit (per 15 min) |
|-------|--------------------|
| General API | 100 |
| Auth (login/register) | 10 |
| AI-backed ops (chat, judge, hint, resume, plan, learning material, interview, transcription) | 60 |
| Nginx layer | 30 r/m (API), 5 r/m (auth) |

## Testing

- **Backend:** `cd backend && npm test` (Jest: auth, ownership/authorization, coding-submission normalisation).
- **AI services:** `cd ai-services && python -m pytest tests/` (unit tests mock Gemini — no key needed).
- **Frontend:** `cd frontend && npm run lint` (zero-warning gate), `npx tsc --noEmit`, and `npm run build` (build-time lint + type checks are enabled in `next.config.js`).

## Deployment

### GitHub Actions (`/.github/workflows/ci-cd.yml`)

On push to `main`: runs backend tests, AI tests, and frontend lint/typecheck/build as **hard quality gates**, then builds Docker images; on `main` it also pushes images and runs the SSH deploy step. Lint/build/test failures fail CI (no `continue-on-error` bypasses).

Required secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `NEXT_PUBLIC_API_URL`, `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, `GEMINI_API_KEY`.

### Render (`render.yaml`)

Independent web services for the backend, four AI services, and the frontend, plus managed PostgreSQL and Redis. Backend reaches AI services/Frontend via `fromService: host` (bare hostnames are normalised to HTTPS by the backend `aiUrl` helper). Set **`GEMINI_API_KEY` manually** on each AI service after the first deploy (`sync: false`).

## Known limitations

- **Gemini free tier** has RPS/daily quotas; endpoints degrade to fallbacks when unavailable.
- **SMTP must be configured** for password-reset emails to actually send; otherwise only the token is logged server-side.
- **S3 file storage** for resumes is optional/placeholder; keep resumes behind user-scoped endpoints (never expose raw `file_url` paths).
- **Transcription** requires a valid Gemini key and an audio-capable browser.
- **Embedding dimension** is fixed at 1536 (`vector(1536)`); changing the embedding model requires a migration and regeneration.