from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import sqlglot
from sqlglot import exp


@dataclass
class ParsedQuery:
    normalized_sql: str
    tables: list[str]
    joins: list[dict[str, Any]]
    filter_columns: list[dict[str, str]]
    select_star: bool
    has_order_by: bool
    has_group_by: bool
    has_limit: bool
    cte_count: int
    subquery_count: int


def _unique(items: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[tuple[str, str]] = set()
    output: list[dict[str, str]] = []
    for item in items:
        marker = (item["table"], item["column"])
        if marker not in seen:
            seen.add(marker)
            output.append(item)
    return output


def parse_postgres_sql(sql: str) -> ParsedQuery:
    expression = sqlglot.parse_one(sql, read="postgres")
    tables = [table.name for table in expression.find_all(exp.Table) if table.name]
    table_names = list(dict.fromkeys(tables))
    joins: list[dict[str, Any]] = []
    for join in expression.find_all(exp.Join):
        joins.append(
            {
                "kind": (join.args.get("kind") or "INNER").upper(),
                "hasCondition": join.args.get("on") is not None,
                "target": join.this.sql(dialect="postgres") if join.this else "derived relation",
            }
        )

    filter_columns: list[dict[str, str]] = []
    where = expression.find(exp.Where)
    if where:
        default_table = table_names[0] if table_names else "target_table"
        for column in where.find_all(exp.Column):
            if column.name:
                filter_columns.append({"table": column.table or default_table, "column": column.name})

    return ParsedQuery(
        normalized_sql=expression.sql(dialect="postgres", pretty=True),
        tables=table_names,
        joins=joins,
        filter_columns=_unique(filter_columns),
        select_star=bool(list(expression.find_all(exp.Star))),
        has_order_by=expression.find(exp.Order) is not None,
        has_group_by=expression.find(exp.Group) is not None,
        has_limit=expression.find(exp.Limit) is not None,
        cte_count=len(list(expression.find_all(exp.CTE))),
        subquery_count=len(list(expression.find_all(exp.Subquery))),
    )
