"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The checkbox.
 *
 * A real `<input type="checkbox">` kept visually hidden underneath, so keyboard,
 * form semantics, indeterminate state and screen readers all work without being
 * reimplemented; the visible box is a sibling styled from the app's own tokens.
 * `accent-color` on a native control was the alternative, and it renders as a
 * flat white square in dark mode.
 *
 * The tick is drawn rather than set in type: an SVG path with a dash offset
 * animates on, which reads as the box being ticked instead of a glyph appearing.
 */

const SIZES = {
  sm: { box: "size-3.5", radius: "rounded-[4px]", stroke: 3 },
  md: { box: "size-4", radius: "rounded-[5px]", stroke: 2.8 },
  lg: { box: "size-[18px]", radius: "rounded-md", stroke: 2.6 },
} as const;

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Renders the mixed state. `checked` should be false when this is set. */
  indeterminate?: boolean;
  /** Announced to screen readers when there is no visible text beside it. */
  label?: string;
  size?: keyof typeof SIZES;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  label,
  size = "md",
  disabled,
  className,
  id,
}: CheckboxProps) {
  const config = SIZES[size];
  const on = checked || indeterminate;

  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        ref={(node) => {
          if (node) node.indeterminate = indeterminate;
        }}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        aria-hidden
        className={cn(
          "grid place-items-center transition-[background-color,box-shadow,transform] duration-150 ease-out",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring/30",
          "peer-active:scale-90 peer-disabled:opacity-40 motion-reduce:transition-none",
          config.box,
          config.radius,
          on
            ? "bg-primary text-primary-foreground"
            : "bg-foreground/[0.04] text-transparent shadow-[inset_0_0_0_1px_var(--edge-line-strong)] peer-hover:bg-foreground/[0.08]",
        )}
      >
        <svg viewBox="0 0 16 16" className="size-full" fill="none">
          {indeterminate ? (
            <path
              d="M4.5 8h7"
              stroke="currentColor"
              strokeWidth={config.stroke}
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M4 8.4 6.8 11.2 12 5.4"
              stroke="currentColor"
              strokeWidth={config.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={checked ? 0 : 1}
              className="transition-[stroke-dashoffset] duration-200 ease-out motion-reduce:transition-none"
            />
          )}
        </svg>
      </span>
    </span>
  );
}

/** Checkbox with text beside it, where the whole row is the target. */
export function CheckboxField({
  checked,
  onChange,
  children,
  disabled,
  className,
  size = "md",
}: Omit<CheckboxProps, "label" | "id"> & { children: React.ReactNode }) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-center gap-2 text-xs font-medium select-none",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <Checkbox checked={checked} onChange={onChange} disabled={disabled} size={size} />
      <span className="transition-colors group-hover:text-foreground">{children}</span>
    </label>
  );
}
