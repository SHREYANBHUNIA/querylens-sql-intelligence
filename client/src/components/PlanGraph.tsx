import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { PlanNode } from "../../../server/querylensAnalysis";

type PlanGraphProps = {
  nodes: PlanNode[];
  accent: "pink" | "violet";
  title: string;
};

const palette = {
  pink: { line: "#fb7185", fill: "#3b123e", stroke: "#fb7185", text: "#ffe4ed" },
  violet: { line: "#a78bfa", fill: "#21174a", stroke: "#a78bfa", text: "#ede9fe" },
};

export function PlanGraph({ nodes, accent, title }: PlanGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const color = palette[accent];
    const parents = new Map(nodes.map(node => [node.id, node.parentId]));
    const depth = (node: PlanNode): number => {
      if (!node.parentId) return 0;
      const parent = nodes.find(candidate => candidate.id === node.parentId);
      return parent ? depth(parent) + 1 : 0;
    };
    const positioned = nodes.map(node => ({ ...node, level: depth(node) }));
    const groups = d3.group(positioned, node => node.level);
    const width = 620;
    const height = Math.max(250, d3.max(Array.from(groups.values()), group => group.length)! * 80 + 75);
    const layer = svg.attr("viewBox", `0 0 ${width} ${height}`).append("g");
    const point = new Map<string, { x: number; y: number }>();
    groups.forEach((group, level) => {
      group.forEach((node, index) => {
        point.set(node.id, { x: 100 + level * 164, y: 54 + index * 80 });
      });
    });

    layer.append("g")
      .selectAll("path")
      .data(positioned.filter(node => node.parentId))
      .join("path")
      .attr("d", node => {
        const source = point.get(node.parentId!);
        const target = point.get(node.id);
        if (!source || !target) return "";
        return `M ${source.x + 58} ${source.y} C ${source.x + 92} ${source.y}, ${target.x - 92} ${target.y}, ${target.x - 58} ${target.y}`;
      })
      .attr("fill", "none")
      .attr("stroke", color.line)
      .attr("stroke-opacity", 0.46)
      .attr("stroke-width", 1.7);

    const nodeGroup = layer.append("g").selectAll("g").data(positioned).join("g").attr("transform", node => {
      const position = point.get(node.id)!;
      return `translate(${position.x}, ${position.y})`;
    });
    nodeGroup.append("rect").attr("x", -58).attr("y", -26).attr("width", 116).attr("height", 52).attr("rx", 12).attr("fill", color.fill).attr("stroke", color.stroke).attr("stroke-width", 1.2);
    nodeGroup.append("text").attr("text-anchor", "middle").attr("y", -4).attr("fill", color.text).attr("font-size", 10).attr("font-weight", 700).text(node => node.nodeType);
    nodeGroup.append("text").attr("text-anchor", "middle").attr("y", 13).attr("fill", "#c4b5fd").attr("font-size", 9).text(node => `cost ${node.cost.toLocaleString()}`);
    nodeGroup.append("title").text(node => `${node.detail}\n${node.rows.toLocaleString()} estimated rows`);
  }, [accent, nodes]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/15 p-3">
      <div className="mb-1 flex items-center justify-between px-2"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">{title}</span><span className="text-[10px] text-white/35">hover nodes for detail</span></div>
      <svg ref={svgRef} className="block w-full" role="img" aria-label={`${title} execution plan graph`} />
    </div>
  );
}
