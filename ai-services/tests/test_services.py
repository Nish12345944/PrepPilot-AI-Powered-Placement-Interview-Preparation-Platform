"""Tests for AI services (no real OpenAI calls)."""
import pytest
from fastapi.testclient import TestClient

# ── Interview Service Tests ───────────────────────────────────
def test_interview_health():
    from interview.main import app
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_run_code_python_correct():
    from interview.main import run_code_safely
    result = run_code_safely("print(sum([1,2,3]))", "python", "")
    assert result["output"] == "6"
    assert result["error"] == ""

def test_run_code_tle():
    from interview.main import run_code_safely
    result = run_code_safely("while True: pass", "python", "", timeout=1)
    assert "Time Limit" in result["error"]

def test_run_code_unsupported_language():
    from interview.main import run_code_safely
    result = run_code_safely("code", "ruby", "")
    assert "not supported" in result["error"]

# ── Resume Service Tests ──────────────────────────────────────
def test_resume_health():
    from resume.main import app
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200

def test_keyword_extraction():
    from resume.main import extract_keywords
    text = "Experience with Python, React, and AWS deployment using Docker"
    kw = extract_keywords(text)
    assert "Python" in kw
    assert "React" in kw
    assert "AWS" in kw
    assert "Docker" in kw

def test_ats_score_computation():
    from resume.main import compute_ats_score
    resume = "Python Django REST API AWS Docker PostgreSQL"
    jd = "Python AWS Docker Kubernetes React"
    score = compute_ats_score(resume, jd, {"completeness_score": 80})
    assert 0 <= score <= 100

# ── Learning Service Tests ────────────────────────────────────
def test_learning_health():
    from learning.main import app
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200

def test_priority_score_weak_topic():
    from learning.main import compute_priority_score
    weak = {"mastery_score": 20, "attempts": 2}
    strong = {"mastery_score": 90, "attempts": 10}
    assert compute_priority_score(weak) > compute_priority_score(strong)

# ── Copilot Service Tests ─────────────────────────────────────
def test_copilot_health():
    from copilot.main import app
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200

def test_intent_detection():
    from copilot.main import detect_intent
    assert detect_intent("explain dynamic programming") == "explain_concept"
    assert detect_intent("debug my code it has an error") == "debug_code"
    assert detect_intent("how to prepare for amazon interview") == "company_prep"
    assert detect_intent("what is my roadmap") == "roadmap"
    assert detect_intent("help with my resume ats score") == "resume_help"
