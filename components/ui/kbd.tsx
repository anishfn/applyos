import * as React from "react";
import { cn } from "@/lib/utils";

/** A single key cap. Compose several for a chord: `<Kbd>G</Kbd><Kbd>D</Kbd>`. */
function Kbd({ className, children, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-foreground/10 bg-foreground/[0.06]",
        "px-1.5 font-mono text-[10px] font-semibold text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

/** Renders "Ctrl K" or "G then D" from a compact string like "mod+k" / "g d". */
function Shortcut({ keys, className }: { keys: string; className?: string }) {
  const parts = keys.split(/\s+/);
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {parts.map((part, index) => (
        <React.Fragment key={`${part}-${index}`}>
          {index > 0 && part !== "then" && (
            <span className="text-[10px] text-muted-foreground/60">then</span>
          )}
          <Kbd>{part.replace("mod", "⌘").toUpperCase()}</Kbd>
        </React.Fragment>
      ))}
    </span>
  );
}

export { Kbd, Shortcut };
