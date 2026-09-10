"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Tabler-style contrast glyph: a circle with one half hatched. */
function ContrastIcon({ className }: { className?: string }) {
  const clipId = React.useId();
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4", className)} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <path d="M12 3a9 9 0 0 1 0 18z" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <g clipPath={`url(#${clipId})`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M6 16.5 19.5 3" />
        <path d="M8.5 19 22 5.5" />
        <path d="M3.5 14 17 0.5" />
        <path d="M11 21.5 24.5 8" />
      </g>
    </svg>
  );
}

/**
 * No provider, no context, no flash: flips the class on `<html>` and writes
 * `localStorage`, exactly like the blocking script in the document head.
 */
export function ThemeToggle({
  side = "top",
  className,
}: {
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  const dark = useDarkMode();

  const toggle = () => applyTheme(dark ? "light" : "dark");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className={cn("shrink-0", className)}
        >
          <ContrastIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>{dark ? "Light mode" : "Dark mode"}</TooltipContent>
    </Tooltip>
  );
}

export { ContrastIcon };
