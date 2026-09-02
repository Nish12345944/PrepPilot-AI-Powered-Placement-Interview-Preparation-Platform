"""
AI Copilot Service – expert career coach + technical mentor chatbot.
Port: 8004
"""
import os
import json
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv

from shared.gemini_client import generate_text, is_available, MODEL_NAME

load_dotenv()

app = FastAPI(title="PrepPilot Copilot AI", version="2.0.0")

# ── Models ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(max_length=8_000)
    history: List[dict] = Field(default_factory=list, max_length=50)
    user_context: dict

# ── Intent Detection ──────────────────────────────────────────────────────────

INTENTS = {
    "debug_code":     ["debug", "error", "fix", "wrong", "not working", "issue", "bug", "exception", "traceback", "fails"],
    "explain_concept":["explain", "what is", "how does", "define", "tell me about", "difference between", "what are", "how do"],
    "write_code":     ["write", "implement", "code for", "create a function", "program to", "solution for"],
    "interview_prep": ["interview", "prepare", "practice", "how to answer", "tell me about yourself", "star method"],
    "roadmap":        ["roadmap", "plan", "what to study", "how to prepare", "path", "schedule", "timeline", "where to start"],
    "resume_help":    ["resume", "cv", "ats", "job description", "cover letter"],
    "company_prep":   ["amazon", "google", "microsoft", "tcs", "infosys", "accenture", "wipro", "cognizant", "deloitte", "cisco"],
    "complexity":     ["time complexity", "space complexity", "big o", "optimize", "efficient"],
}

def detect_intent(message: str) -> str:
    msg_lower = message.lower()
    for intent, keywords in INTENTS.items():
        if any(kw in msg_lower for kw in keywords):
            return intent
    return "general"

# ── System Prompt ─────────────────────────────────────────────────────────────

def build_system_prompt(user_context: dict, intent: str) -> str:
    target  = user_context.get("target_company") or "top tech companies"
    role    = user_context.get("target_role")    or "Software Engineer"
    level   = user_context.get("level", 1)
    weak    = user_context.get("weak_topics")    or []
    skills  = user_context.get("skills")         or []

    weak_str   = ", ".join(weak[:4])   if weak   else "not identified yet"
    skills_str = ", ".join(skills[:6]) if skills else "not specified"

    system = f"""You are PrepPilot Copilot — an expert AI assistant combining the knowledge of a senior software engineer, technical interview coach, and career mentor.

## User Profile
- Target Role: {role} at {target}
- Current Level: {level}
- Skills: {skills_str}
- Weak Areas: {weak_str}

## Your Behavior
- Give **complete, detailed, accurate answers** — never truncate or say "I'll explain later"
- For **coding questions**: always provide full working code with comments, time/space complexity, and explanation
- For **concept questions**: explain clearly with analogies, examples, and real-world use cases
- For **interview questions**: give a model answer (STAR for HR, approach+code+complexity for technical)
- For **debugging**: identify the exact bug, explain why it happens, show the fixed code
- For **company prep**: give specific, actionable advice about that company's interview process
- Use **markdown formatting**: headers, bullet points, code blocks (```language), bold for key terms
- Be **direct and confident** — no filler phrases like "Great question!" or "Certainly!"
- Always **tailor advice** to the user's target company ({target}) and role ({role}) when relevant
- If asked about DSA, provide the optimal solution with explanation of the approach
- Keep responses **thorough but scannable** — use structure so the user can quickly find what they need"""

    intent_addons = {
        "debug_code":      "\n\n## Current Task: Debugging\nIdentify the root cause, explain it clearly, then provide the corrected code.",
        "write_code":      "\n\n## Current Task: Code Implementation\nProvide a complete, working solution with: 1) Approach explanation 2) Full code 3) Time & space complexity 4) Example walkthrough.",
        "explain_concept": "\n\n## Current Task: Concept Explanation\nStructure your answer as: Definition → How it works → Example → When to use it → Common interview questions about it.",
        "interview_prep":  f"\n\n## Current Task: Interview Preparation\nGive a complete model answer optimized for {target}'s interview style.",
        "roadmap":         f"\n\n## Current Task: Study Roadmap\nCreate a specific week-by-week plan for {role} at {target} with daily time commitments.",
        "company_prep":    f"\n\n## Current Task: Company-Specific Prep\nFocus on {target}'s exact interview rounds, question patterns, evaluation criteria, and tips from real candidates.",
        "complexity":      "\n\n## Current Task: Complexity Analysis\nExplain the time and space complexity with step-by-step derivation and suggest optimizations.",
    }

    return system + intent_addons.get(intent, "")

# ── Fallback answers (when no Gemini key) ─────────────────────────────────────

FALLBACK_ANSWERS = {
    "explain_concept": """I can explain that concept for you!

**Note:** The AI service is currently running without a Gemini API key, so I'm providing a structured template response.

To get full AI-powered answers, please:
1. Add your Gemini API key to `ai-services/.env` as `GEMINI_API_KEY=...`
2. Restart the `ai-copilot` container

**In the meantime**, here's how to approach learning any CS concept:
- **Definition**: What is it?
- **How it works**: Step-by-step mechanism
- **Example**: Concrete code/scenario
- **Use cases**: When to apply it
- **Interview angle**: Common questions about it

Try asking me again once the API key is configured for a complete answer!""",

    "general": """I'm PrepPilot Copilot — your AI career coach!

**⚠️ Gemini API key not configured.** To enable full AI-quality responses:

1. Open `ai-services/.env`
2. Set `GEMINI_API_KEY=your-key-here`
3. Run `docker compose restart ai-copilot`

**I can help you with:**
- 💻 DSA problems & code debugging
- 🎯 Interview preparation (technical + HR)
- 🗺️ Study roadmaps for specific companies
- 📄 Resume & ATS optimization
- 🏢 Company-specific prep (Amazon, Google, TCS, etc.)

What would you like to work on?"""
}

# ── Chat Endpoint ─────────────────────────────────────────────────────────────

@app.post("/chat")
async def chat(req: ChatRequest):
    intent = detect_intent(req.message)
    system_prompt = build_system_prompt(req.user_context, intent)

    messages = [{"role": "system", "content": system_prompt}]

    # Include last 12 messages for context (6 exchanges)
    for msg in req.history[-12:]:
        if msg.get("role") in ("user", "assistant") and msg.get("content"):
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": req.message})

    if is_available():
        result = await generate_text(system_prompt, messages, temperature=0.4)
        if result is not None:
            return {
                "response": result["text"],
                "intent": intent,
                "tokens_used": result["tokens_used"],
            }
        return {
            "response": "AI service error: Gemini is temporarily unavailable. Please try again shortly.",
            "intent": intent,
            "tokens_used": 0,
        }

    # Meaningful fallback
    fallback = FALLBACK_ANSWERS.get(intent, FALLBACK_ANSWERS["general"])
    return {"response": fallback, "intent": intent, "tokens_used": 0}

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-copilot", "llm_enabled": is_available(), "model": MODEL_NAME if is_available() else "fallback"}