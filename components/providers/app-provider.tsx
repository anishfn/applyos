"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { ensureProfile, restoreBundle, type UndoBundle } from "@/lib/data/actions";
import { useBootstrap } from "@/lib/data/hooks";
import { store } from "@/lib/data/store";

/**
 * Owns everything that is global but ephemeral: which modal is open, whether
 * the palette is showing, and the undo affordance. Persistent state lives in
 * the store; this is only UI.
 */

export type QuickAddKind =
  | "application"
  | "job"
  | "task"
  | "contact"
  | "company"
  | "interview"
  | "follow_up"
  | "resume"
  | "cover_letter"
  | "document"
  | "goal"
  | "story"
  | "event";

export interface QuickAddOptions {
  applicationId?: string;
  companyId?: string;
  contactId?: string;
  interviewId?: string;
  jobId?: string;
  /** Pre-fills the date field, used by the calendar's click-to-create. */
  date?: string;
}

interface AppUIValue {
  ready: boolean;
  loading: boolean;
  error: string | null;
  saving: boolean;
  adapterLabel: string;

  quickAdd: { kind: QuickAddKind; options: QuickAddOptions } | null;
  openQuickAdd: (kind: QuickAddKind, options?: QuickAddOptions) => void;
  closeQuickAdd: () => void;

  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  openPalette: (mode?: "commands" | "search") => void;
  paletteMode: "commands" | "search";

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  /** Deletes with an undo toast instead of a confirmation dialog. */
  deleteWithUndo: (bundle: UndoBundle) => void;
}

const AppUIContext = React.createContext<AppUIValue | null>(null);

const SIDEBAR_KEY = "applyos-sidebar-collapsed";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useBootstrap();
  const router = useRouter();

  const [quickAdd, setQuickAdd] = React.useState<AppUIValue["quickAdd"]>(null);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [paletteMode, setPaletteMode] = React.useState<"commands" | "search">("commands");
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageState<boolean>(
    SIDEBAR_KEY,
    false,
    (raw) => raw === "1",
    (value) => (value ? "1" : "0"),
  );
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // The workspace always has exactly one profile row.
  React.useEffect(() => {
    if (snapshot.status === "ready") ensureProfile();
  }, [snapshot.status]);

  const toggleSidebar = React.useCallback(
    () => setSidebarCollapsed(!sidebarCollapsed),
    [sidebarCollapsed, setSidebarCollapsed],
  );

  const openQuickAdd = React.useCallback((kind: QuickAddKind, options: QuickAddOptions = {}) => {
    setPaletteOpen(false);
    setMobileNavOpen(false);
    setQuickAdd({ kind, options });
  }, []);

  const closeQuickAdd = React.useCallback(() => setQuickAdd(null), []);

  const openPalette = React.useCallback((mode: "commands" | "search" = "commands") => {
    setPaletteMode(mode);
    setPaletteOpen(true);
  }, []);

  const deleteWithUndo = React.useCallback((bundle: UndoBundle) => {
    toast(bundle.label, {
      action: {
        label: "Undo",
        onClick: () => {
          restoreBundle(bundle);
          toast.success("Restored");
        },
      },
      duration: 7000,
    });
  }, []);

  // Surface persistence failures rather than silently dropping writes.
  const lastError = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (snapshot.error && snapshot.error !== lastError.current) {
      lastError.current = snapshot.error;
      toast.error("Couldn't save changes", { description: snapshot.error });
    }
    if (!snapshot.error) lastError.current = null;
  }, [snapshot.error]);

  // Prefetch the heavy routes so navigation is genuinely instant.
  React.useEffect(() => {
    if (snapshot.status !== "ready") return;
    for (const href of ["/app", "/app/applications", "/app/pipeline", "/app/tasks", "/app/today"]) {
      router.prefetch(href);
    }
  }, [router, snapshot.status]);

  const value = React.useMemo<AppUIValue>(
    () => ({
      ready: snapshot.status === "ready",
      loading: snapshot.status === "loading" || snapshot.status === "idle",
      error: snapshot.status === "error" ? snapshot.error : null,
      saving: snapshot.saving,
      adapterLabel: snapshot.adapterLabel,
      quickAdd,
      openQuickAdd,
      closeQuickAdd,
      paletteOpen,
      setPaletteOpen,
      openPalette,
      paletteMode,
      sidebarCollapsed,
      toggleSidebar,
      mobileNavOpen,
      setMobileNavOpen,
      deleteWithUndo,
    }),
    [
      snapshot.status,
      snapshot.error,
      snapshot.saving,
      snapshot.adapterLabel,
      quickAdd,
      openQuickAdd,
      closeQuickAdd,
      paletteOpen,
      openPalette,
      paletteMode,
      sidebarCollapsed,
      toggleSidebar,
      mobileNavOpen,
      deleteWithUndo,
    ],
  );

  return <AppUIContext.Provider value={value}>{children}</AppUIContext.Provider>;
}

export function useAppUI(): AppUIValue {
  const context = React.useContext(AppUIContext);
  if (!context) throw new Error("useAppUI must be used inside <AppProvider>");
  return context;
}

export { store };
