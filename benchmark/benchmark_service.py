from __future__ import annotations

from typing import Any


def estimate_benchmark(baseline_cost: float, optimized_cost: float) -> dict[str, Any]:
    baseline_latency = round(7.0 + baseline_cost * 1.12, 1)
    optimized_latency = round(5.0 + optimized_cost * 0.94, 1)
    cost_reduction = round((1 - optimized_cost / baseline_cost) * 100, 1) if baseline_cost else 0.0
    latency_reduction = round((1 - optimized_latency / baseline_latency) * 100, 1) if baseline_latency else 0.0
    return {"mode": "estimated", "baselineLatencyMs": baseline_latency, "optimizedLatencyMs": optimized_latency, "costReductionPercent": max(0.0, cost_reduction), "latencyReductionPercent": max(0.0, latency_reduction), "method": "Deterministic estimate calibrated to the parsed query shape; connect a live PostgreSQL target for measured execution timings."}
