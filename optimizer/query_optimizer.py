from __future__ import annotations

from sql_parser import ParsedQuery


def derive_optimized_sql(parsed: ParsedQuery) -> str:
    """Retain semantics; the recommendations carry intentionally manual changes."""
    return parsed.normalized_sql


def complexity_score(parsed: ParsedQuery) -> tuple[int, str]:
    score = len(parsed.tables) * 12 + len(parsed.joins) * 16 + parsed.subquery_count * 14 + parsed.cte_count * 9 + (12 if parsed.has_order_by else 0) + (10 if parsed.has_group_by else 0) + (10 if parsed.select_star else 0)
    label = "Low" if score < 28 else "Medium" if score < 58 else "High"
    return score, label
