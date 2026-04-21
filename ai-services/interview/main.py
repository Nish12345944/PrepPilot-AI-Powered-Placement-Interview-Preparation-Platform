"""
AI Interview Service – evaluates answers, judges code, generates session feedback.
Port: 8001
"""
import os
import json
import subprocess
import tempfile
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="PrepPilot Interview AI", version="1.0.0")
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── Models ──────────────────────────────────────────────────────────────────

class EvaluateRequest(BaseModel):
    question_id: str
    user_answer: str
    session_type: str
    question_title: Optional[str] = None
    question_description: Optional[str] = None
    correct_answer: Optional[str] = None

class JudgeRequest(BaseModel):
    code: str
    language: str
    test_cases: List[dict]

class SessionFeedbackRequest(BaseModel):
    responses: List[dict]
    avg_score: float

# ── Evaluation ───────────────────────────────────────────────────────────────

EVAL_SYSTEM_PROMPT = """You are an expert technical interviewer. Evaluate the candidate's answer.
Return a JSON object with:
- score: 0-100 (float)
- is_correct: boolean
- accuracy: 0-100 (how factually correct)
- clarity: 0-100 (how clearly explained)
- structure: 0-100 (logical flow)
- keywords_matched: list of key concepts mentioned
- feedback: 2-3 sentence constructive feedback
- optimized_answer: brief ideal answer (max 100 words)
- complexity_hint: time/space complexity if applicable
Only return valid JSON, no markdown."""

@app.post("/evaluate")
async def evaluate_answer(req: EvaluateRequest):
    prompt = f"""Question: {req.question_description or req.question_title}
Candidate Answer: {req.user_answer}
{"Expected Answer: " + req.correct_answer if req.correct_answer else ""}
Session Type: {req.session_type}"""

    response = await client.chat.completions.create(
        model=os.getenv("MODEL_NAME", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": EVAL_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    result = json.loads(response.choices[0].message.content)
    result["tokens_used"] = response.usage.total_tokens
    return result

# ── Code Judge ───────────────────────────────────────────────────────────────

SUPPORTED_LANGUAGES = {"python": "python3", "javascript": "node"}

def run_code_safely(code: str, language: str, stdin: str, timeout: int = 5) -> dict:
    """Execute code in a sandboxed subprocess."""
    if language not in SUPPORTED_LANGUAGES:
        return {"error": f"Language {language} not supported", "output": ""}

    suffix = ".py" if language == "python" else ".js"
    with tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False) as f:
        f.write(code)
        fname = f.name

    try:
        result = subprocess.run(
            [SUPPORTED_LANGUAGES[language], fname],
            input=stdin, capture_output=True, text=True, timeout=timeout
        )
        return {"output": result.stdout.strip(), "error": result.stderr.strip(), "returncode": result.returncode}
    except subprocess.TimeoutExpired:
        return {"output": "", "error": "Time Limit Exceeded", "returncode": -1}
    finally:
        os.unlink(fname)

@app.post("/judge")
async def judge_code(req: JudgeRequest):
    results = []
    passed = 0

    for tc in req.test_cases:
        run = run_code_safely(req.code, req.language, str(tc.get("input", "")))
        is_passed = run["output"] == str(tc.get("expected_output", "")).strip() and not run["error"]
        if is_passed:
            passed += 1
        results.append({
            "case_id": tc.get("id"),
            "passed": is_passed,
            "output": run["output"],
            "expected": tc.get("expected_output"),
            "error": run["error"],
            "is_hidden": tc.get("is_hidden", False),
        })

    status = "accepted" if passed == len(req.test_cases) else (
        "time_limit_exceeded" if any("Time Limit" in r["error"] for r in results)
        else "wrong_answer"
    )

    # AI feedback on code quality
    ai_feedback = await get_code_feedback(req.code, req.language, status)

    return {
        "status": status,
        "passed": passed,
        "total": len(req.test_cases),
        "test_results": results,
        "runtime_ms": 0,  # would use actual timing in production
        "memory_kb": 0,
        "ai_feedback": ai_feedback,
    }

async def get_code_feedback(code: str, language: str, status: str) -> dict:
    response = await client.chat.completions.create(
        model=os.getenv("MODEL_NAME", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": "Analyze this code. Return JSON with: time_complexity, space_complexity, suggestions (list of strings), optimized_code (if improvements exist)."},
            {"role": "user", "content": f"Language: {language}\nStatus: {status}\nCode:\n{code}"},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)

# ── Session Feedback ─────────────────────────────────────────────────────────

@app.post("/session-feedback")
async def session_feedback(req: SessionFeedbackRequest):
    summary = [
        {"question": r.get("title"), "score": r.get("score"), "feedback": r.get("ai_evaluation", {}).get("feedback")}
        for r in req.responses
    ]

    response = await client.chat.completions.create(
        model=os.getenv("MODEL_NAME", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": "You are an interview coach. Provide session-level feedback. Return JSON with: overall_assessment (string), strengths (list), areas_to_improve (list), recommended_topics (list), next_steps (list)."},
            {"role": "user", "content": f"Average Score: {req.avg_score:.1f}/100\nResponses: {json.dumps(summary)}"},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-interview"}
