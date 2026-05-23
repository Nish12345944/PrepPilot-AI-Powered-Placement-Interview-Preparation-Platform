"""
AI Interview Service – evaluates answers, judges code, generates session feedback.
Port: 8001
"""
import os
import json
import subprocess
import tempfile
import time
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from openai import AsyncOpenAI, AuthenticationError, APIError
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="PrepPilot Interview AI", version="1.0.0")

OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
client = AsyncOpenAI(api_key=OPENAI_KEY) if OPENAI_KEY.startswith("sk-") else None
MODEL = os.getenv("MODEL_NAME", "gpt-4o-mini")

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

    if client is None:
        return fallback_evaluation(req.user_answer)

    question_text = req.question_description or req.question_title or "No question provided"
    prompt = f"""Question: {question_text}
Session Type: {req.session_type}
Candidate Answer: {req.user_answer[:2000]}"""
    if req.correct_answer:
        prompt += f"\nExpected Answer: {req.correct_answer}"

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": EVAL_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        result["tokens_used"] = response.usage.total_tokens
        # Ensure all required fields exist
        result.setdefault("score", 50)
        result.setdefault("is_correct", result.get("score", 0) >= 60)
        result.setdefault("accuracy", result.get("score", 50))
        result.setdefault("clarity", result.get("score", 50))
        result.setdefault("structure", result.get("score", 50))
        result.setdefault("keywords_matched", [])
        result.setdefault("feedback", "")
        result.setdefault("optimized_answer", "")
        return result
    except (AuthenticationError, APIError, json.JSONDecodeError):
        return fallback_evaluation(req.user_answer)

# ── Code Judge ────────────────────────────────────────────────────────────────

class HintRequest(BaseModel):
    code: str
    language: str
    problem_title: str
    problem_description: str
    error: Optional[str] = None
    wrong_cases: Optional[List[dict]] = None
    hint_level: int = 1  # 1=nudge, 2=approach, 3=detailed

LANG_CONFIG = {
    "python":     {"suffix": ".py",   "run": lambda f, _: ["python3", f]},
    "javascript": {"suffix": ".js",   "run": lambda f, _: ["node", f]},
    "java":       {"suffix": ".java",  "run": None},  # special handling
    "cpp":        {"suffix": ".cpp",   "run": None},  # special handling
}

def run_code_safely(code: str, language: str, stdin: str, timeout: int = 10) -> dict:
    cfg = LANG_CONFIG.get(language)
    if not cfg:
        return {"error": f"Language '{language}' not supported", "output": "", "time_ms": 0}

    tmpdir = tempfile.mkdtemp()
    try:
        start = time.time()

        if language == "java":
            # Extract public class name or default to Solution
            import re
            match = re.search(r'public\s+class\s+(\w+)', code)
            classname = match.group(1) if match else "Solution"
            src = os.path.join(tmpdir, f"{classname}.java")
            with open(src, "w") as f:
                f.write(code)
            # Compile
            compile_result = subprocess.run(
                ["javac", src], capture_output=True, text=True, timeout=15
            )
            if compile_result.returncode != 0:
                return {"output": "", "error": compile_result.stderr.strip(), "returncode": 1, "time_ms": 0, "compile_error": True}
            # Run
            run_result = subprocess.run(
                ["java", "-cp", tmpdir, classname],
                input=str(stdin), capture_output=True, text=True, timeout=timeout
            )
            elapsed = int((time.time() - start) * 1000)
            return {"output": run_result.stdout.strip(), "error": run_result.stderr.strip(), "returncode": run_result.returncode, "time_ms": elapsed}

        elif language == "cpp":
            src = os.path.join(tmpdir, "solution.cpp")
            exe = os.path.join(tmpdir, "solution")
            with open(src, "w") as f:
                f.write(code)
            compile_result = subprocess.run(
                ["g++", "-O2", "-o", exe, src], capture_output=True, text=True, timeout=15
            )
            if compile_result.returncode != 0:
                return {"output": "", "error": compile_result.stderr.strip(), "returncode": 1, "time_ms": 0, "compile_error": True}
            run_result = subprocess.run(
                [exe], input=str(stdin), capture_output=True, text=True, timeout=timeout
            )
            elapsed = int((time.time() - start) * 1000)
            return {"output": run_result.stdout.strip(), "error": run_result.stderr.strip(), "returncode": run_result.returncode, "time_ms": elapsed}

        else:
            fname = os.path.join(tmpdir, f"solution{cfg['suffix']}")
            with open(fname, "w") as f:
                f.write(code)
            run_result = subprocess.run(
                cfg["run"](fname, None),
                input=str(stdin), capture_output=True, text=True, timeout=timeout
            )
            elapsed = int((time.time() - start) * 1000)
            return {"output": run_result.stdout.strip(), "error": run_result.stderr.strip(), "returncode": run_result.returncode, "time_ms": elapsed}

    except subprocess.TimeoutExpired:
        return {"output": "", "error": "Time Limit Exceeded", "returncode": -1, "time_ms": timeout * 1000}
    except Exception as e:
        return {"output": "", "error": str(e), "returncode": -1, "time_ms": 0}
    finally:
        import shutil
        shutil.rmtree(tmpdir, ignore_errors=True)

@app.post("/judge")
async def judge_code(req: JudgeRequest):
    results = []
    passed = 0
    total_time = 0
    compile_error = None

    for i, tc in enumerate(req.test_cases):
        run = run_code_safely(req.code, req.language, str(tc.get("input", "")))

        # Surface compile errors immediately on first case
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
    if client:
        try:
            ai_feedback = await get_code_feedback(req.code, req.language, status, compile_error)
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

async def get_code_feedback(code: str, language: str, status: str, compile_error: Optional[str] = None) -> dict:
    extra = f"\nCompile Error:\n{compile_error}" if compile_error else ""
    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "Analyze this code submission. Return JSON with: time_complexity (string), space_complexity (string), suggestions (array of strings, max 3), optimized_code (string or null). Be concise."},
            {"role": "user", "content": f"Language: {language}\nStatus: {status}{extra}\nCode:\n{code[:2000]}"},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)

@app.post("/hint")
async def get_hint(req: HintRequest):
    level_instructions = {
        1: "Give a very subtle nudge — one sentence pointing toward the right direction without revealing the approach.",
        2: "Describe the algorithmic approach/data structure to use without writing any code.",
        3: "Give a detailed hint with pseudocode or key steps, but not the full solution.",
    }
    instruction = level_instructions.get(req.hint_level, level_instructions[1])

    error_context = f"\nRuntime/Compile Error:\n{req.error}" if req.error else ""
    wrong_context = ""
    if req.wrong_cases:
        cases_str = "\n".join(f"  Input: {c.get('input')} | Got: {c.get('output')} | Expected: {c.get('expected')}" for c in req.wrong_cases[:3])
        wrong_context = f"\nFailing test cases:\n{cases_str}"

    if client is None:
        return {"hint": "AI hints are unavailable (no OpenAI key configured). Review the problem constraints and think about the data structure that best fits the access pattern.", "level": req.hint_level}

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": f"You are a coding mentor helping a student solve a DSA problem. {instruction} Do NOT give the full solution. Return JSON with: hint (string), approach_name (string or null)."},
                {"role": "user", "content": f"Problem: {req.problem_title}\n{req.problem_description[:500]}\nLanguage: {req.language}\nStudent's code:\n{req.code[:1500]}{error_context}{wrong_context}"},
            ],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception:
        return {"hint": "Could not generate hint. Try reviewing the problem constraints.", "level": req.hint_level}

# ── Session Feedback ──────────────────────────────────────────────────────────

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

    if client is None:
        avg = req.avg_score
        return {
            "overall_assessment": f"You completed the session with an average score of {avg:.0f}/100.",
            "strengths": ["Completed all questions"] if avg >= 40 else [],
            "areas_to_improve": ["Review core concepts", "Practice more regularly"],
            "recommended_topics": [],
            "next_steps": ["Review your answers below", "Practice daily for improvement"],
        }

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an interview coach. Provide session-level feedback. "
                        "Return JSON with: overall_assessment (string), strengths (list of strings), "
                        "areas_to_improve (list of strings), recommended_topics (list of strings), "
                        "next_steps (list of strings)."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Average Score: {req.avg_score:.1f}/100\nSession Summary:\n{json.dumps(summary)}",
                },
            ],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        result.setdefault("overall_assessment", f"Average score: {req.avg_score:.0f}/100")
        result.setdefault("strengths", [])
        result.setdefault("areas_to_improve", [])
        result.setdefault("recommended_topics", [])
        result.setdefault("next_steps", [])
        return result
    except (AuthenticationError, APIError, json.JSONDecodeError):
        return {
            "overall_assessment": f"Session completed with average score {req.avg_score:.0f}/100.",
            "strengths": [],
            "areas_to_improve": ["Review your answers and practice more"],
            "recommended_topics": [],
            "next_steps": ["Practice daily", "Review weak areas"],
        }

# ── Speech Transcription ─────────────────────────────────────────────────────

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), language: str = Form(default="en")):
    """Transcribe audio using OpenAI Whisper."""
    if client is None:
        raise HTTPException(503, "Transcription service unavailable: no valid OpenAI key")

    content = await audio.read()
    if len(content) < 1000:
        raise HTTPException(400, "Audio file too small or empty")

    # Write to temp file with correct extension
    ext = ".webm"
    if audio.content_type:
        if "mp4" in audio.content_type: ext = ".mp4"
        elif "ogg" in audio.content_type: ext = ".ogg"
        elif "wav" in audio.content_type: ext = ".wav"

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
        f.write(content)
        fname = f.name

    try:
        with open(fname, "rb") as f:
            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=(f"audio{ext}", f, audio.content_type or "audio/webm"),
                language=language,
                response_format="text",
            )
        text = transcript.strip() if isinstance(transcript, str) else transcript
        if not text:
            raise HTTPException(422, "Could not transcribe audio — please speak clearly and try again")
        return {"transcript": text}
    except (AuthenticationError, APIError) as e:
        raise HTTPException(502, f"Transcription failed: {str(e)}")
    finally:
        try:
            os.unlink(fname)
        except Exception:
            pass

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-interview", "llm_enabled": client is not None}
