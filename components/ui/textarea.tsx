import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-20 w-full rounded-2xl border border-border bg-popover/60 px-3.5 py-2.5 text-sm font-medium leading-6",
        "transition-[color,box-shadow,border-color,background-color] duration-200 ease-out outline-none",
        "placeholder:font-medium placeholder:text-muted-foreground/70",
        "hover:border-foreground/15",
        "focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/25",
        "field-sizing-content resize-none dark:bg-muted/50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
