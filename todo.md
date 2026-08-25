# Project TODO

- [x] Define persistent data models for query analyses, recommendations, plan snapshots, benchmarks, and performance history.
- [x] Add the requested parser, planner, cost-model, optimizer, benchmark, recommendation, API, frontend, and datasets module boundaries.
- [x] Implement a Python SQLGlot analysis runtime that parses PostgreSQL SQL, derives plan nodes, scores complexity, and predicts query cost.
- [x] Implement rule-based analysis for expensive operators, missing indexes, inefficient joins, and explainable prioritized recommendations.
- [x] Add baseline-versus-optimized plan comparisons and before/after benchmark metrics.
- [x] Persist query analyses and performance trend data through the full-stack application's database layer.
- [x] Build a vibrant responsive React dashboard with query input, execution-plan graph, recommendations, comparison workspace, and history trends.
- [x] Add interactive D3.js visualizations for plan relationships and performance history.
- [x] Add unit tests for query-analysis business logic and validate the application build and user flows.
- [x] Package the Node.js application and Python analysis runtime in Docker with deployment documentation.
- [x] Finalize the self-contained deployment path without requiring user-supplied PostgreSQL credentials.
- [x] Surface explicit expensive-operator findings from the estimated plan in the API and dashboard.
- [x] Clarify estimated-versus-measured benchmark mode throughout the analysis response and documentation.
- [x] Extend automated tests across recommendation findings, persisted history fallback behavior, and analysis API user flow.
- [x] Replace the current marketing-style landing layout with a distinct operational query-console page template while preserving all QueryLens actions and results.
