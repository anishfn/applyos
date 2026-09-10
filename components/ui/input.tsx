import * as React from "react";
import { cn } from "@/lib/utils";

/** Pill input. Focus is a soft lime ring, matching every other control. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-full border border-border bg-popover/60 px-3.5 py-1 text-sm font-medium",
        "transition-[color,box-shadow,border-color,background-color] duration-200 ease-out outline-none",
        "placeholder:font-medium placeholder:text-muted-foreground/70",
        "selection:bg-primary selection:text-primary-foreground",
        "hover:border-foreground/15",
        "focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/25",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "dark:bg-muted/50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
