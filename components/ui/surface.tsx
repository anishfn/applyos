import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The three surface recipes from the design system, as components.
 *
 * Depth comes from a 3% ring and a translucent fill, never from a heavy border
 * or a growing shadow. Hovering a card swaps its surface colour; it never lifts.
 */

type SurfaceVariant = "card" | "inverted" | "floating" | "plain";

const VARIANTS: Record<SurfaceVariant, string> = {
  card: "edge rounded-2xl bg-card",
  inverted: "rounded-2xl bg-foreground text-background",
  floating: "rounded-2xl edge-strong bg-popover/95 backdrop-blur-xl",
  plain: "rounded-2xl",
};

interface SurfaceProps extends React.ComponentProps<"div"> {
  variant?: SurfaceVariant;
  /** Adds the hover surface swap used by interactive cards. */
  interactive?: boolean;
  asChild?: boolean;
}

function Surface({
  className,
  variant = "card",
  interactive = false,
  ...props
}: SurfaceProps) {
  return (
    <div
      data-slot="surface"
      className={cn(
        VARIANTS[variant],
        interactive &&
          "transition-colors duration-200 ease-out hover:bg-muted/70 motion-reduce:transition-none",
        className,
      )}
      style={{ cornerShape: "squircle" } as React.CSSProperties}
      {...props}
    />
  );
}

/** Section label: wide-tracked, tiny, muted. Used above every panel. */
function Eyebrow({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-[11px] font-semibold text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SurfaceHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-foreground/[0.06] px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

function SurfaceTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("font-runde text-sm font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function SurfaceBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />;
}

export { Surface, SurfaceHeader, SurfaceTitle, SurfaceBody, Eyebrow };
