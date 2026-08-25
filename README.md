# QueryLens

**QueryLens** is a SQL query intelligence workspace that accepts a read-only PostgreSQL query, parses its structure with SQLGlot, models an estimated execution path, identifies performance risks, and compares a baseline plan against an optimization-oriented alternative.

The default implementation is self-contained. It does not execute customer SQL or require a connection to a source database. Instead, it calculates explainable estimates from the query shape. This makes the workspace safe to run as a demonstration and development tool. If `QUERYLENS_POSTGRES_URL` is available later, the application automatically writes its durable analysis history to that PostgreSQL database; otherwise, it preserves history with the managed project database.

| Layer | Responsibility | Primary implementation |
|---|---|---|
| `parser/` | PostgreSQL-aware query normalization and structure extraction | Python, SQLGlot |
| `planner/` | Baseline and optimization-oriented operator trees | Estimated PostgreSQL plan builder |
| `cost-model/` | Query-shape cost calibration | XGBoost with Scikit-learn fallback |
| `recommendation/` | Prioritized index, join, sort, and projection findings | Rule-based analysis |
| `benchmark/` | Before/after cost and latency estimates | Deterministic comparison model |
| `api/` | Python analysis runtime and optional PostgreSQL schema | JSON subprocess contract |
| `server/` | Typed tRPC API and persisted history | Express, tRPC, Drizzle |
| `client/` | Query workspace and D3 plan/history visualizations | React, D3.js |

## Local development

Install JavaScript dependencies with `pnpm install`, install the Python runtime with `python3 -m pip install -r requirements.txt`, then start the workspace with `pnpm dev`.

Run validation with `pnpm check`, `pnpm test`, and `pnpm build`.

## Docker packaging

The root `Dockerfile` creates one deployable image that includes Node.js, Python 3, SQLGlot, Scikit-learn, XGBoost, the React production build, and the Express/tRPC server. It listens through the managed runtime port and starts with `node dist/index.js`.

## Analysis boundaries

The current planner produces **estimated** PostgreSQL-style operators and performance metrics. The recommendation list is an explainable starting point rather than an automated schema migration. Before applying an index or SQL rewrite in a production database, validate it with real `EXPLAIN (ANALYZE, BUFFERS)` output and workload-specific measurements.
