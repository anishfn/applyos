"use client";

import * as React from "react";
import { TONE_VAR } from "@/lib/constants";
import type { SankeyData, SankeyNode } from "@/lib/sankey";
import { cn } from "@/lib/utils";

/**
 * Sankey renderer.
 *
 * Laid out by hand rather than with a library: the graph is a small, strictly
 * layered DAG, so the whole algorithm is "stack nodes in their column, then draw
 * a ribbon between the two edges", and owning it keeps the chart on the app's
 * own type scale and colour tokens.
 *
 * Ribbons are gradients from the source tone to the target tone, which gives
 * every flow a direction without adding an arrowhead to a chart that already
 * has 20 shapes in it.
 */

const NODE_WIDTH = 9;
const NODE_GAP = 22;
/** Room on the right for terminal labels, which read outward. */
const RIGHT_GUTTER = 132;
const LEFT_GUTTER = 4;
/** Room above the first node for its stage label. */
const TOP_GUTTER = 26;

interface Placed extends SankeyNode {
  x: number;
  y: number;
  height: number;
  /** First and last columns anchor their labels inward, or they clip. */
  edge: "start" | "middle" | "end";
}

interface Ribbon {
  key: string;
  source: Placed;
  target: Placed;
  sourceY: number;
  targetY: number;
  thickness: number;
  value: number;
}

export function Sankey({
  data,
  height = 360,
  className,
}: {
  data: SankeyData;
  height?: number;
  className?: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);
  const [tip, setTip] = React.useState<{ x: number; y: number; text: string } | null>(null);

  /** offsetX on an SVG child is inconsistent across browsers; measure instead. */
  const pointerIn = (event: React.MouseEvent) => {
    const box = wrapRef.current?.getBoundingClientRect();
    return box
      ? { x: event.clientX - box.left, y: event.clientY - box.top }
      : { x: 0, y: 0 };
  };

  const layout = React.useMemo(() => {
    const layers = [...new Set(data.nodes.map((node) => node.layer))].sort((a, b) => a - b);
    const width = 1160;
    const usable = height - TOP_GUTTER - 10;
    const gapTotal = (count: number) => Math.max(0, count - 1) * NODE_GAP;

    // One scale for every column, so a ribbon keeps its thickness across the chart.
    const scale = Math.min(
      ...layers.map((layer) => {
        const inLayer = data.nodes.filter((node) => node.layer === layer);
        const sum = inLayer.reduce((total, node) => total + node.value, 0) || 1;
        return (usable - gapTotal(inLayer.length)) / sum;
      }),
    );

    const columnX = (layer: number) => {
      const index = layers.indexOf(layer);
      const span = width - LEFT_GUTTER - RIGHT_GUTTER - NODE_WIDTH;
      return LEFT_GUTTER + (index / Math.max(1, layers.length - 1)) * span;
    };

    const placed = new Map<string, Placed>();
    const lastLayer = layers[layers.length - 1];
    for (const layer of layers) {
      const inLayer = data.nodes.filter((node) => node.layer === layer);
      const total =
        inLayer.reduce((sum, node) => sum + node.value * scale, 0) + gapTotal(inLayer.length);
      let y = TOP_GUTTER + (usable - total) / 2;
      for (const node of inLayer) {
        const nodeHeight = Math.max(3, node.value * scale);
        placed.set(node.id, {
          ...node,
          x: columnX(layer),
          y,
          height: nodeHeight,
          edge: layer === layers[0] ? "start" : layer === lastLayer ? "end" : "middle",
        });
        y += nodeHeight + NODE_GAP;
      }
    }

    // Ribbons leave and arrive in the vertical order of the node at the other
    // end. Without this the "advanced" ribbon leaves below the outcomes it was
    // declared after and crosses back over them.
    const ordered = [...data.links].sort((a, b) => {
      const sa = placed.get(a.source)!;
      const sb = placed.get(b.source)!;
      if (sa.y !== sb.y) return sa.y - sb.y;
      return placed.get(a.target)!.y - placed.get(b.target)!.y;
    });

    const outOffset = new Map<string, number>();
    const inOffset = new Map<string, number>();
    const ribbons: Ribbon[] = ordered.map((link) => {
      const source = placed.get(link.source)!;
      const target = placed.get(link.target)!;
      const thickness = Math.max(1.5, link.value * scale);
      const sourceY = source.y + (outOffset.get(link.source) ?? 0);
      const targetY = target.y + (inOffset.get(link.target) ?? 0);
      outOffset.set(link.source, (outOffset.get(link.source) ?? 0) + thickness);
      inOffset.set(link.target, (inOffset.get(link.target) ?? 0) + thickness);
      return {
        key: `${link.source}-${link.target}`,
        source,
        target,
        sourceY,
        targetY,
        thickness,
        value: link.value,
      };
    });

    const stages = [...placed.values()].filter((node) => !node.terminal);

    return { placed: [...placed.values()], ribbons, stages, width };
  }, [data, height]);

  if (data.nodes.length === 0) return null;

  const percent = (value: number) =>
    data.total > 0 ? `${Math.round((value / data.total) * 100)}%` : "";

  return (
    <div ref={wrapRef} className={cn("relative w-full overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${layout.width} ${height}`}
        className="w-full min-w-[44rem]"
        style={{ height }}
        role="img"
        aria-label="Where applications flow, stage by stage"
        onMouseLeave={() => {
          setHoveredNode(null);
          setTip(null);
        }}
      >
        <defs>
          {layout.ribbons.map((ribbon) => (
            <linearGradient
              key={ribbon.key}
              id={`flow-${ribbon.key}`}
              gradientUnits="userSpaceOnUse"
              x1={ribbon.source.x}
              x2={ribbon.target.x}
            >
              <stop offset="0%" stopColor={TONE_VAR[ribbon.source.tone]} />
              <stop offset="100%" stopColor={TONE_VAR[ribbon.target.tone]} />
            </linearGradient>
          ))}
        </defs>

        {layout.ribbons.map((ribbon) => {
          const x1 = ribbon.source.x + NODE_WIDTH;
          const x2 = ribbon.target.x;
          const mid = (x1 + x2) / 2;
          const y1 = ribbon.sourceY;
          const y2 = ribbon.targetY;
          const active =
            hoveredNode === ribbon.source.id || hoveredNode === ribbon.target.id;
          return (
            <path
              key={ribbon.key}
              d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2} L${x2},${y2 + ribbon.thickness} C${mid},${y2 + ribbon.thickness} ${mid},${y1 + ribbon.thickness} ${x1},${y1 + ribbon.thickness} Z`}
              fill={`url(#flow-${ribbon.key})`}
              opacity={hoveredNode ? (active ? 0.8 : 0.12) : 0.45}
              style={{ transition: "opacity 150ms ease-out" }}
              onMouseMove={(event) =>
                setTip({
                  ...pointerIn(event),
                  text: `${ribbon.source.label} → ${ribbon.target.label} · ${ribbon.value} (${percent(ribbon.value)})`,
                })
              }
              onMouseLeave={() => setTip(null)}
            />
          );
        })}

        {layout.placed.map((node) => (
          <g
            key={node.id}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
            className="cursor-default"
          >
            <rect
              x={node.x}
              y={node.y}
              width={NODE_WIDTH}
              height={node.height}
              rx={4}
              fill={TONE_VAR[node.tone]}
              opacity={hoveredNode && hoveredNode !== node.id ? 0.4 : 0.95}
              style={{ transition: "opacity 150ms ease-out" }}
            />
            {node.terminal ? (
              <>
                <text
                  x={node.x + NODE_WIDTH + 9}
                  y={node.y + node.height / 2 - 6}
                  dominantBaseline="middle"
                  className="fill-foreground text-[12px] font-medium"
                >
                  {node.label}
                </text>
                <text
                  x={node.x + NODE_WIDTH + 9}
                  y={node.y + node.height / 2 + 8}
                  dominantBaseline="middle"
                  className="fill-muted-foreground font-mono text-[11px]"
                >
                  {node.value} · {percent(node.value)}
                </text>
              </>
            ) : (
              /* The stage label rides just above its own bar rather than in a
                 header row, so it stays attached to the flow as it narrows. */
              <text
                x={node.edge === "start" ? node.x : node.x + NODE_WIDTH / 2}
                y={node.y - 9}
                textAnchor={node.edge === "start" ? "start" : "middle"}
                className="fill-foreground/80 text-[11px] font-semibold"
              >
                {node.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Stage summary, bottom right, out of the way of the flow. */}
      <div className="pointer-events-none absolute right-3 bottom-3 rounded-xl bg-card/85 px-3 py-2.5 backdrop-blur-md edge">
        <table className="text-[11px] tabular-nums">
          <thead>
            <tr className="text-[10px] font-semibold text-muted-foreground">
              <th className="pb-1 pr-2 text-left font-semibold">Stage</th>
              <th className="pb-1 pr-2 text-right font-semibold">Got here</th>
              <th className="pb-1 pr-2 text-right font-semibold">Of all</th>
              <th className="pb-1 text-right font-semibold">Carried on</th>
            </tr>
          </thead>
          <tbody>
            {layout.stages.map((stage, index) => {
              // Read along the row: of everyone who got this far, this share
              // carried on to the next stage.
              const next = layout.stages[index + 1];
              const step =
                next && stage.value > 0 ? Math.round((next.value / stage.value) * 100) : null;
              return (
                <tr key={stage.id} className="align-middle">
                  <td className="py-0.5 pr-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: TONE_VAR[stage.tone] }}
                      />
                      <span className="font-medium whitespace-nowrap">{stage.label}</span>
                    </span>
                  </td>
                  <td className="py-0.5 pr-2 text-right font-mono font-semibold">{stage.value}</td>
                  <td className="py-0.5 pr-2 text-right font-mono text-muted-foreground">
                    {percent(stage.value)}
                  </td>
                  <td className="py-0.5 text-right font-mono text-muted-foreground">
                    {step == null ? "-" : `${step}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-popover px-2 py-1 text-[11px] font-medium whitespace-nowrap edge-strong"
          style={{ left: tip.x, top: tip.y - 6 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}
