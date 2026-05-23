"""
AI Copilot Service – career chatbot with intent detection and personalized guidance.
Port: 8004
"""
import os
import json
import random
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="PrepPilot Copilot AI", version="1.0.0")

# Mock responses for when OpenAI API is not available
MOCK_RESPONSES = {
    "explain_concept": [
        "Great question! Let me break this down for you step by step...",
        "This is a fundamental concept in computer science. Here's how it works...",
        "I'd be happy to explain this! The key points to understand are..."
    ],
    "debug_code": [
        "I can help you debug this! Let me analyze the issue and provide a solution...",
        "Looking at your code, I can see the problem. Here's what's happening and how to fix it...",
        "This is a common error. Let me walk you through the debugging process..."
    ],
    "interview_prep": [
        "Excellent interview question! Here's how I'd structure the answer using the STAR method...",
        "This is a popular question at top tech companies. Let me give you a comprehensive answer...",
        "Great practice question! For technical interviews, I recommend this approach..."
    ],
    "roadmap": [
        "I'll create a personalized study roadmap for you based on your target company and current level...",
        "Here's a structured learning path that will help you reach your goals...",
        "Let me design a timeline that balances theory, practice, and real-world application..."
    ],
    "resume_help": [
        "I can definitely help optimize your resume for ATS systems and recruiters...",
        "Let's make your resume stand out! Here are the key improvements I recommend...",
        "Your resume is your first impression. Let me help you make it compelling..."
    ],
    "company_prep": [
        "Preparing for top tech companies requires a strategic approach. Here's what you need to focus on...",
        "Each company has unique interview patterns. Let me share insights specific to your target...",
        "I'll help you understand the company culture and what they're looking for in candidates..."
    ],
    "motivation": [
        "I understand it can be challenging! Remember, every expert was once a beginner. Here's how to stay motivated...",
        "Feeling stuck is part of the learning process. Let me help you break through this barrier...",
        "You're not alone in this journey! Here are some strategies to regain momentum..."
    ],
    "general": [
        "I'm here to help with your career preparation! What specific area would you like to focus on?",
        "Great question! Let me provide you with some practical guidance...",
        "I'd be happy to assist you with that! Here's my recommendation..."
    ]
}

# Check if OpenAI API key is available and valid
_api_key = os.getenv("OPENAI_API_KEY", "")
USE_OPENAI = bool(_api_key) and _api_key.startswith("sk-") and _api_key not in ("sk-placeholder", "your_openai_key", "sk-...")

if USE_OPENAI:
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=_api_key)
    except ImportError:
        USE_OPENAI = False
        client = None
        print("OpenAI package not available, using mock responses")
else:
    client = None
    print("Using mock responses (OpenAI API key not configured)")

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

    if USE_OPENAI and client:
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

    # Fallback to mock responses
    return {
        "response": random.choice(MOCK_RESPONSES.get(intent, MOCK_RESPONSES["general"])),
        "intent": intent,
        "tokens_used": 0,
    }

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-copilot"}
