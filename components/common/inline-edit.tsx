"use client";

import * as React from "react";
import { Check, Pencil, X } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Click-to-edit text.
 *
 * Enter commits, Escape reverts, blur commits, the same contract everywhere in
 * the app, so editing a field never needs a Save button.
 */
export function InlineText({
  value,
  onCommit,
  placeholder = "Add…",
  className,
  textClassName,
  inputClassName,
  multiline = false,
  ariaLabel,
  type = "text",
  truncate = false,
}: {
  value: string | null | undefined;
  onCommit: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  /** Styles the value itself, for headings and other non-default type. */
  textClassName?: string;
  inputClassName?: string;
  multiline?: boolean;
  ariaLabel?: string;
  type?: "text" | "url" | "email" | "number";
  /** Keeps long values like URLs on one line. */
  truncate?: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value ?? "");

  // The draft only exists while editing, so it's seeded on the way in.
  const startEditing = () => {
    setDraft(value ?? "");
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next === (value ?? "")) return;
    onCommit(next.length > 0 ? next : null);
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  if (editing) {
    const shared = {
      autoFocus: true,
      value: draft,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(event.target.value),
      onBlur: commit,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
        if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          commit();
        }
      },
      "aria-label": ariaLabel,
    };
    return multiline ? (
      <Textarea rows={3} className={cn("text-sm", inputClassName)} {...shared} />
    ) : (
      <Input type={type} className={cn("h-8 text-sm", inputClassName)} {...shared} />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      aria-label={ariaLabel ? `Edit ${ariaLabel}` : undefined}
      className={cn(
        "group/inline flex w-full min-w-0 cursor-text items-start gap-1.5 rounded-lg px-1.5 py-1 text-left",
        "transition-colors duration-200 hover:bg-foreground/[0.045]",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        className,
      )}
    >
      <span
        title={truncate && value ? value : undefined}
        className={cn(
          "min-w-0 flex-1 text-sm font-medium",
          textClassName,
          truncate ? "truncate" : "break-words",
          !value && "text-muted-foreground/60",
          multiline && "whitespace-pre-wrap",
        )}
      >
        {value || placeholder}
      </span>
      <Pencil className="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover/inline:opacity-60" />
    </button>
  );
}

/** Label + value row used across every detail page. */
export function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="px-1.5 text-[11px] font-semibold text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A markdown-ish note editor: plain text, monospace-free, saves on blur. */
export function NoteEditor({
  value,
  onCommit,
  placeholder = "Write anything you want to remember…",
  rows = 6,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [draft, setDraft] = React.useState(value);
  const [dirty, setDirty] = React.useState(false);
  const [lastValue, setLastValue] = React.useState(value);

  // Adopt an external change only when there's no unsaved edit to lose.
  if (value !== lastValue) {
    setLastValue(value);
    if (!dirty) setDraft(value);
  }

  const commit = () => {
    setDirty(false);
    if (draft !== value) onCommit(draft);
  };

  return (
    <div className="relative">
      <Textarea
        rows={rows}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => {
          setDraft(event.target.value);
          setDirty(true);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            commit();
            (event.target as HTMLTextAreaElement).blur();
          }
        }}
        className="text-sm leading-6"
      />
      {dirty && (
        <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setDraft(value);
              setDirty(false);
            }}
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.055]"
            aria-label="Discard changes"
          >
            <X className="size-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={commit}
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
            aria-label="Save note"
          >
            <Check className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
