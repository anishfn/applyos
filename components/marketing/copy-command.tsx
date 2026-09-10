"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Copy } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * A copyable command pill.
 *
 * The copy and check glyphs share one grid cell and cross-fade, with a short
 * delay on the incoming check so it lands after the copy icon has left.
 */
export function CopyCommand({
  command,
  prefix,
  className,
}: {
  command: string;
  /** The muted leading part, e.g. "git clone ". */
  prefix?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const reduceMotion = useReducedMotion();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${prefix ?? ""}${command}`);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked, the text is selectable either way */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy: ${prefix ?? ""}${command}`}
      className={cn(
        "group flex h-12 w-full max-w-sm cursor-pointer flex-row-reverse items-center justify-between gap-3",
        "rounded-2xl border border-border bg-popover/90 px-4 text-foreground shadow-none",
        "edge",
        "transition-[background-color,border-color] duration-200 ease-out",
        "hover:border-foreground/10 hover:bg-muted/60",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        "sm:w-fit sm:justify-start sm:px-5",
        className,
      )}
    >
      <span className="grid shrink-0 place-items-center">
        <motion.span
          className="col-start-1 row-start-1"
          animate={{ opacity: copied ? 0 : 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.14, ease: "easeIn" }}
        >
          <Copy className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
        </motion.span>
        <motion.span
          className="col-start-1 row-start-1"
          animate={{ opacity: copied ? 1 : 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.16, ease: "easeOut", delay: copied ? 0.07 : 0 }
          }
        >
          <SealCheck className="size-4.5" />
        </motion.span>
      </span>

      <span className="min-w-0 truncate font-mono text-xs font-semibold tracking-tight sm:text-sm">
        {prefix && <span className="text-muted-foreground">{prefix}</span>}
        <span className="text-foreground">{command}</span>
      </span>

      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}

/** A scalloped seal with a tick, a custom mark rather than a plain check. */
function SealCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 1.6l2.1 1.9 2.8-.5.9 2.7 2.6 1.2-.7 2.8 1.8 2.2-1.8 2.2.7 2.8-2.6 1.2-.9 2.7-2.8-.5L12 22.4l-2.1-1.9-2.8.5-.9-2.7-2.6-1.2.7-2.8L2.5 12l1.8-2.2-.7-2.8 2.6-1.2.9-2.7 2.8.5L12 1.6Z"
        fill="var(--primary)"
      />
      <path
        d="M8.2 12.2l2.6 2.6 5-5.4"
        stroke="var(--primary-foreground)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
