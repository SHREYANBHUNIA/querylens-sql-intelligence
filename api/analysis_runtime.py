from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for directory in ["parser", "planner", "cost-model", "optimizer", "benchmark", "recommendation"]:
    sys.path.insert(0, str(ROOT / directory))

from benchmark_service import estimate_benchmark
from predictor import CostPredictor
from postgres_plan import build_estimated_plan
from query_optimizer import complexity_score, derive_optimized_sql
from rules import analyze_expensive_operators, build_recommendations
from sql_parser import parse_postgres_sql


def analyze(sql: str) -> dict:
    parsed = parse_postgres_sql(sql)
    complexity, complexity_label = complexity_score(parsed)
    model = CostPredictor()
    features = [max(1, len(parsed.tables)), len(parsed.joins), int(bool(parsed.filter_columns)), int(parsed.has_order_by or parsed.has_group_by), int(parsed.subquery_count > 0 or parsed.cte_count > 0)]
    predicted_cost = max(35.0, model.predict(features) * (1 + complexity / 250))
    recommendations = build_recommendations(parsed)
    benefit = min(0.58, 0.12 + sum(item["estimatedImpact"] for item in recommendations) / 280)
    optimized_cost = max(18.0, predicted_cost * (1 - benefit))
    baseline_plan = build_estimated_plan(parsed, predicted_cost, optimized=False)
    optimized_plan = build_estimated_plan(parsed, optimized_cost, optimized=True)
    return {"normalizedSql": parsed.normalized_sql, "optimizedSql": derive_optimized_sql(parsed), "analysisMode": "Estimated PostgreSQL plan", "model": model.model_name, "complexity": {"score": complexity, "label": complexity_label}, "queryShape": {"tables": parsed.tables, "joinCount": len(parsed.joins), "filterColumns": parsed.filter_columns, "hasOrderBy": parsed.has_order_by, "hasGroupBy": parsed.has_group_by}, "baselinePlan": baseline_plan, "optimizedPlan": optimized_plan, "operatorFindings": analyze_expensive_operators(baseline_plan), "recommendations": recommendations, "benchmark": estimate_benchmark(baseline_plan["totalCost"], optimized_plan["totalCost"])}


def main() -> None:
    payload = json.loads(sys.stdin.read())
    sql = payload.get("sql", "")
    if not isinstance(sql, str) or not sql.strip():
        raise ValueError("A non-empty SQL query is required.")
    print(json.dumps(analyze(sql), default=str))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)
