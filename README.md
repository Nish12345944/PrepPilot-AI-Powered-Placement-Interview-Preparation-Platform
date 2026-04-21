# PrepPilot – AI-Powered Placement & Interview Preparation Platform

## Architecture Overview

```
Client (Next.js) → Nginx → Node.js Backend → PostgreSQL / Redis
                         → FastAPI AI Services (×4)
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local dev)
- Python 3.11+ (for local AI dev)
- OpenAI API key

### 1. Clone & Configure

```bash
git clone <repo-url>
cd PrepPilot

# Backend env
cp backend/.env.example backend/.env
# Edit backend/.env → set JWT_SECRET, OPENAI_API_KEY, etc.

# AI services env
cp ai-services/.env.example ai-services/.env
# Edit ai-services/.env → set OPENAI_API_KEY

# Frontend env
cp frontend/.env.local.example frontend/.env.local
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

Services start at:
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| AI Interview | http://localhost:8001 |
| AI Learning | http://localhost:8002 |
| AI Resume | http://localhost:8003 |
| AI Copilot | http://localhost:8004 |
| Nginx (prod) | http://localhost:80 |

### 3. Local Development

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**AI Services:**
```bash
cd ai-services
pip install -r requirements.txt
uvicorn interview.main:app --port 8001 --reload
uvicorn learning.main:app --port 8002 --reload
uvicorn resume.main:app --port 8003 --reload
uvicorn copilot.main:app --port 8004 --reload
```

## Running Tests

```bash
# Backend
cd backend && npm test

# AI Services
cd ai-services && pytest tests/ -v
```

## Project Structure

```
PrepPilot/
├── database/
│   └── schema.sql              # Full PostgreSQL schema
├── backend/                    # Node.js/Express API
│   └── src/
│       ├── modules/
│       │   ├── auth/           # JWT auth + RBAC
│       │   ├── interview/      # Mock interview sessions
│       │   ├── coding/         # DSA problems + judge
│       │   ├── learning/       # Adaptive engine + materials
│       │   ├── resume/         # ATS analyzer
│       │   ├── planner/        # Daily study planner
│       │   ├── dashboard/      # Stats + leaderboard
│       │   └── chat/           # AI Copilot chat
│       ├── middleware/         # Auth, validation, errors
│       └── config/             # DB, Redis
├── ai-services/                # Python FastAPI microservices
│   ├── interview/main.py       # Code judge + answer eval
│   ├── learning/main.py        # Recommendations + materials
│   ├── resume/main.py          # ATS scoring + parsing
│   ├── copilot/main.py         # LLM chatbot
│   └── tests/
├── frontend/                   # Next.js 14 App Router
│   └── src/app/
│       ├── dashboard/          # Performance dashboard
│       ├── interview/          # Mock interview UI
│       ├── coding/             # Code editor + judge
│       ├── resume/             # Resume analyzer UI
│       └── copilot/            # AI chat UI
├── nginx/nginx.conf            # Reverse proxy config
├── .github/workflows/ci-cd.yml # GitHub Actions CI/CD
└── docker-compose.yml
```

## Key Features

| Module | Implementation |
|---|---|
| AI Mock Interview | GPT-4o-mini evaluation: accuracy, clarity, structure scores |
| Adaptive Learning | Priority scoring: `(1 - mastery) * 0.6 + (1/attempts) * 0.4` |
| Code Judge | Subprocess sandboxing with timeout enforcement |
| ATS Resume | Regex keyword extraction + LLM deep analysis |
| AI Copilot | Intent detection → personalized system prompt → GPT response |
| Daily Planner | AI-generated tasks adjusted by yesterday's completion rate |
| Gamification | XP transactions, streak tracking, badge criteria engine |
| Performance | Mastery score updated incrementally after each session |

## Environment Variables

See `backend/.env.example` and `ai-services/.env.example` for all required variables.

## Security

- JWT access tokens (15min) + refresh token rotation (7 days)
- Token blacklisting via Redis on logout
- Rate limiting: 100 req/15min global, 10 req/15min on auth routes
- Helmet.js security headers
- Input validation via Joi on all endpoints
- SQL injection prevention via parameterized queries
- File upload validation (type + size limits)
