import { desc, eq, isNull } from "drizzle-orm";
import { queryAnalyses } from "../drizzle/schema";
import { getDb } from "./db";
import type { QueryLensAnalysis } from "./querylensAnalysis";
import { loadPostgresHistory, savePostgresHistory } from "./postgresHistory";

export async function saveQueryAnalysis(ownerId: number | null, sql: string, analysis: QueryLensAnalysis) {
  if (await savePostgresHistory(ownerId, sql, analysis)) return;
  const db = await getDb();
  if (!db) return;
  await db.insert(queryAnalyses).values({ ownerId, sql, normalizedSql: analysis.normalizedSql, optimizedSql: analysis.optimizedSql, complexityLabel: analysis.complexity.label, baselineCost: Math.round(analysis.baselinePlan.totalCost), optimizedCost: Math.round(analysis.optimizedPlan.totalCost), baselineLatencyMs: Math.round(analysis.benchmark.baselineLatencyMs), optimizedLatencyMs: Math.round(analysis.benchmark.optimizedLatencyMs), analysisPayload: analysis });
}

export async function listQueryHistory(ownerId: number | null, limit: number) {
  const postgresRows = await loadPostgresHistory(ownerId, limit);
  if (postgresRows) return postgresRows;
  const db = await getDb();
  if (!db) return [];
  const condition = ownerId ? eq(queryAnalyses.ownerId, ownerId) : isNull(queryAnalyses.ownerId);
  const rows = await db.select().from(queryAnalyses).where(condition).orderBy(desc(queryAnalyses.createdAt)).limit(limit);
  return rows.map(row => ({ id: String(row.id), sql: row.sql, complexity: row.complexityLabel, baselineCost: row.baselineCost, optimizedCost: row.optimizedCost, baselineLatencyMs: row.baselineLatencyMs, optimizedLatencyMs: row.optimizedLatencyMs, payload: row.analysisPayload, createdAt: row.createdAt }));
}
