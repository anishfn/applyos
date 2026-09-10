"use client";

import * as React from "react";
import { AlertTriangle } from "@/components/ui/icons";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBottomNav, MobileNavSheet, MobileTopBar } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/command/command-palette";
import { QuickAddDialogs } from "@/components/dialogs/quick-add";
import { AppProvider, useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={0}>
      <AppProvider>
        <AppShellInner>{children}</AppShellInner>
      </AppProvider>
    </TooltipProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();
  const { error } = useAppUI();

  return (
    // Pinned to the viewport rather than sized to it: if anything ever
    // overflows the document, the shell still covers the screen instead of
    // scrolling away and leaving an empty page behind it.
    <div data-app-shell className="fixed inset-0 flex overflow-hidden bg-background">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        {error && <WorkspaceError message={error} />}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto flex min-h-full w-full max-w-[1560px] flex-col px-4 pt-5 pb-28 sm:px-6 md:pb-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav />
      <MobileNavSheet />
      <CommandPalette />
      <QuickAddDialogs />
    </div>
  );
}

function WorkspaceError({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive"
    >
      <AlertTriangle className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{message}</span>
      <Button variant="ghost" size="xs" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );
}
