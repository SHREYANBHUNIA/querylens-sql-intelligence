from __future__ import annotations

from typing import Any

from sql_parser import ParsedQuery


def _node(node_id: str, parent_id: str | None, node_type: str, cost: float, rows: int, detail: str) -> dict[str, Any]:
    return {"id": node_id, "parentId": parent_id, "nodeType": node_type, "cost": round(cost, 1), "rows": rows, "detail": detail}


def build_estimated_plan(parsed: ParsedQuery, predicted_cost: float, optimized: bool = False) -> dict[str, Any]:
    tables = parsed.tables or ["target_table"]
    filters = len(parsed.filter_columns)
    nodes: list[dict[str, Any]] = []
    base_cost = max(26.0, predicted_cost / max(len(tables) + len(parsed.joins) + 1, 2))
    scan_nodes: list[str] = []
    for index, table in enumerate(tables):
        use_index = optimized and filters > 0
        scan_cost = base_cost * (0.42 if use_index else 1.0) * (1 + index * 0.08)
        node_id = f"scan-{index}"
        scan_nodes.append(node_id)
        nodes.append(_node(node_id, None, "Index Scan" if use_index else "Seq Scan", scan_cost, max(110, int(scan_cost * 22)), f"{table}{' using suggested predicate index' if use_index else ' full relation estimate'}"))

    active = scan_nodes[0]
    rolling_cost = nodes[0]["cost"]
    for index, join in enumerate(parsed.joins):
        right = scan_nodes[min(index + 1, len(scan_nodes) - 1)]
        join_id = f"join-{index}"
        join_type = "Hash Join" if optimized or join["hasCondition"] else "Nested Loop"
        multiplier = 0.68 if optimized else (1.25 if join["hasCondition"] else 2.05)
        rolling_cost = (rolling_cost + next(node["cost"] for node in nodes if node["id"] == right)) * multiplier
        for node in nodes:
            if node["id"] in {active, right}:
                node["parentId"] = join_id
        nodes.append(_node(join_id, None, join_type, rolling_cost, max(120, int(rolling_cost * 9)), "Join predicates resolved through estimated cardinality" if join["hasCondition"] else "Join lacks an explicit predicate"))
        active = join_id

    if parsed.has_group_by:
        aggregate_id = "aggregate"
        for node in nodes:
            if node["id"] == active:
                node["parentId"] = aggregate_id
        rolling_cost *= 1.16 if optimized else 1.42
        nodes.append(_node(aggregate_id, None, "HashAggregate", rolling_cost, max(24, int(rolling_cost * 2)), "Grouping result set"))
        active = aggregate_id
    if parsed.has_order_by:
        sort_id = "sort"
        for node in nodes:
            if node["id"] == active:
                node["parentId"] = sort_id
        rolling_cost *= 1.05 if optimized and parsed.has_limit else 1.34
        nodes.append(_node(sort_id, None, "Sort", rolling_cost, max(20, int(rolling_cost * 2)), "Ordering result set"))
        active = sort_id

    root_id = "result"
    for node in nodes:
        if node["id"] == active:
            node["parentId"] = root_id
    rolling_cost = max(rolling_cost, predicted_cost * (0.54 if optimized else 1.0))
    nodes.append(_node(root_id, None, "Result", rolling_cost, max(1, int(rolling_cost)), "Estimated PostgreSQL result node"))
    return {"totalCost": round(rolling_cost, 1), "nodes": nodes}
