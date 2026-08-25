import { z } from "zod";
import { analyzeSql } from "../querylensAnalysis";
import { listQueryHistory, saveQueryAnalysis } from "../querylensHistory";
import { publicProcedure, router } from "../_core/trpc";

export const queryLensRouter = router({
  analyze: publicProcedure
    .input(z.object({ sql: z.string().min(1).max(20_000) }))
    .mutation(async ({ ctx, input }) => {
      const analysis = await analyzeSql(input.sql);
      await saveQueryAnalysis(ctx.user?.id ?? null, input.sql, analysis);
      return analysis;
    }),
  history: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(48).default(24) }))
    .query(({ ctx, input }) => listQueryHistory(ctx.user?.id ?? null, input.limit)),
});
