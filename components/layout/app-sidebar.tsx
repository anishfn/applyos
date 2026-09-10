"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, Plus, Search, Settings } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/layout/logo";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCollection } from "@/lib/data/hooks";
import { buildNavCounts } from "@/lib/derive";
import { activeHref, NAV_GROUPS, SETTINGS_ITEM, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * The sidebar.
 *
 * Collapses to a 60px rail. The active row is marked by its own background,
 * which is the whole indication it needs.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, openPalette, openQuickAdd } = useAppUI();
  const active = activeHref(pathname);

  return (
    <aside
      data-collapsed={sidebarCollapsed}
      className={cn(
        "hidden shrink-0 flex-col border-r border-border/60 bg-sidebar md:flex",
        "transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        sidebarCollapsed ? "w-[3.75rem]" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2 px-3",
          sidebarCollapsed && "justify-center px-0",
        )}
      >
        {sidebarCollapsed ? (
          /* Collapsed, the mark is the control: hover swaps it for the
             expand glyph, so the rail keeps one button instead of two. */
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Expand sidebar"
                className="group grid size-9 cursor-pointer place-items-center rounded-xl transition-colors duration-200 hover:bg-foreground/[0.06]"
              >
                <Logo className="col-start-1 row-start-1 size-6 transition-opacity duration-150 group-hover:opacity-0" />
                <PanelLeft
                  className="col-start-1 row-start-1 size-4 rotate-180 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  aria-hidden
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        ) : (
          <>
            <Link
              href="/app"
              className="flex min-w-0 items-center gap-2 rounded-full transition-opacity duration-200 hover:opacity-80"
            >
              <Logo className="size-6 shrink-0" />
              <span className="truncate font-runde text-sm font-semibold tracking-tight">
                ApplyOS
              </span>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto"
                  onClick={toggleSidebar}
                  aria-label="Collapse sidebar"
                >
                  <PanelLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Collapse sidebar</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      <div className={cn("px-3 pb-2", sidebarCollapsed && "px-2")}>
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="primary"
                  size="icon-sm"
                  onClick={() => openQuickAdd("application")}
                  aria-label="Add application"
                >
                  <Plus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                Add application <Kbd className="bg-background/15 text-background/80">A</Kbd>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openPalette("search")}
                  aria-label="Search"
                >
                  <Search className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Search</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <>
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => openQuickAdd("application")}
            >
              <Plus className="size-4" />
              Add application
              <Kbd className="ml-auto border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/70">
                A
              </Kbd>
            </Button>
            <button
              type="button"
              onClick={() => openPalette("search")}
              className={cn(
                "mt-1.5 flex h-8 w-full cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-popover/40 px-3",
                "text-xs font-medium text-muted-foreground",
                "transition-colors duration-200 ease-out hover:border-foreground/15 hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Search className="size-3.5" />
              Search
              <Kbd className="ml-auto">/</Kbd>
            </button>
          </>
        )}
      </div>

      <SidebarNav collapsed={sidebarCollapsed} active={active} />

      <SidebarFooter collapsed={sidebarCollapsed} active={active} />
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Nav                                                                         */
/* -------------------------------------------------------------------------- */

function SidebarNav({ collapsed, active }: { collapsed: boolean; active: string }) {
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
    <nav
      className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-3"
      aria-label="Primary"
    >
      <div>

        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1 last:mb-0">
            {!collapsed && (
              <p className="px-2.5 pt-2.5 pb-0.5 text-[11px] font-semibold text-muted-foreground">
                {group.label}
              </p>
            )}
            {collapsed && <div className="my-2 h-px bg-border/50" />}
            <ul className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
              {group.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  active={active === item.href}
                  count={item.badge ? counts[item.badge] : 0}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

const SidebarLink = React.forwardRef<
  HTMLAnchorElement,
  { item: NavItem; collapsed: boolean; active: boolean; count: number }
>(function SidebarLink({ item, collapsed, active, count }, ref) {
  const Icon = item.icon;
  const showBadge = count > 0;

  const link = (
    <Link
      ref={ref}
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-full text-sm font-medium",
        "transition-colors duration-200 ease-out motion-reduce:transition-none",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        collapsed ? "size-9 justify-center" : "h-[30px] px-2.5",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors duration-200",
          active ? "text-foreground" : "text-muted-foreground/80 group-hover:text-foreground",
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && showBadge && (
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
            item.badgeTone === "warning"
              ? "bg-tone-amber/15 text-tone-amber"
              : "bg-foreground/[0.07] text-muted-foreground",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
      {collapsed && showBadge && (
        <span
          className={cn(
            "absolute top-1 right-1 size-1.5 rounded-full",
            item.badgeTone === "warning" ? "bg-tone-amber" : "bg-primary",
          )}
        />
      )}
    </Link>
  );

  return (
    <li className={cn("relative", collapsed && "flex justify-center")}>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.chord && (
              <span className="flex items-center gap-1 opacity-70">
                <Kbd className="border-background/20 bg-background/15 text-background/80">G</Kbd>
                <Kbd className="border-background/20 bg-background/15 text-background/80">
                  {item.chord.toUpperCase()}
                </Kbd>
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      ) : (
        link
      )}
    </li>
  );
});

/* -------------------------------------------------------------------------- */
/* Footer                                                                      */
/* -------------------------------------------------------------------------- */

function SidebarFooter({ collapsed, active }: { collapsed: boolean; active: string }) {
  const profiles = useCollection("profiles");
  const { openPalette, adapterLabel, saving } = useAppUI();
  const profile = profiles[0];
  const settingsActive = active === SETTINGS_ITEM.href;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5 border-t border-border/60 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={SETTINGS_ITEM.href}
              aria-label="Settings"
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full transition-colors duration-200",
                settingsActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Settings className="size-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
        <ThemeToggle side="right" />
      </div>
    );
  }

  return (
    <div className="border-t border-border/60 p-3">
      <div className="flex items-center gap-2">
        <Link
          href="/app/settings"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-full px-1 py-1 transition-colors duration-200 hover:bg-muted/70"
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 font-runde text-xs font-semibold text-primary-ink edge">
            {(profile?.name ?? "You").slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold">{profile?.name ?? "You"}</span>
            <span className="block truncate text-[10px] font-medium text-muted-foreground">
              {saving ? "Saving…" : adapterLabel || "Local workspace"}
            </span>
          </span>
        </Link>
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={SETTINGS_ITEM.href}
              aria-label="Settings"
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                settingsActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Settings className="size-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top">Settings</TooltipContent>
        </Tooltip>
      </div>

      <button
        type="button"
        onClick={() => openPalette("commands")}
        className={cn(
          "mt-2 flex h-7 w-full cursor-pointer items-center gap-2 rounded-full px-2",
          "text-[11px] font-medium text-muted-foreground/80",
          "transition-colors duration-200 hover:bg-muted/70 hover:text-foreground",
        )}
      >
        Command palette
        <Kbd className="ml-auto">⌘</Kbd>
        <Kbd>K</Kbd>
      </button>
    </div>
  );
}
