"""
AI Interview Service – evaluates answers, judges code, generates session feedback.
Port: 8001
"""
import os
import json
import subprocess
import tempfile
import time
import shutil

try:
    import resource  # Unix only
except ImportError:
    resource = None
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

from shared.gemini_client import (
    generate_json,
    generate_text,
    is_available,
    MODEL_NAME,
)

load_dotenv()

NL = chr(10)  # newline for building prompts

app = FastAPI(title="PrepPilot Interview AI", version="1.0.0")

# ── Models ────────────────────────────────────────────────────────────────────

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

# ── Evaluation ────────────────────────────────────────────────────────────────

EVAL_SYSTEM = """You are an expert technical interviewer. Evaluate the candidate's answer strictly and fairly.
Return a JSON object with exactly these fields:
- score: number 0-100
- is_correct: boolean
- accuracy: number 0-100 (factual correctness)
- clarity: number 0-100 (how clearly explained)
- structure: number 0-100 (logical flow and organization)
- keywords_matched: array of key concepts the candidate mentioned
- feedback: string, 2-3 sentences of constructive feedback
- optimized_answer: string, concise ideal answer (max 120 words)
Only return valid JSON."""

def fallback_evaluation(user_answer: str) -> dict:
    word_count = len(user_answer.split())
    score = min(60, max(20, word_count * 2))
    return {
        "score": score,
        "is_correct": score >= 50,
        "accuracy": score,
        "clarity": min(70, score + 10),
        "structure": min(65, score + 5),
        "keywords_matched": [],
        "feedback": "AI evaluation is temporarily unavailable. Your answer has been recorded for review.",
        "optimized_answer": "",
    }

@app.post("/evaluate")
async def evaluate_answer(req: EvaluateRequest):
    if not req.user_answer or not req.user_answer.strip():
        raise HTTPException(400, "Answer cannot be empty")

    if not is_available():
        return fallback_evaluation(req.user_answer)

    question_text = req.question_description or req.question_title or "No question provided"
    prompt = f"""Question: {question_text}
Session Type: {req.session_type}
Candidate Answer: {req.user_answer[:2000]}"""
    if req.correct_answer:
        prompt += f"{NL}Expected Answer: {req.correct_answer}"

    result = await generate_json(EVAL_SYSTEM, prompt, temperature=0.3)
    if result is None:
        return fallback_evaluation(req.user_answer)

    result.setdefault("score", 50)
    result.setdefault("is_correct", result.get("score", 0) >= 60)
    result.setdefault("accuracy", result.get("score", 50))
    result.setdefault("clarity", result.get("score", 50))
    result.setdefault("structure", result.get("score", 50))
    result.setdefault("keywords_matched", [])
    result.setdefault("feedback", "")
    result.setdefault("optimized_answer", "")
    return result

# ── Code Judge ────────────────────────────────────────────────────────────────

class HintRequest(BaseModel):
    code: str
    language: str
    problem_title: str
    problem_description: str
    error: Optional[str] = None
    wrong_cases: Optional[List[dict]] = None
    hint_level: int = 1  # 1=nudge, 2=approach, 3=detailed

def _which(*candidates):
    """Return the first available executable name (skips Windows Store aliases)."""
    for c in candidates:
        path = shutil.which(c)
        if path and "windowsapps" not in path.lower():
            return path
    return candidates[0]

LANG_CONFIG = {
    "python":     {"suffix": ".py",   "run": lambda f, _: [_which("python3", "python"), f]},
    "javascript": {"suffix": ".js",   "run": lambda f, _: [_which("node"), f]},
    "java":       {"suffix": ".java",  "run": None},
    "cpp":        {"suffix": ".cpp",   "run": None},
}

def _sandbox_kwargs():
    """preexec_fn is Unix-only; omit it elsewhere."""
    return {"preexec_fn": _set_resource_limits} if resource is not None else {}

# ── Security: resource limits for sandboxed execution ────────────────────────
# Memory limit: 256 MB, CPU limit: 5 seconds, file size: 10 MB
MEM_LIMIT = 256 * 1024 * 1024
CPU_LIMIT = 5
FILE_LIMIT = 10 * 1024 * 1024

def _set_resource_limits():
    """Apply resource limits to the child process (Unix only)."""
    if resource is None:
        return
    try:
        resource.setrlimit(resource.RLIMIT_AS, (MEM_LIMIT, MEM_LIMIT))
        resource.setrlimit(resource.RLIMIT_CPU, (CPU_LIMIT, CPU_LIMIT))
        resource.setrlimit(resource.RLIMIT_FSIZE, (FILE_LIMIT, FILE_LIMIT))
    except (ValueError, resource.error):
        pass

def run_code_safely(code: str, language: str, stdin: str, timeout: int = 10) -> dict:
    cfg = LANG_CONFIG.get(language)
    if not cfg:
        return {"error": f"Language '{language}' not supported", "output": "", "time_ms": 0}

    tmpdir = tempfile.mkdtemp()
    try:
        start = time.time()

        if language == "java":
            import re
            match = re.search(r'public\s+class\s+(\w+)', code)
            classname = match.group(1) if match else "Solution"
            src = os.path.join(tmpdir, f"{classname}.java")
            with open(src, "w") as f:
                f.write(code)
            compile_result = subprocess.run(
                ["javac", src], capture_output=True, text=True, timeout=15,
                **_sandbox_kwargs(),
            )
            if compile_result.returncode != 0:
                return {"output": "", "error": compile_result.stderr.strip(), "returncode": 1, "time_ms": 0, "compile_error": True}
            run_result = subprocess.run(
                ["java", "-cp", tmpdir, classname],
                input=str(stdin), capture_output=True, text=True, timeout=timeout,
                **_sandbox_kwargs(),
            )
            elapsed = int((time.time() - start) * 1000)
            return {"output": run_result.stdout.strip(), "error": run_result.stderr.strip(), "returncode": run_result.returncode, "time_ms": elapsed}

        elif language == "cpp":
            src = os.path.join(tmpdir, "solution.cpp")
            exe = os.path.join(tmpdir, "solution")
            with open(src, "w") as f:
                f.write(code)
            compile_result = subprocess.run(
                ["g++", "-O2", "-o", exe, src], capture_output=True, text=True, timeout=15,
                **_sandbox_kwargs(),
            )
            if compile_result.returncode != 0:
                return {"output": "", "error": compile_result.stderr.strip(), "returncode": 1, "time_ms": 0, "compile_error": True}
            run_result = subprocess.run(
                [exe], input=str(stdin), capture_output=True, text=True, timeout=timeout,
                **_sandbox_kwargs(),
            )
            elapsed = int((time.time() - start) * 1000)
            return {"output": run_result.stdout.strip(), "error": run_result.stderr.strip(), "returncode": run_result.returncode, "time_ms": elapsed}

        else:
            fname = os.path.join(tmpdir, f"solution{cfg['suffix']}")
            with open(fname, "w") as f:
                f.write(code)
            run_result = subprocess.run(
                cfg["run"](fname, None),
                input=str(stdin), capture_output=True, text=True, timeout=timeout,
                **_sandbox_kwargs(),
            )
            elapsed = int((time.time() - start) * 1000)
            return {"output": run_result.stdout.strip(), "error": run_result.stderr.strip(), "returncode": run_result.returncode, "time_ms": elapsed}

    except subprocess.TimeoutExpired:
        return {"output": "", "error": "Time Limit Exceeded", "returncode": -1, "time_ms": timeout * 1000}
    except Exception as e:
        return {"output": "", "error": str(e), "returncode": -1, "time_ms": 0}
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

@app.post("/judge")
async def judge_code(req: JudgeRequest):
    results = []
    passed = 0
    total_time = 0
    compile_error = None

    for i, tc in enumerate(req.test_cases):
        run = run_code_safely(req.code, req.language, str(tc.get("input", "")))

        if run.get("compile_error") and i == 0:
            compile_error = run["error"]
            for tc2 in req.test_cases:
                results.append({"case_id": tc2.get("id"), "passed": False, "output": "",
                                 "expected": str(tc2.get("expected_output", "")),
                                 "error": "Compilation failed", "time_ms": 0,
                                 "is_hidden": tc2.get("is_hidden", False)})
            break

        expected = str(tc.get("expected_output", "")).strip()
        is_passed = run["output"] == expected and not run["error"]
        if is_passed:
            passed += 1
        total_time += run.get("time_ms", 0)
        results.append({
            "case_id": tc.get("id"),
            "passed": is_passed,
            "output": run["output"] if not tc.get("is_hidden") else None,
            "expected": expected if not tc.get("is_hidden") else None,
            "error": run["error"],
            "time_ms": run.get("time_ms", 0),
            "is_hidden": tc.get("is_hidden", False),
        })

    tle = any("Time Limit" in (r.get("error") or "") for r in results)
    status = (
        "compile_error" if compile_error
        else "accepted" if passed == len(req.test_cases)
        else "time_limit_exceeded" if tle
        else "wrong_answer"
    )

    ai_feedback = {}
    if is_available():
        try:
            ai_feedback = await get_code_feedback(req.code, req.language, status, compile_error) or {}
        except Exception:
            pass

    return {
        "status": status,
        "passed": passed,
        "total": len(req.test_cases),
        "test_results": results,
        "runtime_ms": total_time,
        "compile_error": compile_error,
        "ai_feedback": ai_feedback,
    }

async def get_code_feedback(code: str, language: str, status: str, compile_error: Optional[str] = None) -> Optional[dict]:
    extra = f"{NL}Compile Error:{NL}{compile_error}" if compile_error else ""
    system = "Analyze this code submission. Return JSON with: time_complexity (string), space_complexity (string), suggestions (array of strings, max 3), optimized_code (string or null). Be concise."
    prompt = f"Language: {language}{NL}Status: {status}{extra}{NL}Code:{NL}{code[:2000]}"
    return await generate_json(system, prompt, temperature=0.2)

@app.post("/hint")
async def get_hint(req: HintRequest):
    level_instructions = {
        1: "Give a very subtle nudge — one sentence pointing toward the right direction without revealing the approach.",
        2: "Describe the algorithmic approach/data structure to use without writing any code.",
        3: "Give a detailed hint with pseudocode or key steps, but not the full solution.",
    }
    instruction = level_instructions.get(req.hint_level, level_instructions[1])

    error_context = f"{NL}Runtime/Compile Error:{NL}{req.error}" if req.error else ""
    wrong_context = ""
    if req.wrong_cases:
        cases_str = NL.join(f"  Input: {c.get('input')} | Got: {c.get('output')} | Expected: {c.get('expected')}" for c in req.wrong_cases[:3])
        wrong_context = f"{NL}Failing test cases:{NL}{cases_str}"

    if not is_available():
        return {"hint": "AI hints are unavailable (no Gemini API key configured). Review the problem constraints and think about the data structure that best fits the access pattern.", "level": req.hint_level}

    system = f"You are a coding mentor helping a student solve a DSA problem. {instruction} Do NOT give the full solution. Return JSON with: hint (string), approach_name (string or null)."
    prompt = f"Problem: {req.problem_title}{NL}{req.problem_description[:500]}{NL}Language: {req.language}{NL}Student's code:{NL}{req.code[:1500]}{error_context}{wrong_context}"

    result = await generate_json(system, prompt, temperature=0.4)
    if result is None:
        return {"hint": "Could not generate hint. Try reviewing the problem constraints.", "level": req.hint_level}
    result.setdefault("approach_name", None)
    return result

# ── Session Feedback ──────────────────────────────────────────────────────────

SESSION_FEEDBACK_FALLBACK = {
    "overall_assessment": "",
    "strengths": [],
    "areas_to_improve": ["Review your answers and practice more"],
    "recommended_topics": [],
    "next_steps": ["Practice daily", "Review weak areas"],
}

@app.post("/session-feedback")
async def session_feedback(req: SessionFeedbackRequest):
    summary = []
    for r in req.responses:
        eval_data = r.get("ai_evaluation") or r.get("feedback") or {}
        if isinstance(eval_data, str):
            try:
                eval_data = json.loads(eval_data)
            except Exception:
                eval_data = {}
        summary.append({
            "question": r.get("title", "Question"),
            "score": r.get("score", 0),
            "feedback": eval_data.get("feedback", "") if isinstance(eval_data, dict) else str(eval_data),
        })

    if not is_available():
        avg = req.avg_score
        return {
            "overall_assessment": f"You completed the session with an average score of {avg:.0f}/100.",
            "strengths": ["Completed all questions"] if avg >= 40 else [],
            "areas_to_improve": ["Review core concepts", "Practice more regularly"],
            "recommended_topics": [],
            "next_steps": ["Review your answers below", "Practice daily for improvement"],
        }

    system = (
        "You are an interview coach. Provide session-level feedback. "
        "Return JSON with: overall_assessment (string), strengths (list of strings), "
        "areas_to_improve (list of strings), recommended_topics (list of strings), "
        "next_steps (list of strings)."
    )
    prompt = f"Average Score: {req.avg_score:.1f}/100{NL}Session Summary:{NL}{json.dumps(summary)}"

    result = await generate_json(system, prompt, temperature=0.4)
    if result is None:
        fallback = dict(SESSION_FEEDBACK_FALLBACK)
        fallback["overall_assessment"] = f"Session completed with average score {req.avg_score:.0f}/100."
        return fallback

    result.setdefault("overall_assessment", f"Average score: {req.avg_score:.0f}/100")
    result.setdefault("strengths", [])
    result.setdefault("areas_to_improve", [])
    result.setdefault("recommended_topics", [])
    result.setdefault("next_steps", [])
    return result

# ── Speech Transcription ─────────────────────────────────────────────────────

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), language: str = Form(default="en")):
    """Transcribe audio using Gemini multimodal input."""
    from shared.gemini_client import get_client
    client = get_client()
    if client is None:
        raise HTTPException(503, "Transcription service unavailable: no valid Gemini API key")

    content = await audio.read()
    if len(content) < 1000:
        raise HTTPException(400, "Audio file too small or empty")

    mime = audio.content_type or "audio/webm"

    try:
        from google.genai import types
        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=content, mime_type=mime),
                        types.Part(text=f"Transcribe this audio verbatim in {'English' if language == 'en' else language}. Return only the transcript text."),
                    ],
                )
            ],
        )
        text = (response.text or "").strip()
        if not text:
            raise HTTPException(422, "Could not transcribe audio — please speak clearly and try again")
        return {"transcript": text}
    except HTTPException:
        raise
    except Exception as e:
        # Log server-side only; never expose secrets.
        print(f"Transcription failed ({type(e).__name__})")
        raise HTTPException(502, "Transcription failed — please try again later")

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-interview", "llm_enabled": is_available()}