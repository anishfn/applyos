"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "@/components/ui/icons";
import { Sparkline } from "@/components/common/charts";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: string | number;
  /** Change vs the previous period, as a ratio. `null` when there's no baseline. */
  delta?: number | null;
  /** Some metrics are better when they go down (rejection rate, ghost rate). */
  invertDelta?: boolean;
  hint?: string;
  trend?: number[];
  href?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  invertDelta = false,
  hint,
  trend,
  href,
  className,
}: MetricCardProps) {
  const direction = delta == null || Math.abs(delta) < 0.005 ? "flat" : delta > 0 ? "up" : "down";
  const good = direction === "flat" ? null : invertDelta ? direction === "down" : direction === "up";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : ArrowRight;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2 sm:min-h-8">
        <span className="text-[11px] leading-4 font-medium text-muted-foreground">
          {label}
        </span>
        {delta != null && direction !== "flat" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
              good === true && "text-tone-green",
              good === false && "text-tone-rose",
            )}
          >
            <Icon className="size-3" aria-hidden />
            {Math.abs(Math.round(delta * 100))}%
          </span>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="font-runde text-2xl leading-none font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        {trend && trend.length > 1 && (
          <span className="w-16 shrink-0 opacity-70">
            <Sparkline values={trend} height={24} />
          </span>
        )}
      </div>

      {hint && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 font-medium text-muted-foreground sm:min-h-8">
          {hint}
        </p>
      )}
    </>
  );

  if (href) {
    return (
      <Surface
        asChild
        interactive
        className={cn("block p-3.5 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none", className)}
      >
        <a href={href}>{content}</a>
      </Surface>
    );
  }

  return <Surface className={cn("p-3.5", className)}>{content}</Surface>;
}
