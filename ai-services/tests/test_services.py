"""
Tests for AI services — provider-independent (no live Gemini API calls).
All LLM interactions are mocked via the shared gemini_client module.
"""
import json
import pytest
from fastapi.testclient import TestClient


# ── Shared Gemini client tests ───────────────────────────────────────────────

def test_extract_json_direct():
    from shared.gemini_client import extract_json
    assert extract_json('{"a": 1}') == {"a": 1}


def test_extract_json_fenced():
    from shared.gemini_client import extract_json
    NL = chr(10)
    text = NL.join([
        "Here you go:",
        "```json",
        '{"score": 90, "feedback": "great"}',
        "```",
    ])
    assert extract_json(text) == {"score": 90, "feedback": "great"}


def test_extract_json_embedded_in_prose():
    from shared.gemini_client import extract_json
    text = 'The evaluation is {"score": 42, "nested": {"x": 1}} as requested.'
    assert extract_json(text) == {"score": 42, "nested": {"x": 1}}


def test_extract_json_invalid_returns_none():
    from shared.gemini_client import extract_json
    assert extract_json("not json at all") is None
    assert extract_json("") is None
    assert extract_json(None) is None


def test_gemini_unavailable_without_key(monkeypatch):
    import shared.gemini_client as gc
    monkeypatch.setenv("GEMINI_API_KEY", "")
    gc._client = None
    assert gc.get_client() is None
    assert gc.is_available() is False


def test_gemini_placeholder_keys_rejected(monkeypatch):
    import shared.gemini_client as gc
    for placeholder in ("your_gemini_api_key_here", "sk-placeholder", "sk-..."):
        monkeypatch.setenv("GEMINI_API_KEY", placeholder)
        gc._client = None
        assert gc.get_client() is None
    gc._client = None


# ── Interview Service Tests ──────────────────────────────────────────────────

@pytest.fixture()
def interview_app(monkeypatch):
    """Interview app with Gemini available and generate_json mocked."""
    import interview.main as m
    monkeypatch.setattr(m, "is_available", lambda: True)
    return m


def test_interview_health():
    from interview.main import app
    res = TestClient(app).get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_interview_evaluate_success(interview_app, monkeypatch):
    async def fake_generate_json(system, prompt, temperature=0.3, **kw):
        return {
            "score": 85, "is_correct": True, "accuracy": 80, "clarity": 90,
            "structure": 88, "keywords_matched": ["recursion"],
            "feedback": "Good answer.", "optimized_answer": "Use memoization.",
        }
    monkeypatch.setattr(interview_app, "generate_json", fake_generate_json)
    res = TestClient(interview_app.app).post("/evaluate", json={
        "question_id": "q1", "user_answer": "Recursion uses a base case.",
        "session_type": "technical",
    })
    assert res.status_code == 200
    body = res.json()
    assert body["score"] == 85
    assert body["is_correct"] is True


def test_interview_evaluate_malformed_response_uses_fallback(interview_app, monkeypatch):
    async def bad_generate_json(system, prompt, temperature=0.3, **kw):
        return None  # simulates malformed/unavailable response
    monkeypatch.setattr(interview_app, "generate_json", bad_generate_json)
    res = TestClient(interview_app.app).post("/evaluate", json={
        "question_id": "q1", "user_answer": "some answer here",
        "session_type": "technical",
    })
    assert res.status_code == 200
    body = res.json()
    assert "temporarily unavailable" in body["feedback"]
    assert 0 <= body["score"] <= 100


def test_interview_evaluate_empty_answer_rejected():
    from interview.main import app
    res = TestClient(app).post("/evaluate", json={
        "question_id": "q1", "user_answer": "   ", "session_type": "technical",
    })
    assert res.status_code == 400


def test_interview_hint_success(interview_app, monkeypatch):
    async def fake_generate_json(system, prompt, temperature=0.4, **kw):
        return {"hint": "Think about hash maps.", "approach_name": "Two Sum"}
    monkeypatch.setattr(interview_app, "generate_json", fake_generate_json)
    res = TestClient(interview_app.app).post("/hint", json={
        "code": "def f(): pass", "language": "python",
        "problem_title": "Two Sum", "problem_description": "Find two indices.",
        "hint_level": 2,
    })
    assert res.status_code == 200
    assert res.json()["hint"] == "Think about hash maps."


def test_interview_hint_fallback_on_error(interview_app, monkeypatch):
    async def bad_generate_json(system, prompt, temperature=0.4, **kw):
        return None
    monkeypatch.setattr(interview_app, "generate_json", bad_generate_json)
    res = TestClient(interview_app.app).post("/hint", json={
        "code": "x", "language": "python",
        "problem_title": "T", "problem_description": "D",
    })
    assert res.status_code == 200
    assert "Could not generate hint" in res.json()["hint"]


def test_interview_session_feedback_success(interview_app, monkeypatch):
    async def fake_generate_json(system, prompt, temperature=0.4, **kw):
        return {"overall_assessment": "Solid session.", "strengths": ["DSA"],
                "areas_to_improve": ["System design"], "recommended_topics": [],
                "next_steps": []}
    monkeypatch.setattr(interview_app, "generate_json", fake_generate_json)
    res = TestClient(interview_app.app).post("/session-feedback", json={
        "responses": [{"title": "Q1", "score": 70, "ai_evaluation": {"feedback": "ok"}}],
        "avg_score": 70,
    })
    assert res.status_code == 200
    assert res.json()["overall_assessment"] == "Solid session."


def test_interview_session_feedback_fallback(interview_app, monkeypatch):
    async def bad_generate_json(system, prompt, temperature=0.4, **kw):
        return None
    monkeypatch.setattr(interview_app, "generate_json", bad_generate_json)
    res = TestClient(interview_app.app).post("/session-feedback", json={
        "responses": [], "avg_score": 55,
    })
    assert res.status_code == 200
    assert "average score" in res.json()["overall_assessment"]


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


# ── Resume Service Tests ─────────────────────────────────────────────────────

@pytest.fixture()
def resume_app(monkeypatch):
    import resume.main as m
    monkeypatch.setattr(m, "is_available", lambda: True)
    return m


def test_resume_health():
    from resume.main import app
    res = TestClient(app).get("/health")
    assert res.status_code == 200


def test_resume_analyze_success(resume_app, monkeypatch):
    async def fake_generate_json(system, prompt, temperature=0.3, **kw):
        return {
            "section_scores": {"skills": 80, "experience": 75, "education": 70,
                               "projects": 65, "summary": 72},
            "completeness_score": 78,
            "improvements": [],
            "suggested_keywords": ["kubernetes"],
            "overall_fit": "good",
        }
    monkeypatch.setattr(resume_app, "generate_json", fake_generate_json)
    res = TestClient(resume_app.app).post("/analyze", json={
        "resume_text": "Python Django REST API AWS Docker PostgreSQL developer",
        "job_description": "Python AWS Docker Kubernetes React engineer",
    })
    assert res.status_code == 200
    body = res.json()
    assert 0 <= body["ats_score"] <= 100
    assert body["overall_fit"] == "good"
    assert "kubernetes" in [k.lower() for k in body["keyword_matches"]["suggested"]]


def test_resume_analyze_malformed_response_uses_basic(resume_app, monkeypatch):
    async def bad_generate_json(system, prompt, temperature=0.3, **kw):
        return None
    monkeypatch.setattr(resume_app, "generate_json", bad_generate_json)
    res = TestClient(resume_app.app).post("/analyze", json={
        "resume_text": "Python AWS Docker developer",
        "job_description": "Python AWS Docker Kubernetes",
    })
    assert res.status_code == 200
    body = res.json()
    assert 0 <= body["ats_score"] <= 100
    assert body["section_scores"]["skills"] == 70  # basic fallback values


def test_keyword_extraction():
    from resume.main import extract_keywords
    text = "Experience with Python, React, and AWS deployment using Docker"
    kw = extract_keywords(text)
    assert "python" in kw
    assert "react" in kw
    assert "aws" in kw
    assert "docker" in kw


def test_ats_score_computation():
    from resume.main import compute_ats_score
    resume = "Python Django REST API AWS Docker PostgreSQL"
    jd = "Python AWS Docker Kubernetes React"
    score, _matches = compute_ats_score(resume, jd, {"completeness_score": 80})
    assert 0 <= score <= 100


# ── Learning Service Tests ───────────────────────────────────────────────────

@pytest.fixture()
def learning_app(monkeypatch):
    import learning.main as m
    monkeypatch.setattr(m, "is_available", lambda: True)
    return m


def test_learning_health():
    from learning.main import app
    res = TestClient(app).get("/health")
    assert res.status_code == 200


def test_recommend_success(learning_app, monkeypatch):
    async def fake_generate_json(system, prompt, temperature=0.4, **kw):
        return {"roadmap": [{"topic": "DP"}], "weekly_plan": [], "tips": ["practice"]}
    monkeypatch.setattr(learning_app, "generate_json", fake_generate_json)
    res = TestClient(learning_app.app).post("/recommend", json={
        "user_id": "u1",
        "performance": [{"name": "Arrays", "mastery_score": 30, "attempts": 2}],
        "user_info": {"target_company": "Google"},
    })
    assert res.status_code == 200
    body = res.json()
    assert body["priority_topics"] == ["Arrays"]


def test_recommend_fallback(learning_app, monkeypatch):
    async def bad_generate_json(system, prompt, temperature=0.4, **kw):
        return None
    monkeypatch.setattr(learning_app, "generate_json", bad_generate_json)
    res = TestClient(learning_app.app).post("/recommend", json={
        "user_id": "u1",
        "performance": [{"name": "Arrays", "mastery_score": 30, "attempts": 2}],
        "user_info": {},
    })
    assert res.status_code == 200
    assert res.json()["roadmap"] == []


def test_priority_score_weak_topic():
    from learning.main import compute_priority_score
    weak = {"mastery_score": 20, "attempts": 2}
    strong = {"mastery_score": 90, "attempts": 10}
    assert compute_priority_score(weak) > compute_priority_score(strong)


# ── Copilot Service Tests ────────────────────────────────────────────────────

@pytest.fixture()
def copilot_app(monkeypatch):
    import copilot.main as m
    monkeypatch.setattr(m, "is_available", lambda: True)
    return m


def test_copilot_health():
    from copilot.main import app
    res = TestClient(app).get("/health")
    assert res.status_code == 200


def test_copilot_chat_success(copilot_app, monkeypatch):
    async def fake_generate_text(system, messages, temperature=0.4, **kw):
        return {"text": "Here is a full explanation...", "tokens_used": 123}
    monkeypatch.setattr(copilot_app, "generate_text", fake_generate_text)
    res = TestClient(copilot_app.app).post("/chat", json={
        "message": "explain dynamic programming",
        "history": [],
        "user_context": {"target_company": "Google", "target_role": "SDE"},
    })
    assert res.status_code == 200
    body = res.json()
    assert body["response"].startswith("Here is")
    assert body["tokens_used"] == 123
    assert body["intent"] == "explain_concept"


def test_copilot_chat_gemini_error_graceful(copilot_app, monkeypatch):
    async def bad_generate_text(system, messages, temperature=0.4, **kw):
        return None
    monkeypatch.setattr(copilot_app, "generate_text", bad_generate_text)
    res = TestClient(copilot_app.app).post("/chat", json={
        "message": "hello", "history": [], "user_context": {},
    })
    assert res.status_code == 200
    assert "temporarily unavailable" in res.json()["response"]


def test_copilot_chat_no_key_uses_fallback(monkeypatch):
    import copilot.main as m
    monkeypatch.setattr(m, "is_available", lambda: False)
    res = TestClient(m.app).post("/chat", json={
        "message": "hello", "history": [], "user_context": {},
    })
    assert res.status_code == 200
    assert "Gemini API key not configured" in res.json()["response"]


def test_intent_detection():
    from copilot.main import detect_intent
    assert detect_intent("explain dynamic programming") == "explain_concept"
    assert detect_intent("debug my code it has an error") == "debug_code"
    assert detect_intent("amazon leadership principles") == "company_prep"
    assert detect_intent("create a study roadmap") == "roadmap"
    assert detect_intent("help with my resume ats score") == "resume_help"


# ── Embeddings (mocked) ──────────────────────────────────────────────────────

def test_embed_texts_dimension_and_mock(monkeypatch):
    import shared.gemini_client as gc

    class FakeEmbedding:
        def __init__(self, dim):
            self.values = [0.01] * dim

    class FakeModels:
        async def embed_content(self, model, contents, config=None):
            class R:
                embeddings = [FakeEmbedding(gc.EMBEDDING_DIM) for _ in contents]
            return R()

    class FakeClient:
        class aio:
            models = FakeModels()

    monkeypatch.setattr(gc, "get_client", lambda: FakeClient())
    vectors = __import__("asyncio").run(gc.embed_texts(["hello", "world"]))
    assert len(vectors) == 2
    assert all(len(v) == gc.EMBEDDING_DIM for v in vectors)


def test_embed_texts_unavailable_returns_none(monkeypatch):
    import shared.gemini_client as gc
    monkeypatch.setattr(gc, "get_client", lambda: None)
    import asyncio
    assert asyncio.run(gc.embed_texts(["x"])) is None