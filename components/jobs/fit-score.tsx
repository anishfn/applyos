"use client";

import { ProgressRing } from "@/components/common/charts";
import type { FitScore } from "@/lib/fit-score";
import { cn } from "@/lib/utils";

const toneFor = (score: number) =>
  score >= 75 ? "var(--primary)" : score >= 50 ? "var(--tone-amber)" : "var(--tone-rose)";

/** Compact ring used in job cards and tables. */
export function FitBadge({ fit, size = 40 }: { fit: FitScore; size?: number }) {
  return (
    <ProgressRing value={fit.overall / 100} size={size} strokeWidth={3} tone={toneFor(fit.overall)}>
      <span className="font-mono text-[10px] font-semibold tabular-nums">{fit.overall}</span>
    </ProgressRing>
  );
}

/** Full breakdown, shown when a job is expanded. */
export function FitBreakdown({ fit, className }: { fit: FitScore; className?: string }) {
  const scored = fit.components.filter((component) => component.score != null);
  const unscored = fit.components.filter((component) => component.score == null);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        <ProgressRing
          value={fit.overall / 100}
          size={56}
          strokeWidth={4}
          tone={toneFor(fit.overall)}
        >
          <span className="font-runde text-sm font-semibold tabular-nums">{fit.overall}%</span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="font-runde text-sm font-semibold tracking-tight">
            {fit.overall >= 80
              ? "Strong match"
              : fit.overall >= 60
                ? "Worth a look"
                : fit.overall >= 40
                  ? "Stretch"
                  : "Probably not it"}
          </p>
          <p className="text-[11px] font-medium text-muted-foreground">
            Scored on {scored.length} of {fit.components.length} signals
            {unscored.length > 0 && ` · fill in your profile for the rest`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {scored.map((component) => (
          <div key={component.key} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2">
            <span className="truncate text-[11px] font-medium text-muted-foreground">
              {component.label}
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
              <span
                className="block h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{
                  width: `${Math.round((component.score as number) * 100)}%`,
                  backgroundColor: toneFor((component.score as number) * 100),
                }}
              />
            </span>
            <span className="text-right font-mono text-[11px] font-semibold tabular-nums">
              {Math.round((component.score as number) * 100)}%
            </span>
            <span className="col-start-2 -mt-0.5 text-[10px] text-muted-foreground">
              {component.detail}
            </span>
          </div>
        ))}
      </div>

      {fit.missingSkills.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
            Missing skills
          </p>
          <div className="flex flex-wrap gap-1">
            {fit.missingSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-tone-rose/25 bg-tone-rose/10 px-2 py-0.5 text-[11px] font-medium text-tone-rose"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {fit.matchedSkills.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
            You have
          </p>
          <div className="flex flex-wrap gap-1">
            {fit.matchedSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-foreground/80"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
