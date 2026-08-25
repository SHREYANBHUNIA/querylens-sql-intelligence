CREATE TABLE IF NOT EXISTS querylens_analyses (
  id BIGSERIAL PRIMARY KEY,
  owner_id BIGINT,
  sql_text TEXT NOT NULL,
  normalized_sql TEXT NOT NULL,
  optimized_sql TEXT NOT NULL,
  complexity_label VARCHAR(16) NOT NULL,
  baseline_cost DOUBLE PRECISION NOT NULL,
  optimized_cost DOUBLE PRECISION NOT NULL,
  baseline_latency_ms DOUBLE PRECISION NOT NULL,
  optimized_latency_ms DOUBLE PRECISION NOT NULL,
  analysis_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_querylens_analyses_owner_created ON querylens_analyses (owner_id, created_at DESC);
