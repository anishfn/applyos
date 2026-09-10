"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Hand-rolled SVG charts.
 *
 * A charting library would bring its own visual language, grid lines, tick
 * styling, tooltips, that fights this one. These are small enough to own, and
 * they inherit the design tokens directly.
 */

/* -------------------------------------------------------------------------- */
/* Sparkline                                                                   */
/* -------------------------------------------------------------------------- */

export function Sparkline({
  values,
  className,
  height = 32,
  strokeWidth = 1.5,
  tone = "var(--primary)",
}: {
  values: number[];
  className?: string;
  height?: number;
  strokeWidth?: number;
  tone?: string;
}) {
  const gradientId = React.useId();
  if (values.length < 2) return <div className={cn("h-8", className)} />;

  const width = 100;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / range) * (height - strokeWidth * 2) - strokeWidth;
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full overflow-visible", className)}
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.22" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={tone}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Column chart                                                                */
/* -------------------------------------------------------------------------- */

export interface ColumnDatum {
  label: string;
  value: number;
  /** Optional secondary series drawn as a lighter stack under the main one. */
  secondary?: number;
}

export function ColumnChart({
  data,
  className,
  height = 140,
  valueLabel = "",
  secondaryLabel = "",
}: {
  data: ColumnDatum[];
  className?: string;
  height?: number;
  valueLabel?: string;
  secondaryLabel?: string;
}) {
  const max = Math.max(...data.map((d) => Math.max(d.value, d.secondary ?? 0)), 1);
  const [hover, setHover] = React.useState<number | null>(null);

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex items-end gap-[3px]"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
      >
        {data.map((datum, index) => {
          const primaryHeight = Math.max((datum.value / max) * 100, datum.value > 0 ? 3 : 0);
          const secondaryHeight =
            datum.secondary != null ? Math.max((datum.secondary / max) * 100, datum.secondary > 0 ? 3 : 0) : 0;
          const active = hover === index;
          return (
            <div
              key={`${datum.label}-${index}`}
              className="group relative flex h-full flex-1 justify-center gap-[2px]"
              onMouseEnter={() => setHover(index)}
            >
              {active && (
                <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-lg edge-strong bg-popover px-2 py-1 text-[11px] font-medium whitespace-nowrap">
                  <span className="text-foreground tabular-nums">
                    {datum.value}
                    {valueLabel && ` ${valueLabel}`}
                  </span>
                  {datum.secondary != null && (
                    <span className="ml-1.5 text-muted-foreground tabular-nums">
                      {datum.secondary}
                      {secondaryLabel && ` ${secondaryLabel}`}
                    </span>
                  )}
                  <div className="mt-0.5 text-muted-foreground">{datum.label}</div>
                </div>
              )}
              {/* Side by side, because the two series measure different things. */}
              <div
                className={cn(
                  "w-full max-w-6 self-end rounded-[3px] transition-colors duration-200",
                  active ? "bg-primary" : "bg-primary/55",
                )}
                style={{ height: `${primaryHeight}%` }}
              />
              {datum.secondary != null && (
                <div
                  className={cn(
                    "w-full max-w-2.5 self-end rounded-[3px] transition-colors duration-200",
                    active ? "bg-foreground/30" : "bg-foreground/15",
                  )}
                  style={{ height: `${secondaryHeight}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Funnel                                                                      */
/* -------------------------------------------------------------------------- */

export interface FunnelStage {
  label: string;
  value: number;
  href?: string;
}

export function Funnel({
  stages,
  className,
  onSelect,
}: {
  stages: FunnelStage[];
  className?: string;
  onSelect?: (stage: FunnelStage, index: number) => void;
}) {
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {stages.map((stage, index) => {
        const previous = index > 0 ? stages[index - 1].value : null;
        const conversion = previous && previous > 0 ? stage.value / previous : null;
        const width = Math.max((stage.value / max) * 100, stage.value > 0 ? 2 : 0.6);
        const Row = onSelect ? "button" : "div";
        return (
          <Row
            key={stage.label}
            {...(onSelect ? { type: "button" as const, onClick: () => onSelect(stage, index) } : {})}
            className={cn(
              "group grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-left",
              "transition-colors duration-200 ease-out",
              onSelect && "cursor-pointer hover:bg-foreground/[0.045]",
            )}
          >
            <span className="truncate text-xs font-medium text-muted-foreground">{stage.label}</span>
            <span className="relative h-5 overflow-hidden rounded-md bg-foreground/[0.04]">
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-md transition-[width] duration-500 ease-out motion-reduce:transition-none",
                  index === stages.length - 1 ? "bg-primary" : "bg-primary/45",
                )}
                style={{ width: `${width}%` }}
              />
            </span>
            <span className="flex items-baseline gap-2">
              <span className="w-8 text-right font-mono text-xs font-semibold tabular-nums">
                {stage.value}
              </span>
              <span className="w-10 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                {conversion === null ? "" : `${Math.round(conversion * 100)}%`}
              </span>
            </span>
          </Row>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Progress ring + bar                                                         */
/* -------------------------------------------------------------------------- */

export function ProgressRing({
  value,
  size = 44,
  strokeWidth = 4,
  className,
  children,
  tone = "var(--primary)",
}: {
  /** 0–1. */
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  tone?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 1);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-foreground/[0.08]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        />
      </svg>
      {children && (
        <span className="absolute inset-0 flex items-center justify-center">{children}</span>
      )}
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  tone = "bg-primary",
  height = "h-1.5",
}: {
  /** 0–1. */
  value: number;
  className?: string;
  tone?: string;
  height?: string;
}) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-foreground/[0.07]", height, className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none", tone)}
        style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Breakdown list                                                              */
/* -------------------------------------------------------------------------- */

export interface BreakdownRow {
  label: string;
  value: number;
  /** Secondary metric rendered on the right, e.g. a response rate. */
  meta?: string;
}

export function Breakdown({
  rows,
  className,
  emptyLabel = "Not enough data yet",
}: {
  rows: BreakdownRow[];
  className?: string;
  emptyLabel?: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  if (rows.length === 0) {
    return <p className="px-1 py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className={cn("flex flex-col", className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="group relative flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
        >
          <span
            aria-hidden
            className="absolute inset-y-1 left-0 rounded-md bg-primary/[0.07] transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${(row.value / max) * 100}%` }}
          />
          <span className="relative min-w-0 flex-1 truncate text-xs font-medium">{row.label}</span>
          {row.meta && (
            <span className="relative font-mono text-[11px] tabular-nums text-muted-foreground">
              {row.meta}
            </span>
          )}
          <span className="relative w-8 text-right font-mono text-xs font-semibold tabular-nums">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
