from __future__ import annotations

from typing import Any

from sql_parser import ParsedQuery


def _recommendation(priority: int, severity: str, title: str, detail: str, action: str, impact: int) -> dict[str, Any]:
    return {"priority": priority, "severity": severity, "title": title, "detail": detail, "action": action, "estimatedImpact": impact}


def build_recommendations(parsed: ParsedQuery) -> list[dict[str, Any]]:
    recommendations: list[dict[str, Any]] = []
    priority = 1
    for filter_column in parsed.filter_columns:
        table, column = filter_column["table"], filter_column["column"]
        recommendations.append(_recommendation(priority, "critical", f"Index predicate: {table}.{column}", f"The estimated plan scans {table} before evaluating {column}. A targeted b-tree index can reduce relation work.", f"CREATE INDEX CONCURRENTLY idx_{table}_{column} ON {table} ({column});", 42))
        priority += 1
    for join in parsed.joins:
        if not join["hasCondition"]:
            recommendations.append(_recommendation(priority, "critical", "Add an explicit join predicate", "This join has no ON condition, so the planner may create a very large intermediate relation.", "Define the relationship in an ON clause and index the participating keys.", 55))
            priority += 1
        elif len(parsed.joins) > 0:
            recommendations.append(_recommendation(priority, "warning", "Support join keys with indexes", "Join cardinality dominates the estimated cost. Indexing the join columns helps PostgreSQL select hash or merge strategies efficiently.", "Create matching indexes on the join key columns after reviewing real EXPLAIN ANALYZE output.", 24))
            priority += 1
            break
    if parsed.select_star:
        recommendations.append(_recommendation(priority, "warning", "Replace SELECT *", "Fetching every column increases tuple width, I/O, and memory pressure for downstream sort or hash operations.", "Project only the columns consumed by the application.", 16))
        priority += 1
    if parsed.has_order_by and not parsed.has_limit:
        recommendations.append(_recommendation(priority, "warning", "Constrain the sort", "Sorting an unconstrained result can spill to disk as the relation grows.", "Add an appropriate LIMIT or a supporting composite index aligned with the filter and ORDER BY fields.", 20))
        priority += 1
    if not parsed.filter_columns and parsed.tables:
        recommendations.append(_recommendation(priority, "info", "Review full-relation access", "No filter predicates were detected, making a full relation scan plausible for the estimated plan.", "Add a selective predicate when the workflow does not need a complete relation.", 12))
    if not recommendations:
        recommendations.append(_recommendation(priority, "info", "Refresh planner statistics", "No high-risk structural issue was detected in the parsed shape. Accurate statistics remain essential for good cardinality estimates.", "Run ANALYZE after substantial data changes and validate using EXPLAIN (ANALYZE, BUFFERS).", 8))
    return recommendations


def analyze_expensive_operators(plan: dict[str, Any]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    ranked_nodes = sorted(plan["nodes"], key=lambda node: node["cost"], reverse=True)
    for node in ranked_nodes:
        node_type = node["nodeType"]
        if node_type == "Seq Scan":
            findings.append(_recommendation(1, "critical", "Sequential scan dominates the plan", f"{node['detail']} contributes an estimated cost of {node['cost']:,.1f} across {node['rows']:,} rows.", "Validate a selective predicate index and verify its selectivity with EXPLAIN (ANALYZE, BUFFERS).", 38))
        elif node_type == "Nested Loop":
            findings.append(_recommendation(2, "critical", "Nested-loop join may multiply work", f"The nested loop carries an estimated cost of {node['cost']:,.1f}. Large outer relations can repeatedly probe the inner relation.", "Index both join keys and compare a hash join using live PostgreSQL statistics.", 34))
        elif node_type == "Sort":
            findings.append(_recommendation(3, "warning", "Sort is a material cost center", f"The sort operator accounts for an estimated cost of {node['cost']:,.1f}.", "Use a composite index aligned with filtering and ORDER BY fields, or constrain the result with LIMIT.", 20))
        elif node_type == "HashAggregate":
            findings.append(_recommendation(4, "warning", "Aggregation may pressure working memory", f"The aggregate operator has an estimated cost of {node['cost']:,.1f}.", "Reduce input cardinality before grouping and inspect work_mem and spill behavior on a live target.", 16))
    return findings[:3] or [_recommendation(1, "info", "No dominant expensive operator detected", "The estimated operator tree does not show a high-risk scan, loop, sort, or aggregate node.", "Confirm the estimate against EXPLAIN (ANALYZE, BUFFERS) before changing production SQL.", 8)]
