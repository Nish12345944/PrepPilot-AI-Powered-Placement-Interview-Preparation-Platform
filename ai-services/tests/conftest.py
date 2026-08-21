"""Pytest configuration — make service modules importable from the repo root."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure no real Gemini calls happen during unit tests.
os.environ.setdefault("GEMINI_API_KEY", "")