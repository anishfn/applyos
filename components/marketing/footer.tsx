import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { GithubMark } from "@/components/marketing/navbar";

export function MarketingFooter() {
  return (
    <footer className="px-5 pb-10 sm:px-6 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mt-16 flex flex-col gap-4 border-t border-border/60 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Logo className="size-5" />
            <span className="font-runde text-sm font-semibold tracking-tight text-foreground">
              ApplyOS
            </span>
            <span className="text-xs">Open source, and yours to fork.</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/app"
              className="text-xs font-medium transition-colors hover:text-foreground"
            >
              Open the app
            </Link>
            <a
              href="#open-source"
              className="text-xs font-medium transition-colors hover:text-foreground"
            >
              Run it yourself
            </a>
            <a
              href="https://github.com/anishfn/applyos"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="GitHub"
              className="inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-muted hover:text-foreground"
            >
              <GithubMark className="size-[18px]" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
