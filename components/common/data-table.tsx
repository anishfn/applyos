"use client";

import * as React from "react";
import Link from "next/link";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/**
 * The list-page table.
 *
 * A card grid is good for browsing and bad for comparing. This is the other
 * half of that pair: same data, one row per record, scannable columns, and the
 * whole row is the link so there is nothing to aim at.
 */

export interface Column<T> {
  key: string;
  label: React.ReactNode;
  /** Grid track for this column, e.g. "minmax(0,2fr)" or "7rem". */
  width: string;
  align?: "left" | "right";
  /** Hidden below this breakpoint, so narrow screens keep the useful columns. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
  render: (row: T) => React.ReactNode;
}

const HIDE_CLASS: Record<string, string> = {
  sm: "hidden sm:block",
  md: "hidden md:block",
  lg: "hidden lg:block",
  xl: "hidden xl:block",
};

export function DataTable<T>({
  rows,
  columns,
  getKey,
  getHref,
  className,
}: {
  rows: T[];
  columns: Array<Column<T>>;
  getKey: (row: T) => string;
  getHref?: (row: T) => string;
  className?: string;
}) {
  const template = columns.map((column) => column.width).join(" ");

  return (
    <Surface className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      <div
        role="row"
        className="grid shrink-0 items-center gap-3 border-b border-foreground/[0.07] bg-foreground/[0.015] px-3.5 py-2"
        style={{ gridTemplateColumns: template }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className={cn(
              "min-w-0 truncate text-[11px] font-semibold text-muted-foreground",
              column.align === "right" && "text-right",
              column.hideBelow && HIDE_CLASS[column.hideBelow],
            )}
          >
            {column.label}
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((row) => {
          const href = getHref?.(row);
          const cells = (
            <>
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "min-w-0",
                    column.align === "right" && "text-right",
                    column.hideBelow && HIDE_CLASS[column.hideBelow],
                  )}
                >
                  {column.render(row)}
                </div>
              ))}
            </>
          );

          return (
            <div
              key={getKey(row)}
              role="row"
              className="group relative grid items-center gap-3 border-b border-foreground/[0.05] px-3.5 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-foreground/[0.025]"
              style={{ gridTemplateColumns: template }}
            >
              {href && (
                <Link href={href} className="absolute inset-0 z-0" aria-label="Open">
                  <span className="sr-only">Open</span>
                </Link>
              )}
              {cells}
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

/** Name + avatar, the first column of every list table. */
export function TableIdentity({
  avatar,
  title,
  subtitle,
}: {
  avatar: React.ReactNode;
  title: string;
  subtitle?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {avatar}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
