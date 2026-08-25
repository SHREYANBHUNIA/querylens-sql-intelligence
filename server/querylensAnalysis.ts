import { spawn } from "node:child_process";
import path from "node:path";

export type PlanNode = { id: string; parentId: string | null; nodeType: string; cost: number; rows: number; detail: string };
export type Recommendation = { priority: number; severity: "critical" | "warning" | "info"; title: string; detail: string; action: string; estimatedImpact: number };
export type QueryLensAnalysis = { normalizedSql: string; optimizedSql: string; analysisMode: string; model: string; complexity: { score: number; label: string }; queryShape: { tables: string[]; joinCount: number; filterColumns: Array<{ table: string; column: string }>; hasOrderBy: boolean; hasGroupBy: boolean }; baselinePlan: { totalCost: number; nodes: PlanNode[] }; optimizedPlan: { totalCost: number; nodes: PlanNode[] }; operatorFindings: Recommendation[]; recommendations: Recommendation[]; benchmark: { mode: "estimated" | "measured"; baselineLatencyMs: number; optimizedLatencyMs: number; costReductionPercent: number; latencyReductionPercent: number; method: string } };

export function validateSqlInput(sql: string): string {
  const normalized = sql.trim();
  if (!normalized) throw new Error("Enter a PostgreSQL query to analyze.");
  if (normalized.length > 20_000) throw new Error("Queries are limited to 20,000 characters.");
  if (!/^(select|with|explain)\b/i.test(normalized)) throw new Error("QueryLens currently analyzes read-only SELECT, WITH, or EXPLAIN statements.");
  return normalized;
}

export async function analyzeSql(sql: string): Promise<QueryLensAnalysis> {
  const safeSql = validateSqlInput(sql);
  const scriptPath = path.resolve(process.cwd(), "api", "analysis_runtime.py");
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [scriptPath], { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), 15_000);
    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", error => { clearTimeout(timer); reject(new Error(`Python analysis runtime could not start: ${error.message}`)); });
    child.on("close", code => {
      clearTimeout(timer);
      try {
        const payload = JSON.parse(stdout) as QueryLensAnalysis & { error?: string };
        if (code !== 0 || payload.error) throw new Error(payload.error || stderr || "Analysis runtime exited unexpectedly.");
        resolve(payload);
      } catch (error) { reject(error instanceof Error ? error : new Error("Unable to parse the analysis response.")); }
    });
    child.stdin.write(JSON.stringify({ sql: safeSql }));
    child.stdin.end();
  });
}
