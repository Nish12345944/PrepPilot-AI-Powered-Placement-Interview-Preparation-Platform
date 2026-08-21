"""
Shared Google Gemini client for all PrepPilot AI services.

Uses the official `google-genai` SDK (NOT the deprecated `google-generativeai`
package and NOT the OpenAI compatibility endpoint).

Configuration (environment variables):
    GEMINI_API_KEY   – Google AI Studio API key
    MODEL_NAME       – LLM for generation (default: gemini-2.5-flash-lite)
    EMBEDDING_MODEL  – embedding model (default: gemini-embedding-001)
    EMBEDDING_DIM    – output dimension (default: 1536, matches pgvector schema)
"""
import os
import json
import re
import logging
import asyncio
from typing import Optional, List

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("preppilot.gemini")

MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.5-flash-lite")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "1536"))  # matches database vector(1536)

_client = None
_client_lock = asyncio.Lock()


class GeminiUnavailable(Exception):
    """Raised when Gemini cannot be used (missing key, import failure, etc.)."""


def _get_api_key() -> str:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key or key in ("your_gemini_api_key_here", "sk-placeholder", "your_openai_key", "sk-..."):
        return ""
    return key


def get_client():
    """Return a lazily-initialised google-genai Client, or None if unavailable."""
    global _client
    if _client is not None:
        return _client
    api_key = _get_api_key()
    if not api_key:
        return None
    try:
        from google import genai
        _client = genai.Client(api_key=api_key)
        return _client
    except ImportError:
        logger.error("google-genai package is not installed")
        return None
    except Exception as e:
        # Log server-side only; never expose the API key.
        logger.error("Failed to initialise Gemini client: %s", type(e).__name__)
        return None


def is_available() -> bool:
    return get_client() is not None


# ── Robust JSON extraction ────────────────────────────────────────────────────

def extract_json(text: str) -> Optional[dict]:
    """
    Safely extract a JSON object from an LLM response.
    Handles: raw JSON, ```json fenced blocks, and JSON embedded in prose.
    Returns None if no valid JSON object can be parsed.
    """
    if not text:
        return None
    text = text.strip()

    # 1) Direct parse
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except (json.JSONDecodeError, ValueError):
        pass

    # 2) Fenced code block ```json ... ```
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        try:
            parsed = json.loads(fence.group(1))
            if isinstance(parsed, dict):
                return parsed
        except (json.JSONDecodeError, ValueError):
            pass

    # 3) First balanced {...} block in the text
    start = text.find("{")
    while start != -1:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    try:
                        parsed = json.loads(text[start:i + 1])
                        if isinstance(parsed, dict):
                            return parsed
                    except (json.JSONDecodeError, ValueError):
                        break
                    break
        start = text.find("{", start + 1)
    return None


def _classify_error(e: Exception) -> str:
    """Classify a Gemini error for logging (never includes secrets)."""
    name = type(e).__name__
    msg = str(e).lower()
    if "api key" in msg or "unauthenticated" in msg or "401" in msg or "403" in msg:
        return "invalid_api_key"
    if "quota" in msg or "resource_exhausted" in msg or "429" in msg:
        return "quota_or_rate_limit"
    if "deadline" in msg or "timeout" in msg or "timed out" in msg:
        return "timeout"
    if "not found" in msg or "404" in msg:
        return "model_unavailable"
    if "503" in msg or "unavailable" in msg:
        return "service_unavailable"
    return name


# ── Generation ────────────────────────────────────────────────────────────────

async def generate_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_output_tokens: int = 2048,
) -> Optional[dict]:
    """
    Generate a structured JSON response using Gemini.
    Returns a parsed dict, or None on any failure (caller applies fallback).
    """
    client = get_client()
    if client is None:
        return None
    try:
        from google.genai import types
        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                response_mime_type="application/json",
            ),
        )
        return extract_json(response.text or "")
    except Exception as e:
        logger.error("Gemini generation failed (%s): %s", _classify_error(e), type(e).__name__)
        return None


async def generate_text(
    system_prompt: str,
    messages: List[dict],
    temperature: float = 0.4,
    max_output_tokens: int = 2500,
) -> Optional[dict]:
    """
    Generate free-form text using Gemini with a chat history.
    `messages` is a list of {"role": "user"|"assistant", "content": str}.
    Returns {"text": str, "tokens_used": int} or None on failure.
    """
    client = get_client()
    if client is None:
        return None
    try:
        from google.genai import types
        contents = [
            types.Content(
                role="model" if m["role"] == "assistant" else "user",
                parts=[types.Part(text=m["content"])],
            )
            for m in messages
            if m.get("role") in ("user", "assistant") and m.get("content")
        ]
        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            ),
        )
        usage = getattr(response, "usage_metadata", None)
        tokens = getattr(usage, "total_token_count", 0) or 0
        return {"text": response.text or "", "tokens_used": tokens}
    except Exception as e:
        logger.error("Gemini chat failed (%s): %s", _classify_error(e), type(e).__name__)
        return None


# ── Embeddings ────────────────────────────────────────────────────────────────

async def embed_texts(texts: List[str]) -> Optional[List[List[float]]]:
    """
    Generate embeddings with gemini-embedding-001.
    Output dimension is EMBEDDING_DIM (default 1536) to match the existing
    pgvector schema — vector(1536). Returns None on failure.
    """
    client = get_client()
    if client is None:
        return None
    if not texts:
        return []
    try:
        from google.genai import types
        response = await client.aio.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=texts,
            config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM),
        )
        vectors = [list(e.values) for e in response.embeddings]
        if any(len(v) != EMBEDDING_DIM for v in vectors):
            logger.error("Gemini embedding dimension mismatch: expected %s", EMBEDDING_DIM)
            return None
        return vectors
    except Exception as e:
        logger.error("Gemini embedding failed (%s): %s", _classify_error(e), type(e).__name__)
        return None