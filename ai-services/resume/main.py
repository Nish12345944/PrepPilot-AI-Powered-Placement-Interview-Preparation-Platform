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
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

app = FastAPI(title="PrepPilot Resume AI", version="1.0.0")
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── Models ───────────────────────────────────────────────────────────────────

class ParseRequest(BaseModel):
    file_content: str  # base64 encoded
    file_type: str

class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str
    parsed_data: Optional[dict] = None

# ── Resume Parser ─────────────────────────────────────────────────────────────

def extract_text_from_pdf(content_bytes: bytes) -> str:
    if not PDF_AVAILABLE:
        return ""
    reader = PyPDF2.PdfReader(io.BytesIO(content_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)

@app.post("/parse")
async def parse_resume(req: ParseRequest):
    content_bytes = base64.b64decode(req.file_content)

    if "pdf" in req.file_type:
        raw_text = extract_text_from_pdf(content_bytes)
    else:
        raw_text = content_bytes.decode("utf-8", errors="ignore")

    if not raw_text.strip():
        raise HTTPException(400, "Could not extract text from resume")

    # Use LLM to structure the resume
    response = await client.chat.completions.create(
        model=os.getenv("MODEL_NAME", "gpt-4o-mini"),
        messages=[
            {
                "role": "system",
                "content": "Parse this resume and extract structured data. Return JSON with: name, email, phone, skills (list), experience (list of {company, role, duration, description}), education (list of {institution, degree, year}), projects (list of {name, description, tech_stack}), certifications (list), summary.",
            },
            {"role": "user", "content": raw_text[:4000]},  # token limit
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    structured = json.loads(response.choices[0].message.content)
    return {"raw_text": raw_text, "structured": structured}

# ── ATS Analyzer ─────────────────────────────────────────────────────────────

def extract_keywords(text: str) -> set:
    """Simple keyword extraction using regex patterns."""
    # Tech keywords pattern
    tech_pattern = r'\b(?:Python|Java|JavaScript|React|Node\.js|SQL|AWS|Docker|Kubernetes|ML|AI|REST|API|Git|Agile|Scrum|TypeScript|Go|C\+\+|MongoDB|PostgreSQL|Redis|FastAPI|Django|Spring|TensorFlow|PyTorch)\b'
    return set(re.findall(tech_pattern, text, re.IGNORECASE))

def compute_ats_score(resume_text: str, jd_text: str, section_analysis: dict) -> float:
    """
    ATS Score = keyword_match * 0.4 + section_completeness * 0.3 + formatting * 0.3
    """
    resume_kw = extract_keywords(resume_text)
    jd_kw = extract_keywords(jd_text)

    keyword_score = (len(resume_kw & jd_kw) / max(len(jd_kw), 1)) * 100
    section_score = section_analysis.get("completeness_score", 70)

    return round(keyword_score * 0.4 + section_score * 0.6, 2)

@app.post("/analyze")
async def analyze_resume(req: AnalyzeRequest):
    resume_kw = extract_keywords(req.resume_text)
    jd_kw = extract_keywords(req.job_description)

    matched = list(resume_kw & jd_kw)
    missing = list(jd_kw - resume_kw)

    # LLM deep analysis
    response = await client.chat.completions.create(
        model=os.getenv("MODEL_NAME", "gpt-4o-mini"),
        messages=[
            {
                "role": "system",
                "content": "You are an ATS expert and career coach. Analyze the resume against the job description. Return JSON with: section_scores ({skills: 0-100, experience: 0-100, education: 0-100, projects: 0-100, summary: 0-100}), completeness_score (0-100), improvements (list of {section, issue, suggestion}), suggested_keywords (list of important missing keywords), overall_fit (string: poor/fair/good/excellent).",
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
    ats_score = compute_ats_score(req.resume_text, req.job_description, analysis)

    return {
        "ats_score": ats_score,
        "keyword_matches": {
            "matched": matched,
            "missing": missing,
            "suggested": analysis.get("suggested_keywords", []),
        },
        "section_scores": analysis.get("section_scores", {}),
        "improvements": analysis.get("improvements", []),
        "overall_fit": analysis.get("overall_fit", "fair"),
    }

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-resume"}
