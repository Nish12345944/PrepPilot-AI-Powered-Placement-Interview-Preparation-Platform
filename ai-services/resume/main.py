"""
AI Resume Service – parse resumes, ATS scoring, keyword analysis.
Port: 8003
"""
import os
import re
import json
import base64
import io
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from openai import AsyncOpenAI, AuthenticationError, APIError
from dotenv import load_dotenv

load_dotenv()

try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

app = FastAPI(title="PrepPilot Resume AI", version="1.0.0")

OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
# Only create real client if key looks valid
client = AsyncOpenAI(api_key=OPENAI_KEY) if OPENAI_KEY.startswith("sk-") else None

# ── Models ───────────────────────────────────────────────────────────────────

class ParseRequest(BaseModel):
    file_content: str  # base64 encoded
    file_type: str

class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str
    parsed_data: Optional[dict] = None

# ── Helpers ───────────────────────────────────────────────────────────────────

def extract_text_from_pdf(content_bytes: bytes) -> str:
    if not PDF_AVAILABLE:
        return ""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(content_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        return ""

def extract_keywords(text: str) -> set:
    tech_pattern = (
        r'\b(?:Python|Java|JavaScript|React|Node\.js|SQL|AWS|Docker|Kubernetes|'
        r'ML|AI|REST|API|Git|Agile|Scrum|TypeScript|Go|C\+\+|MongoDB|PostgreSQL|'
        r'Redis|FastAPI|Django|Spring|TensorFlow|PyTorch|HTML|CSS|Vue|Angular|'
        r'Flutter|Swift|Kotlin|Ruby|PHP|Rust|Scala|Spark|Hadoop|Linux|CI/CD)\b'
    )
    return set(re.findall(tech_pattern, text, re.IGNORECASE))

def basic_parse(raw_text: str) -> dict:
    """Fallback parser using regex when OpenAI is unavailable."""
    emails = re.findall(r'[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}', raw_text)
    phones = re.findall(r'[\+\(]?[0-9][0-9\s\-\(\)]{7,}[0-9]', raw_text)
    skills = list(extract_keywords(raw_text))
    return {
        "name": "",
        "email": emails[0] if emails else "",
        "phone": phones[0] if phones else "",
        "skills": skills,
        "experience": [],
        "education": [],
        "projects": [],
        "certifications": [],
        "summary": raw_text[:300],
    }

# ── Resume Parser ─────────────────────────────────────────────────────────────

@app.post("/parse")
async def parse_resume(req: ParseRequest):
    try:
        content_bytes = base64.b64decode(req.file_content)
    except Exception:
        raise HTTPException(400, "Invalid file encoding")

    if "pdf" in req.file_type:
        raw_text = extract_text_from_pdf(content_bytes)
    else:
        raw_text = content_bytes.decode("utf-8", errors="ignore")

    if not raw_text.strip():
        raise HTTPException(400, "Could not extract text from resume. Ensure the PDF is not scanned/image-based.")

    # Try LLM parsing, fall back to regex if key missing/invalid
    if client is None:
        return {"raw_text": raw_text, "structured": basic_parse(raw_text)}

    try:
        response = await client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "gpt-4o-mini"),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Parse this resume and extract structured data. "
                        "Return JSON with: name, email, phone, skills (list of strings), "
                        "experience (list of {company, role, duration, description}), "
                        "education (list of {institution, degree, year}), "
                        "projects (list of {name, description, tech_stack}), "
                        "certifications (list), summary."
                    ),
                },
                {"role": "user", "content": raw_text[:4000]},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        structured = json.loads(response.choices[0].message.content)
    except (AuthenticationError, APIError):
        # Graceful fallback — still return parsed text so upload succeeds
        structured = basic_parse(raw_text)

    return {"raw_text": raw_text, "structured": structured}

# ── ATS Analyzer ─────────────────────────────────────────────────────────────

def compute_ats_score(resume_text: str, jd_text: str, completeness_score: float = 70) -> float:
    resume_kw = extract_keywords(resume_text)
    jd_kw = extract_keywords(jd_text)
    keyword_score = (len(resume_kw & jd_kw) / max(len(jd_kw), 1)) * 100
    return round(keyword_score * 0.4 + completeness_score * 0.6, 2)

def basic_analyze(resume_text: str, jd_text: str) -> dict:
    """Fallback analysis using only regex when OpenAI is unavailable."""
    resume_kw = extract_keywords(resume_text)
    jd_kw = extract_keywords(jd_text)
    matched = list(resume_kw & jd_kw)
    missing = list(jd_kw - resume_kw)
    score = compute_ats_score(resume_text, jd_text)
    return {
        "ats_score": score,
        "keyword_matches": {"matched": matched, "missing": missing, "suggested": missing[:5]},
        "section_scores": {"skills": 70, "experience": 70, "education": 70, "projects": 70, "summary": 70},
        "improvements": [
            {"section": "keywords", "issue": "Missing keywords detected", "suggestion": f"Add these keywords: {', '.join(missing[:5])}"}
        ] if missing else [],
        "overall_fit": "good" if score >= 70 else "fair" if score >= 40 else "poor",
    }

@app.post("/analyze")
async def analyze_resume(req: AnalyzeRequest):
    if not req.resume_text or not req.resume_text.strip():
        raise HTTPException(400, "Resume text is empty. Please re-upload your resume.")

    if client is None:
        return basic_analyze(req.resume_text, req.job_description)

    try:
        response = await client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "gpt-4o-mini"),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an ATS expert and career coach. Analyze the resume against the job description. "
                        "Return JSON with: section_scores ({skills: 0-100, experience: 0-100, education: 0-100, "
                        "projects: 0-100, summary: 0-100}), completeness_score (0-100), "
                        "improvements (list of {section, issue, suggestion}), "
                        "suggested_keywords (list of important missing keywords), "
                        "overall_fit (string: poor/fair/good/excellent)."
                    ),
                },
                {
                    "role": "user",
                    "content": f"RESUME:\n{req.resume_text[:2000]}\n\nJOB DESCRIPTION:\n{req.job_description[:1500]}",
                },
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        analysis = json.loads(response.choices[0].message.content)
    except (AuthenticationError, APIError):
        return basic_analyze(req.resume_text, req.job_description)

    resume_kw = extract_keywords(req.resume_text)
    jd_kw = extract_keywords(req.job_description)
    ats_score = compute_ats_score(
        req.resume_text, req.job_description,
        analysis.get("completeness_score", 70)
    )

    return {
        "ats_score": ats_score,
        "keyword_matches": {
            "matched": list(resume_kw & jd_kw),
            "missing": list(jd_kw - resume_kw),
            "suggested": analysis.get("suggested_keywords", []),
        },
        "section_scores": analysis.get("section_scores", {}),
        "improvements": analysis.get("improvements", []),
        "overall_fit": analysis.get("overall_fit", "fair"),
    }

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-resume", "llm_enabled": client is not None}
