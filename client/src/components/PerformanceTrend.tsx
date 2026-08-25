import * as d3 from "d3";
import { useEffect, useRef } from "react";

type TrendPoint = { baselineLatencyMs: number; optimizedLatencyMs: number; createdAt: Date | string };

export function PerformanceTrend({ points }: { points: TrendPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!svgRef.current || !points.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const values = [...points].reverse().map((point, index) => ({ index, baseline: point.baselineLatencyMs, optimized: point.optimizedLatencyMs }));
    const width = 740;
    const height = 220;
    const margin = { top: 20, right: 18, bottom: 24, left: 42 };
    const x = d3.scaleLinear().domain([0, Math.max(1, values.length - 1)]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, (d3.max(values.flatMap(value => [value.baseline, value.optimized])) || 1) * 1.14]).nice().range([height - margin.bottom, margin.top]);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(Math.min(values.length, 5)).tickFormat(value => `Q${Number(value) + 1}`)).call(group => group.select(".domain").attr("stroke", "#ffffff22")).call(group => group.selectAll("text").attr("fill", "#ffffff77").attr("font-size", 10));
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4)).call(group => group.select(".domain").remove()).call(group => group.selectAll("line").attr("stroke", "#ffffff12").attr("x2", width - margin.left - margin.right)).call(group => group.selectAll("text").attr("fill", "#ffffff77").attr("font-size", 10));
    const makeLine = (key: "baseline" | "optimized") => d3.line<{ index: number; baseline: number; optimized: number }>().x(point => x(point.index)).y(point => y(point[key])).curve(d3.curveMonotoneX);
    svg.append("path").datum(values).attr("fill", "none").attr("stroke", "#fb7185").attr("stroke-width", 3).attr("d", makeLine("baseline"));
    svg.append("path").datum(values).attr("fill", "none").attr("stroke", "#a78bfa").attr("stroke-width", 3).attr("d", makeLine("optimized"));
    svg.append("text").attr("x", width - 135).attr("y", 20).attr("fill", "#fb7185").attr("font-size", 10).text("Baseline latency");
    svg.append("text").attr("x", width - 135).attr("y", 36).attr("fill", "#a78bfa").attr("font-size", 10).text("Optimized latency");
  }, [points]);
  return <svg ref={svgRef} className="h-auto w-full" role="img" aria-label="Performance history comparing baseline and optimized latency" />;
}
