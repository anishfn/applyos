"use client";

import * as React from "react";
import { Check, Filter, Search, SlidersHorizontal, X } from "@/components/ui/icons";
import { ToneDot } from "@/components/common/badges";
import { Segmented } from "@/components/common/form";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  APPLICATION_COLUMNS,
  countActiveFilters,
  emptyFilters,
  type ApplicationFilters,
  type ColumnKey,
} from "@/lib/filters";
import {
  PRIORITY_CONFIG,
  SOURCE_CONFIG,
  STATUS_CONFIG,
  WORK_MODE_CONFIG,
  type OptionConfig,
} from "@/lib/constants";
import type { ApplicationStatus, Priority, Source, WorkMode } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Debounced so typing stays smooth over a large table. */
export function useDebouncedValue<T>(value: T, delay = 140): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function MultiSelect<T extends string>({
  label,
  selected,
  options,
  onChange,
}: {
  label: string;
  selected: T[];
  options: Record<T, OptionConfig<T>> | OptionConfig<T>[];
  onChange: (values: T[]) => void;
}) {
  const list = Array.isArray(options) ? options : (Object.values(options) as OptionConfig<T>[]);
  const toggle = (value: T) =>
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {list.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium",
                "transition-colors duration-200 ease-out",
                active
                  ? "border-foreground/20 bg-foreground/[0.08] text-foreground"
                  : "border-border/60 text-muted-foreground hover:bg-foreground/[0.045] hover:text-foreground",
              )}
            >
              <ToneDot tone={option.tone} />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ApplicationFilterBar({
  filters,
  onChange,
  tagOptions,
  columns,
  onColumnsChange,
  resultCount,
  totalCount,
  right,
}: {
  filters: ApplicationFilters;
  onChange: (filters: ApplicationFilters) => void;
  tagOptions: string[];
  columns?: ColumnKey[];
  onColumnsChange?: (columns: ColumnKey[]) => void;
  resultCount: number;
  totalCount: number;
  right?: React.ReactNode;
}) {
  const activeCount = countActiveFilters(filters);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const patch = (next: Partial<ApplicationFilters>) => onChange({ ...filters, ...next });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1 sm:max-w-72">
        <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          value={filters.query}
          placeholder="Filter by company, role, tag…"
          onChange={(event) => patch({ query: event.target.value })}
          className="h-8 pr-8 pl-8 text-xs"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => patch({ query: "" })}
            aria-label="Clear search"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <Segmented
        value={filters.scope}
        onChange={(scope) => patch({ scope })}
        ariaLabel="Scope"
        options={[
          { value: "active", label: "Active" },
          { value: "all", label: "All" },
          { value: "closed", label: "Closed" },
          { value: "archived", label: "Archived" },
        ]}
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant={activeCount > 0 ? "secondary" : "outline"} size="sm" className="gap-1.5">
            <Filter className="size-3.5" />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 font-mono text-[10px] font-semibold text-primary-foreground tabular-nums">
                {activeCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] p-4">
          <div className="flex flex-col gap-3.5">
            <MultiSelect<ApplicationStatus>
              label="Status"
              selected={filters.statuses}
              options={STATUS_CONFIG}
              onChange={(statuses) => patch({ statuses })}
            />
            <MultiSelect<Priority>
              label="Priority"
              selected={filters.priorities}
              options={PRIORITY_CONFIG}
              onChange={(priorities) => patch({ priorities })}
            />
            <MultiSelect<Source>
              label="Source"
              selected={filters.sources}
              options={SOURCE_CONFIG}
              onChange={(sources) => patch({ sources })}
            />
            <MultiSelect<WorkMode>
              label="Work mode"
              selected={filters.workModes}
              options={WORK_MODE_CONFIG}
              onChange={(workModes) => patch({ workModes })}
            />
            {tagOptions.length > 0 && (
              <MultiSelect
                label="Tags"
                selected={filters.tags}
                options={tagOptions.map((tag) => ({ value: tag, label: tag, tone: "neutral" as const }))}
                onChange={(tags) => patch({ tags })}
              />
            )}

            <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
              <CheckboxField
                checked={filters.onlyReferrals}
                onChange={(onlyReferrals) => patch({ onlyReferrals })}
              >
                Referrals only
              </CheckboxField>
              <CheckboxField
                checked={filters.onlyNeedsAction}
                onChange={(onlyNeedsAction) => patch({ onlyNeedsAction })}
              >
                Has a next action
              </CheckboxField>
            </div>

            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...emptyFilters(), query: filters.query, scope: filters.scope })}
              >
                Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {columns && onColumnsChange && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="Choose columns">
              <SlidersHorizontal className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-2">
            <p className="px-2 pt-1 pb-2 text-[11px] font-semibold text-muted-foreground">
              Columns
            </p>
            <div className="flex flex-col">
              {APPLICATION_COLUMNS.map((column) => {
                const checked = columns.includes(column.key);
                const locked = "always" in column && column.always;
                return (
                  <button
                    key={column.key}
                    type="button"
                    disabled={locked}
                    onClick={() =>
                      onColumnsChange(
                        checked
                          ? columns.filter((key) => key !== column.key)
                          : [...columns, column.key],
                      )
                    }
                    className={cn(
                      "flex h-7 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-medium transition-colors duration-200",
                      "hover:bg-foreground/[0.055]",
                      locked && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-3.5 items-center justify-center rounded-[4px] border",
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {checked && <Check className="size-2.5" strokeWidth={3} />}
                    </span>
                    {column.label}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <span className="ml-auto hidden shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums sm:block">
        {resultCount === totalCount ? `${totalCount}` : `${resultCount} / ${totalCount}`}
      </span>
      {right}
    </div>
  );
}
