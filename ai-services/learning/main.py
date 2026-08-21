"""
AI Learning Service – adaptive recommendations, study material generation, daily plans.
Port: 8002
"""
import os
import json
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional, Any
from dotenv import load_dotenv

from shared.gemini_client import generate_json, is_available

load_dotenv()

NL = chr(10)  # newline for building prompts

app = FastAPI(title="PrepPilot Learning AI", version="1.0.0")

# ── Models ───────────────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    user_id: str
    performance: List[dict]
    user_info: dict

class MaterialRequest(BaseModel):
    topic: dict
    material_type: str  # notes, flashcards, revision_plan, cheatsheet
    company_target: Optional[str] = None
    user_level: float = 50.0  # mastery score 0-100

class PlanRequest(BaseModel):
    user_id: str
    weak_topics: List[dict]
    user_info: dict
    yesterday_completion: Optional[dict] = None

# ── Adaptive Recommendation Engine ───────────────────────────────────────────

def compute_priority_score(topic: dict) -> float:
    """
    Priority = (1 - mastery/100) * 0.6 + (1 / (attempts+1)) * 0.4
    Higher score = higher priority to study.
    """
    mastery = topic.get("mastery_score", 50) or 50
    attempts = topic.get("attempts", 0) or 0
    return (1 - mastery / 100) * 0.6 + (1 / (attempts + 1)) * 0.4

ROADMAP_FALLBACK = {
    "roadmap": [],
    "weekly_plan": [],
    "tips": ["AI recommendations are temporarily unavailable. Focus on your weakest topics first."],
}

@app.post("/recommend")
async def recommend_learning_path(req: RecommendRequest):
    # Sort topics by priority
    sorted_topics = sorted(req.performance, key=compute_priority_score, reverse=True)
    weak = [t for t in sorted_topics if (t.get("mastery_score") or 50) < 60]
    strong = [t for t in sorted_topics if (t.get("mastery_score") or 50) >= 80]

    # Use LLM to generate a structured roadmap
    context = {
        "target_company": req.user_info.get("target_company", "General"),
        "target_role": req.user_info.get("target_role", "SDE"),
        "weak_topics": [t["name"] for t in weak[:5]],
        "strong_topics": [t["name"] for t in strong[:3]],
    }

    system = "You are a placement preparation expert. Create a personalized learning roadmap. Return JSON with: roadmap (ordered list of {topic, reason, estimated_days, resources}), weekly_plan (list of {week, focus_areas}), tips (list of strings)."
    result = await generate_json(system, json.dumps(context), temperature=0.4)

    if result is None:
        result = dict(ROADMAP_FALLBACK)

    result["priority_topics"] = [t["name"] for t in weak[:5]]
    return result

# ── Study Material Generator ─────────────────────────────────────────────────

MATERIAL_PROMPTS = {
    "notes": "Create comprehensive study notes with key concepts, definitions, examples, and common interview questions.",
    "flashcards": "Create 10 flashcard pairs (question/answer) covering the most important concepts.",
    "revision_plan": "Create a 3-day revision plan with daily tasks and time estimates.",
    "cheatsheet": "Create a concise cheatsheet with syntax, formulas, and quick-reference tables.",
}

MATERIAL_FALLBACK = {
    "title": "Study Material Unavailable",
    "content": "AI material generation is temporarily unavailable. Please try again later.",
    "key_points": [],
    "estimated_read_time_min": 1,
}

@app.post("/generate-material")
async def generate_study_material(req: MaterialRequest):
    level_desc = "beginner" if req.user_level < 40 else "intermediate" if req.user_level < 75 else "advanced"
    company_ctx = f" tailored for {req.company_target} interviews" if req.company_target else ""

    prompt_instruction = MATERIAL_PROMPTS.get(req.material_type, MATERIAL_PROMPTS["notes"])

    system = f"You are an expert educator. {prompt_instruction} The content should be {level_desc} level{company_ctx}. Return JSON with: title (string), content (markdown string), key_points (list), estimated_read_time_min (int)."
    prompt = f"Topic: {req.topic['name']} (Category: {req.topic['category']})"

    result = await generate_json(system, prompt, temperature=0.5)
    if result is None:
        return dict(MATERIAL_FALLBACK)
    return result

# ── Daily Plan Generator ─────────────────────────────────────────────────────

PLAN_FALLBACK = {
    "tasks": [],
    "motivation_message": "AI plan generation is temporarily unavailable. Review your weak topics today.",
}

@app.post("/generate-plan")
async def generate_daily_plan(req: PlanRequest):
    yesterday_rate = 0
    if req.yesterday_completion:
        total = int(req.yesterday_completion.get("total") or 0)
        done = int(req.yesterday_completion.get("done") or 0)
        yesterday_rate = (done / total * 100) if total > 0 else 0

    # Adjust task count based on yesterday's performance
    task_count = 6 if yesterday_rate >= 80 else 4 if yesterday_rate >= 50 else 3

    context = {
        "weak_topics": [t["name"] for t in req.weak_topics[:5]],
        "target_company": req.user_info.get("target_company", "General"),
        "yesterday_completion_rate": f"{yesterday_rate:.0f}%",
        "task_count": task_count,
    }

    system = f"Create a daily study plan with exactly {task_count} tasks. Return JSON with: tasks (list of {{title, description, type (practice/revision/mock_interview/reading), topic_id (null), duration_min, priority}}), motivation_message (string)."
    result = await generate_json(system, json.dumps(context), temperature=0.4)

    if result is None:
        return dict(PLAN_FALLBACK)
    return result

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-learning", "llm_enabled": is_available()}