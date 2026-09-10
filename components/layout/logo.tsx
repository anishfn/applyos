import { cn } from "@/lib/utils";

/**
 * ApplyOS mark: a lime chip with a rising step, for the pipeline the whole
 * product is about. Hand-rolled so it inherits the brand colour token.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-6", className)}
      aria-hidden
      role="presentation"
    >
      <rect width="24" height="24" rx="7" className="fill-primary" />
      <path
        d="M6.5 15.5 L10 12 L13 15 L18 9"
        stroke="var(--primary-foreground)"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="9" r="1.9" fill="var(--primary-foreground)" />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo className="size-6" />
      <span className="font-runde text-base font-semibold tracking-tight">ApplyOS</span>
    </span>
  );
}
