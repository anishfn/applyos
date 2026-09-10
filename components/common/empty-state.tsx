import type { IconComponent } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Every empty state names the thing that's missing and offers the one action
 * that fixes it. No illustrations, no shrugging mascots.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: {
  icon?: IconComponent;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  secondaryAction?: { label: string; onClick?: () => void; href?: string };
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-1.5 px-4 py-7" : "gap-3 px-6 py-14",
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            "mb-1 inline-flex items-center justify-center rounded-full bg-foreground/[0.04] text-muted-foreground edge",
            compact ? "size-8" : "size-12",
          )}
        >
          <Icon className={compact ? "size-3.5" : "size-5"} aria-hidden />
        </span>
      )}
      <h3
        className={cn(
          "font-runde font-semibold tracking-tight",
          compact ? "text-sm" : "text-base",
        )}
      >
        {title}
      </h3>
      {description && (
        <p className="max-w-xs text-xs leading-5 font-medium text-balance text-muted-foreground">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action &&
            (action.href ? (
              <Button variant="primary" size="sm" href={action.href}>
                {action.label}
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Button variant="ghost" size="sm" href={secondaryAction.href}>
                {secondaryAction.label}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
