import { Pool } from "pg";
import type { QueryLensAnalysis } from "./querylensAnalysis";

let pool: Pool | null = null;

function getPool(): Pool | null {
  const connectionString = process.env.QUERYLENS_POSTGRES_URL;
  if (!connectionString) return null;
  if (!pool) pool = new Pool({ connectionString, max: 4, ssl: { rejectUnauthorized: false } });
  return pool;
}

export async function savePostgresHistory(ownerId: number | null, sql: string, analysis: QueryLensAnalysis): Promise<boolean> {
  const database = getPool();
  if (!database) return false;
  try {
    await database.query(`CREATE TABLE IF NOT EXISTS querylens_analyses (id BIGSERIAL PRIMARY KEY, owner_id BIGINT, sql_text TEXT NOT NULL, normalized_sql TEXT NOT NULL, optimized_sql TEXT NOT NULL, complexity_label VARCHAR(16) NOT NULL, baseline_cost DOUBLE PRECISION NOT NULL, optimized_cost DOUBLE PRECISION NOT NULL, baseline_latency_ms DOUBLE PRECISION NOT NULL, optimized_latency_ms DOUBLE PRECISION NOT NULL, analysis_payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await database.query(`INSERT INTO querylens_analyses (owner_id, sql_text, normalized_sql, optimized_sql, complexity_label, baseline_cost, optimized_cost, baseline_latency_ms, optimized_latency_ms, analysis_payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [ownerId, sql, analysis.normalizedSql, analysis.optimizedSql, analysis.complexity.label, analysis.baselinePlan.totalCost, analysis.optimizedPlan.totalCost, analysis.benchmark.baselineLatencyMs, analysis.benchmark.optimizedLatencyMs, analysis]);
    return true;
  } catch (error) { console.warn("[QueryLens] PostgreSQL history write failed; using project database fallback.", error); return false; }
}

export async function loadPostgresHistory(ownerId: number | null, limit: number) {
  const database = getPool();
  if (!database) return null;
  try {
    const clause = ownerId ? "owner_id = $1" : "owner_id IS NULL";
    const values = ownerId ? [ownerId, limit] : [limit];
    const limitIndex = ownerId ? "$2" : "$1";
    const result = await database.query(`SELECT id, sql_text, complexity_label, baseline_cost, optimized_cost, baseline_latency_ms, optimized_latency_ms, analysis_payload, created_at FROM querylens_analyses WHERE ${clause} ORDER BY created_at DESC LIMIT ${limitIndex}`, values);
    return result.rows.map(row => ({ id: String(row.id), sql: row.sql_text, complexity: row.complexity_label, baselineCost: Number(row.baseline_cost), optimizedCost: Number(row.optimized_cost), baselineLatencyMs: Number(row.baseline_latency_ms), optimizedLatencyMs: Number(row.optimized_latency_ms), payload: row.analysis_payload, createdAt: row.created_at }));
  } catch (error) { console.warn("[QueryLens] PostgreSQL history read failed; using project database fallback.", error); return null; }
}
