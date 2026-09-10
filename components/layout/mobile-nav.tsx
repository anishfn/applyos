"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Plus, Search } from "@/components/ui/icons";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCollection } from "@/lib/data/hooks";
import { buildNavCounts } from "@/lib/derive";
import { activeHref, MOBILE_NAV_ITEMS, NAV_GROUPS, SETTINGS_ITEM } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Phone chrome: a slim top bar, a bottom nav, and a floating quick-add. */
export function MobileTopBar() {
  const { openPalette, setMobileNavOpen } = useAppUI();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/85 px-3 backdrop-blur-xl md:hidden">
      <Link href="/app" className="flex items-center gap-2">
        <Logo className="size-6" />
        <span className="font-runde text-sm font-semibold tracking-tight">ApplyOS</span>
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => openPalette("search")}
          aria-label="Search"
        >
          <Search className="size-4" />
        </Button>
        <ThemeToggle side="bottom" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <LayoutGrid className="size-4" />
        </Button>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const active = activeHref(pathname);
  const { openQuickAdd, setMobileNavOpen } = useAppUI();

  const applications = useCollection("applications");
  const interviews = useCollection("interviews");
  const tasks = useCollection("tasks");
  const followUps = useCollection("followUps");
  const jobs = useCollection("jobs");
  const counts = React.useMemo(
    () => buildNavCounts({ applications, interviews, tasks, followUps, jobs }),
    [applications, interviews, tasks, followUps, jobs],
  );

  return (
    <>
      <Button
        variant="primary"
        size="icon-lg"
        onClick={() => openQuickAdd("application")}
        aria-label="Add application"
        className="fixed right-3 bottom-[4.5rem] z-40 size-11 shadow-lg ring-2 ring-background md:hidden"
      >
        <Plus className="size-5" />
      </Button>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.href;
          const count = item.badge ? counts[item.badge] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold",
                "transition-colors duration-200",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span className="relative">
                <Icon className="size-5" />
                {count > 0 && (
                  <span
                    className={cn(
                      "absolute -top-0.5 -right-1.5 size-1.5 rounded-full",
                      item.badgeTone === "warning" ? "bg-tone-amber" : "bg-primary",
                    )}
                  />
                )}
              </span>
              {item.label}
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden />
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-muted-foreground transition-colors duration-200"
        >
          <LayoutGrid className="size-5" />
          More
        </button>
      </nav>
    </>
  );
}

export function MobileNavSheet() {
  const pathname = usePathname();
  const active = activeHref(pathname);
  const { mobileNavOpen, setMobileNavOpen } = useAppUI();

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent side="right" className="w-[17rem] p-0">
        <SheetHeader className="border-b border-border/60">
          <SheetTitle className="flex items-center gap-2 font-runde tracking-tight">
            <Logo className="size-5" />
            ApplyOS
          </SheetTitle>
          <SheetDescription className="sr-only">Application navigation</SheetDescription>
        </SheetHeader>
        <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="px-2.5 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground">
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "flex h-9 items-center gap-2.5 rounded-full px-2.5 text-sm font-medium transition-colors duration-200",
                          isActive
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="mt-2 border-t border-border/60 pt-2">
            <Link
              href={SETTINGS_ITEM.href}
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-full px-2.5 text-sm font-medium transition-colors duration-200",
                active === SETTINGS_ITEM.href
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <SETTINGS_ITEM.icon className="size-4" />
              Settings
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
