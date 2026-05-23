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
client = AsyncOpenAI(api_key=OPENAI_KEY) if OPENAI_KEY.startswith("sk-") else None

# ── Models ────────────────────────────────────────────────────────────────────

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

# Broad keyword extractor: tech terms + meaningful words (3+ chars, not stopwords)
STOPWORDS = {
    "the", "and", "for", "are", "with", "this", "that", "have", "from",
    "will", "your", "our", "you", "not", "but", "can", "all", "any",
    "been", "has", "its", "was", "were", "they", "their", "them", "who",
    "what", "when", "how", "also", "into", "more", "such", "than", "then",
    "some", "each", "both", "about", "would", "should", "could", "must",
    "may", "use", "used", "using", "work", "working", "team", "role",
    "strong", "good", "well", "able", "new", "high", "large", "key",
    "including", "required", "preferred", "experience", "skills", "ability",
    "knowledge", "understanding", "excellent", "proficiency", "familiarity",
}

def extract_keywords(text: str) -> set:
    """Extract meaningful keywords from text — tech terms + domain words."""
    # Normalize and tokenize
    words = re.findall(r'\b[A-Za-z][A-Za-z0-9+#.\-]{2,}\b', text)
    keywords = set()
    for w in words:
        lower = w.lower()
        if lower not in STOPWORDS and len(lower) >= 3:
            keywords.add(lower)
    return keywords

def extract_skills_from_parsed(parsed_data: Optional[dict]) -> set:
    """Extract skills list from parsed resume data."""
    if not parsed_data:
        return set()
    skills = parsed_data.get("skills", [])
    if isinstance(skills, list):
        return {s.lower().strip() for s in skills if s}
    return set()

def basic_parse(raw_text: str) -> dict:
    emails = re.findall(r'[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}', raw_text)
    phones = re.findall(r'[\+\(]?[0-9][0-9\s\-\(\)]{7,}[0-9]', raw_text)
    skills = list(extract_keywords(raw_text))[:30]
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

# ── ATS Score Computation ─────────────────────────────────────────────────────

def compute_ats_score(
    resume_text: str,
    jd_text: str,
    parsed_data: Optional[dict] = None,
    completeness_score: float = 70,
) -> tuple[float, dict]:
    """
    Compute ATS score based on:
    - Keyword overlap between resume text and JD (40%)
    - Skills from parsed_data matched against JD keywords (30%)
    - Completeness score from LLM (30%)
    Returns (score, keyword_matches_dict)
    """
    resume_kw = extract_keywords(resume_text)
    jd_kw = extract_keywords(jd_text)
    parsed_skills = extract_skills_from_parsed(parsed_data)

    # Keyword match score
    matched_kw = resume_kw & jd_kw
    keyword_score = (len(matched_kw) / max(len(jd_kw), 1)) * 100

    # Skills match score (parsed skills vs JD keywords)
    matched_skills = parsed_skills & jd_kw
    skills_score = (len(matched_skills) / max(len(jd_kw), 1)) * 100

    # Combined score
    ats_score = round(
        keyword_score * 0.40 +
        skills_score * 0.30 +
        completeness_score * 0.30,
        2
    )
    ats_score = min(ats_score, 100.0)

    missing = list(jd_kw - resume_kw - parsed_skills)
    # Sort missing by length (shorter = more likely to be a real tech term)
    missing.sort(key=len)

    return ats_score, {
        "matched": sorted(list(matched_kw | matched_skills)),
        "missing": missing[:20],
        "suggested": missing[:10],
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
                        "Return JSON with: name, email, phone, skills (list of strings — include ALL technical skills, tools, languages, frameworks), "
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
        structured = basic_parse(raw_text)

    return {"raw_text": raw_text, "structured": structured}

# ── ATS Analyzer ─────────────────────────────────────────────────────────────

def basic_analyze(resume_text: str, jd_text: str, parsed_data: Optional[dict] = None) -> dict:
    ats_score, keyword_matches = compute_ats_score(resume_text, jd_text, parsed_data)
    missing = keyword_matches["missing"]
    return {
        "ats_score": ats_score,
        "keyword_matches": keyword_matches,
        "section_scores": {"skills": 70, "experience": 70, "education": 70, "projects": 70, "summary": 70},
        "improvements": [
            {
                "section": "keywords",
                "issue": "Missing keywords from job description",
                "suggestion": f"Add these to your resume: {', '.join(missing[:8])}",
            }
        ] if missing else [],
        "overall_fit": "excellent" if ats_score >= 80 else "good" if ats_score >= 60 else "fair" if ats_score >= 40 else "poor",
    }

@app.post("/analyze")
async def analyze_resume(req: AnalyzeRequest):
    if not req.resume_text or not req.resume_text.strip():
        raise HTTPException(400, "Resume text is empty. Please re-upload your resume.")

    if client is None:
        return basic_analyze(req.resume_text, req.job_description, req.parsed_data)

    try:
        response = await client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "gpt-4o-mini"),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an ATS expert and career coach. Analyze the resume against the job description. "
                        "Return JSON with: "
                        "section_scores ({skills: 0-100, experience: 0-100, education: 0-100, projects: 0-100, summary: 0-100}), "
                        "completeness_score (0-100, how complete and relevant the resume is for this JD), "
                        "improvements (list of {section, issue, suggestion}), "
                        "suggested_keywords (list of important missing keywords from the JD not in the resume), "
                        "overall_fit (one of: poor/fair/good/excellent)."
                    ),
                },
                {
                    "role": "user",
                    "content": f"RESUME:\n{req.resume_text[:2500]}\n\nJOB DESCRIPTION:\n{req.job_description[:2000]}",
                },
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        llm_analysis = json.loads(response.choices[0].message.content)
    except (AuthenticationError, APIError):
        return basic_analyze(req.resume_text, req.job_description, req.parsed_data)

    ats_score, keyword_matches = compute_ats_score(
        req.resume_text,
        req.job_description,
        req.parsed_data,
        llm_analysis.get("completeness_score", 70),
    )

    # Merge LLM suggested keywords into the missing list
    llm_suggested = [k.lower() for k in llm_analysis.get("suggested_keywords", [])]
    all_suggested = list(dict.fromkeys(llm_suggested + keyword_matches["suggested"]))[:15]

    return {
        "ats_score": ats_score,
        "keyword_matches": {
            "matched": keyword_matches["matched"],
            "missing": keyword_matches["missing"],
            "suggested": all_suggested,
        },
        "section_scores": llm_analysis.get("section_scores", {}),
        "improvements": llm_analysis.get("improvements", []),
        "overall_fit": llm_analysis.get("overall_fit", "fair"),
    }

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-resume", "llm_enabled": client is not None}
