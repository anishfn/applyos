"use client";

import * as React from "react";
import Link from "next/link";
import { Star } from "@/components/ui/icons";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#loop", label: "How it works" },
  { href: "#open-source", label: "Open source" },
];

/** GitHub mark. Brand marks are not in the icon set, so it's hand-rolled. */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("size-4.5", className)} aria-hidden>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.5 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

/**
 * The floating pill navbar.
 *
 * The header is pointer-events-none so the page scrolls under it; only the nav
 * itself takes pointer events.
 */
export function MarketingNavbar() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 px-3 sm:px-4">
      <nav
        className={cn(
          "pointer-events-auto mx-auto flex min-h-13 w-full max-w-navbar items-center gap-1.5",
          "overflow-hidden rounded-full border border-border bg-popover/92 px-2.5 py-2",
          "text-foreground backdrop-blur-xl",
          "min-[380px]:gap-2 sm:min-h-14 sm:gap-3 sm:px-4",
        )}
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-full transition-opacity duration-200 hover:opacity-80"
        >
          <Logo className="size-6" />
          <span className="font-runde text-sm font-semibold tracking-tight">ApplyOS</span>
        </Link>

        <div className="mx-auto hidden items-center gap-0.5 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0 sm:gap-2">
          <ThemeToggle side="bottom" className="size-9 sm:size-10" />
          <Button
            href="https://github.com/anishfn/applyos"
            target="_blank"
            rel="noreferrer noopener"
            variant="primary"
            size="sm"
            className="group h-9 gap-2 px-3 sm:h-10 sm:px-4"
          >
            {/* Two-icon cross-fade: the mark shrinks out as the star scales in. */}
            <span className="relative flex size-4.5 items-center justify-center">
              <GithubMark className="absolute size-4.5 transition-all duration-200 group-hover:scale-75 group-hover:opacity-0" />
              <Star className="absolute size-4.5 scale-75 fill-primary-foreground opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100" />
            </span>
            <span className="hidden min-[380px]:inline">Star</span>
          </Button>
          <Button href="/app" variant="secondary" size="sm" className="h-9 sm:h-10">
            Open the app
          </Button>
        </div>
      </nav>
    </header>
  );
}

export { GithubMark };
