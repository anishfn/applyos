import * as React from "react";
import { cn } from "@/lib/utils";

/** Page title block. Sticky-free: the app shell owns scroll, pages just flow. */
export function PageHeader({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-runde text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {description && (
            <p className="mt-1 text-sm font-medium text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/** Small header used above panels inside a page. */
export function SectionHeader({
  title,
  action,
  count,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-4 py-2.5", className)}>
      <div className="flex items-center gap-2">
        <h2 className="font-runde text-sm font-semibold tracking-tight">{title}</h2>
        {count != null && count > 0 && (
          <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}
