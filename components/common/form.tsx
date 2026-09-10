"use client";

import * as React from "react";
import { CalendarDays, Check, ChevronDown, ChevronUp, Plus, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToneDot } from "@/components/common/badges";
import { addDays, formatDate, fromDateOnly, toDateOnly } from "@/lib/date";
import type { OptionConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  htmlFor,
  required,
  className,
  children,
  action,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={htmlFor}
            className="text-[11px] font-semibold text-muted-foreground"
          >
            {label}
            {required && <span className="ml-0.5 text-tone-rose">*</span>}
          </label>
          {action}
        </div>
      )}
      {children}
      {hint && <p className="text-[11px] font-medium text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FieldGrid({
  columns = 2,
  className,
  children,
}: {
  columns?: 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Select built on a config record                                             */
/* -------------------------------------------------------------------------- */

export function OptionSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  allowClear = false,
  className,
  size = "default",
  id,
}: {
  value: T | null | undefined;
  onChange: (value: T | null) => void;
  options: Record<T, OptionConfig<T>> | OptionConfig<T>[];
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
  size?: "sm" | "default";
  id?: string;
}) {
  const list = Array.isArray(options) ? options : (Object.values(options) as OptionConfig<T>[]);
  const CLEAR = "__clear__";

  return (
    <Select
      value={value ?? ""}
      onValueChange={(next) => onChange(next === CLEAR ? null : (next as T))}
    >
      <SelectTrigger id={id} size={size} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowClear && (
          <SelectItem value={CLEAR}>
            <span className="text-muted-foreground">None</span>
          </SelectItem>
        )}
        {list.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <ToneDot tone={option.tone} />
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                       */
/* -------------------------------------------------------------------------- */

export function DateInput({
  value,
  onChange,
  className,
  id,
  placeholder = "Pick a date",
  clearable = true,
  disabled,
  display = "MMM d, yyyy",
  ariaLabel,
}: {
  /** `YYYY-MM-DD`. */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  /** date-fns pattern for the trigger label. Short in dense rows. */
  display?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? fromDateOnly(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "flex h-9 w-full cursor-pointer items-center gap-2 rounded-full border border-border bg-popover/60 px-3.5",
            "text-left text-sm font-medium transition-colors duration-200 ease-out outline-none",
            "hover:border-foreground/15 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
            {value ? formatDate(fromDateOnly(value), display) : placeholder}
          </span>
          {clearable && value && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear date"
              onClick={(event) => {
                event.stopPropagation();
                onChange(null);
              }}
              className="-mr-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
            >
              <X className="size-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(date ? toDateOnly(date) : null);
            setOpen(false);
          }}
        />
        <div className="flex items-center gap-1 border-t border-border/60 p-2">
          {QUICK_DATES.map((quick) => (
            <Button
              key={quick.label}
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                onChange(toDateOnly(quick.get()));
                setOpen(false);
              }}
            >
              {quick.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const QUICK_DATES = [
  { label: "Today", get: () => new Date() },
  { label: "Tomorrow", get: () => addDays(new Date(), 1) },
  { label: "Next week", get: () => addDays(new Date(), 7) },
];

/** 15 minute steps. Anything finer belongs in the notes, not the picker. */
const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const suffix = hours < 12 ? "AM" : "PM";
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return { value, label: `${twelve}:${String(minutes).padStart(2, "0")} ${suffix}` };
});

export function DateTimeInput({
  value,
  onChange,
  className,
  id,
}: {
  /** ISO timestamp. */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  className?: string;
  id?: string;
}) {
  const date = value ? new Date(value) : null;
  const valid = date && !Number.isNaN(date.getTime()) ? date : null;

  const time = valid
    ? `${String(valid.getHours()).padStart(2, "0")}:${String(
        Math.round(valid.getMinutes() / 15) * 15,
      ).padStart(2, "0")}`
    : "09:00";

  const commit = (day: string | null, nextTime: string) => {
    if (!day) return onChange(null);
    const [hours, minutes] = nextTime.split(":").map(Number);
    const next = fromDateOnly(day);
    next.setHours(hours, minutes, 0, 0);
    onChange(next.toISOString());
  };

  return (
    // Wraps rather than squeezing: in a half-width dialog column the time drops
    // to its own line instead of crushing the date into an ellipsis.
    <div className={cn("flex flex-wrap gap-2", className)}>
      <DateInput
        id={id}
        value={valid ? toDateOnly(valid) : null}
        clearable={false}
        placeholder="Pick a day"
        display="EEE, MMM d"
        onChange={(day) => commit(day, time)}
        className="min-w-[8.5rem] flex-1"
      />
      <Select
        value={time === "24:00" ? "00:00" : time}
        onValueChange={(next) => commit(valid ? toDateOnly(valid) : toDateOnly(new Date()), next)}
      >
        <SelectTrigger className="w-[6.75rem] shrink-0 grow">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {TIME_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * A number field without the browser's spinner, with our own stepper instead.
 * The native control is a different size and shape in every browser.
 */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  className,
  id,
  placeholder,
  suffix,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  id?: string;
  placeholder?: string;
  suffix?: string;
}) {
  const clamp = (next: number) => {
    if (min != null && next < min) return min;
    if (max != null && next > max) return max;
    return next;
  };

  return (
    <div
      className={cn(
        "flex h-9 items-center rounded-full border border-border bg-popover/60 pr-1 pl-3.5",
        "transition-colors duration-200 ease-out focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/25",
        "hover:border-foreground/15",
        className,
      )}
    >
      <input
        id={id}
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === "" ? null : Number(next));
        }}
        className="w-full min-w-0 bg-transparent text-sm font-medium tabular-nums outline-none placeholder:text-muted-foreground"
      />
      {suffix && <span className="px-1 text-xs font-medium text-muted-foreground">{suffix}</span>}
      <span className="ml-1 flex shrink-0 flex-col">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Increase"
          onClick={() => onChange(clamp((value ?? 0) + step))}
          className="inline-flex h-3.5 w-6 cursor-pointer items-center justify-center rounded-t-md text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Decrease"
          onClick={() => onChange(clamp((value ?? 0) - step))}
          className="inline-flex h-3.5 w-6 cursor-pointer items-center justify-center rounded-b-md text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
        >
          <ChevronDown className="size-3" />
        </button>
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tags                                                                        */
/* -------------------------------------------------------------------------- */

export function TagsInput({
  value,
  onChange,
  placeholder = "Add tag…",
  suggestions = [],
  className,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}) {
  const [draft, setDraft] = React.useState("");

  const add = (tag: string) => {
    const clean = tag.trim();
    if (!clean || value.includes(clean)) return;
    onChange([...value, clean]);
    setDraft("");
  };

  const unused = suggestions.filter((tag) => !value.includes(tag)).slice(0, 6);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex h-6 items-center gap-1 rounded-full border border-foreground/[0.07] bg-foreground/[0.04] px-2 text-[11px] font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item !== tag))}
              aria-label={`Remove ${tag}`}
              className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add(draft);
            }
            if (event.key === "Backspace" && draft === "" && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          className="h-7 w-28 flex-1 border-dashed bg-transparent px-2.5 text-xs dark:bg-transparent"
        />
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {unused.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => add(tag)}
              className="cursor-pointer rounded-full px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.055] hover:text-foreground"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Entity picker                                                               */
/* -------------------------------------------------------------------------- */

export interface PickerOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

/**
 * Searchable combobox. When `onCreate` is provided, typing an unknown value
 * offers to create it inline, which is how a company gets created without
 * ever leaving the add-application flow.
 */
export function EntityPicker({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "Nothing found",
  onCreate,
  createLabel = "Create",
  allowClear = true,
  className,
  id,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: PickerOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  onCreate?: (name: string) => string | null;
  createLabel?: string;
  allowClear?: boolean;
  className?: string;
  id?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options.slice(0, 60);
    return options
      .filter(
        (option) =>
          option.label.toLowerCase().includes(needle) ||
          option.sublabel?.toLowerCase().includes(needle),
      )
      .slice(0, 60);
  }, [options, query]);

  const exactMatch = options.some(
    (option) => option.label.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full cursor-pointer items-center gap-2 rounded-full border border-border bg-popover/60 px-3.5 text-sm font-medium",
            "transition-colors duration-200 ease-out outline-none",
            "hover:border-foreground/15",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
            "dark:bg-muted/50",
            className,
          )}
        >
          {selected?.icon}
          <span className={cn("min-w-0 flex-1 truncate text-left", !selected && "text-muted-foreground/70")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-56 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-56">
            <CommandEmpty>
              <span className="text-xs text-muted-foreground">{emptyLabel}</span>
            </CommandEmpty>
            {onCreate && query.trim().length > 0 && !exactMatch && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={() => {
                    const created = onCreate(query.trim());
                    if (created) onChange(created);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <Plus className="size-3.5" />
                  {createLabel} “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {allowClear && value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="gap-2 text-muted-foreground"
                >
                  <X className="size-3.5" />
                  Clear
                </CommandItem>
              )}
              {filtered.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  {option.icon}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.sublabel && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {option.sublabel}
                      </span>
                    )}
                  </span>
                  {value === option.value && <Check className="size-3.5 text-primary-ink" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */
/* Segmented control                                                           */
/* -------------------------------------------------------------------------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: React.ReactNode; icon?: React.ReactNode; title?: string }>;
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        // A recessed track with a raised pill on it, rather than a bordered box
        // holding a second bordered box.
        "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-foreground/[0.05] p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
              "transition-colors duration-200 ease-out motion-reduce:transition-none",
              size === "sm" ? "h-6 px-2.5 text-[11px]" : "h-7 px-3 text-xs",
              active
                ? "bg-popover text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.18)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dialog footer                                                               */
/* -------------------------------------------------------------------------- */

export function DialogActions({
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  disabled,
  extra,
}: {
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      {extra && <div className="mr-auto">{extra}</div>}
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button type="submit" variant="primary" size="sm" disabled={disabled}>
        {submitLabel}
      </Button>
    </div>
  );
}
