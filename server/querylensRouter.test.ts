import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const historySpy = vi.hoisted(() => vi.fn());

vi.mock("./querylensHistory", () => ({
  saveQueryAnalysis: historySpy,
  listQueryHistory: vi.fn().mockResolvedValue([]),
}));

import { appRouter } from "./routers";

describe("queryLens router", () => {
  it("analyzes a query through the typed API and requests history persistence", async () => {
    const ctx = { user: null, req: {}, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);

    const result = await caller.queryLens.analyze({ sql: "SELECT * FROM orders WHERE status = 'completed'" });

    expect(result.operatorFindings[0]?.title).toContain("Sequential scan");
    expect(result.benchmark.mode).toBe("estimated");
    expect(historySpy).toHaveBeenCalledTimes(1);
  });
});
