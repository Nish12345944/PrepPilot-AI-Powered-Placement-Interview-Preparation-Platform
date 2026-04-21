"""
AI Copilot Service – career chatbot with intent detection and personalized guidance.
Port: 8004
"""
import os
import json
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="PrepPilot Copilot AI", version="1.0.0")
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── Models ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    history: List[dict]  # [{role, content}]
    user_context: dict

# ── Intent Detection ─────────────────────────────────────────────────────────

INTENTS = {
    "explain_concept": ["explain", "what is", "how does", "define", "tell me about"],
    "debug_code": ["debug", "error", "fix", "wrong", "not working", "issue"],
    "interview_prep": ["interview", "prepare", "practice", "question", "answer"],
    "roadmap": ["roadmap", "plan", "what to study", "next", "path", "schedule"],
    "resume_help": ["resume", "cv", "ats", "job description", "apply"],
    "company_prep": ["amazon", "google", "microsoft", "tcs", "infosys", "company"],
    "motivation": ["stuck", "demotivated", "help", "struggling", "confused"],
}

def detect_intent(message: str) -> str:
    msg_lower = message.lower()
    for intent, keywords in INTENTS.items():
        if any(kw in msg_lower for kw in keywords):
            return intent
    return "general"

# ── System Prompt Builder ─────────────────────────────────────────────────────

def build_system_prompt(user_context: dict, intent: str) -> str:
    target = user_context.get("target_company", "top tech companies")
    role = user_context.get("target_role", "Software Engineer")
    level = user_context.get("level", 1)
    weak = user_context.get("weak_topics", [])
    skills = user_context.get("skills", [])

    base = f"""You are PrepPilot Copilot, an expert AI career coach and technical mentor.
User Profile: Targeting {role} at {target}, Level {level}/10.
Known Skills: {', '.join(skills[:5]) if skills else 'Not specified'}.
Weak Areas: {', '.join(weak[:3]) if weak else 'Not identified yet'}.

Guidelines:
- Be concise, practical, and encouraging
- For code questions, provide working examples
- For interview questions, give structured STAR/technical answers
- Always relate advice to the user's target company when relevant
- Current intent detected: {intent}"""

    intent_additions = {
        "debug_code": "\nFocus on identifying the bug, explaining why it occurs, and providing the fixed code.",
        "interview_prep": "\nProvide a model answer using proper structure (for technical: approach → code → complexity; for HR: STAR method).",
        "roadmap": "\nProvide a specific, time-bound study plan with daily/weekly milestones.",
        "company_prep": f"\nFocus specifically on {target}'s interview process, question patterns, and evaluation criteria.",
    }

    return base + intent_additions.get(intent, "")

# ── Chat Endpoint ─────────────────────────────────────────────────────────────

@app.post("/chat")
async def chat(req: ChatRequest):
    intent = detect_intent(req.message)
    system_prompt = build_system_prompt(req.user_context, intent)

    # Build messages array with history
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history (last 8 exchanges)
    for msg in req.history[-8:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current message
    messages.append({"role": "user", "content": req.message})

    response = await client.chat.completions.create(
        model=os.getenv("MODEL_NAME", "gpt-4o-mini"),
        messages=messages,
        temperature=0.6,
        max_tokens=1000,
    )

    return {
        "response": response.choices[0].message.content,
        "intent": intent,
        "tokens_used": response.usage.total_tokens,
    }

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-copilot"}
