import { describe, expect, it } from "vitest";
import { analyzeSql, validateSqlInput } from "./querylensAnalysis";

describe("QueryLens SQL validation", () => {
  it("accepts a read-only PostgreSQL statement and trims it", () => {
    expect(validateSqlInput("  SELECT id FROM users WHERE email = 'x@example.com'  ")).toBe("SELECT id FROM users WHERE email = 'x@example.com'");
  });

  it("rejects mutation statements before invoking the analysis runtime", () => {
    expect(() => validateSqlInput("DELETE FROM users")).toThrow("read-only");
  });

  it("derives an estimated plan, benchmark improvement, and index recommendation", async () => {
    const result = await analyzeSql("SELECT * FROM orders WHERE status = 'completed' ORDER BY created_at DESC");

    expect(result.analysisMode).toBe("Estimated PostgreSQL plan");
    expect(result.baselinePlan.totalCost).toBeGreaterThan(result.optimizedPlan.totalCost);
    expect(result.benchmark.costReductionPercent).toBeGreaterThan(0);
    expect(result.benchmark.mode).toBe("estimated");
    expect(result.recommendations.some(item => item.title.includes("Index predicate"))).toBe(true);
    expect(result.operatorFindings.some(item => item.title.includes("Sequential scan"))).toBe(true);
  });
});
