-- ============================================================================
-- PrepPilot — Gemini Embedding Migration
-- ============================================================================
-- Provider change: OpenAI text-embedding-3-small → Google gemini-embedding-001
--
-- Dimension decision:
--   The existing schema uses vector(1536) columns (questions.embedding,
--   study_materials.embedding). gemini-embedding-001 supports configurable
--   output dimensions including 1536, so NO schema change is required.
--   The application generates embeddings with output_dimensionality=1536.
--
-- IMPORTANT — existing embeddings MUST be regenerated:
--   Vectors produced by text-embedding-3-small are NOT compatible with vectors
--   produced by gemini-embedding-001, even at the same dimension. Mixing them
--   silently corrupts similarity search. This migration NULLs all old vectors;
--   they will be re-generated lazily by the AI services using Gemini.
--
-- Run once against an existing database:
--   psql "$DATABASE_URL" -f database/migrate_gemini_embeddings.sql
--
-- Fresh installs need nothing: schema.sql already creates vector(1536) and
-- starts empty.
-- ============================================================================

BEGIN;

-- Track the embedding model so future provider changes can be detected.
CREATE TABLE IF NOT EXISTS embedding_metadata (
    id           INTEGER PRIMARY KEY DEFAULT 1,
    model        TEXT NOT NULL,
    dimension    INTEGER NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO embedding_metadata (id, model, dimension)
VALUES (1, 'gemini-embedding-001', 1536)
ON CONFLICT (id) DO UPDATE
SET model = EXCLUDED.model,
    dimension = EXCLUDED.dimension,
    updated_at = NOW();

-- Invalidate all embeddings generated with the previous (OpenAI) model.
-- They must be regenerated with gemini-embedding-001 before semantic search
-- returns meaningful results.
UPDATE questions SET embedding = NULL WHERE embedding IS NOT NULL;
UPDATE study_materials SET embedding = NULL WHERE embedding IS NOT NULL;

COMMIT;

-- ============================================================================
-- Regeneration procedure (run inside the ai-services environment):
--   For each row in questions / study_materials where embedding IS NULL:
--     1. Build the text to embed (title + description / content).
--     2. Call shared.gemini_client.embed_texts([text]).
--     3. Store the returned 1536-dim vector:
--        UPDATE questions SET embedding = $1::vector WHERE id = $2;
--   Batch calls (embed_texts accepts a list) to stay within free-tier quotas.
-- ============================================================================