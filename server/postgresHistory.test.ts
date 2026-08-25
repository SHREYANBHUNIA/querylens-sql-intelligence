import { describe, expect, it } from "vitest";
import { loadPostgresHistory, savePostgresHistory } from "./postgresHistory";

describe("PostgreSQL history fallback", () => {
  it("remains self-contained when an external PostgreSQL URL is not configured", async () => {
    const previous = process.env.QUERYLENS_POSTGRES_URL;
    delete process.env.QUERYLENS_POSTGRES_URL;

    await expect(loadPostgresHistory(null, 5)).resolves.toBeNull();
    await expect(savePostgresHistory(null, "SELECT 1", {} as never)).resolves.toBe(false);

    if (previous) process.env.QUERYLENS_POSTGRES_URL = previous;
  });
});

