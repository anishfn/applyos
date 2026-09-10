"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppUI, type QuickAddKind } from "@/components/providers/app-provider";

/** How long a `G` chord stays armed before it expires. */
const CHORD_WINDOW = 1200;

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

const QUICK_ADD_KEYS: Record<string, QuickAddKind> = {
  a: "application",
  j: "job",
  t: "task",
  i: "interview",
  c: "contact",
};

const GOTO_KEYS: Record<string, string> = {
  d: "/app",
  y: "/app/today",
  a: "/app/applications",
  p: "/app/pipeline",
  j: "/app/jobs",
  i: "/app/interviews",
  f: "/app/follow-ups",
  c: "/app/contacts",
  o: "/app/companies",
  t: "/app/tasks",
  l: "/app/calendar",
  g: "/app/goals",
  r: "/app/resumes",
  u: "/app/documents",
  s: "/app/stories",
  n: "/app/analytics",
  ",": "/app/settings",
};

/**
 * Global shortcuts.
 *
 * `Ctrl/⌘ K` always works. Single-letter shortcuts and `G` chords stand down
 * while you're typing or while a modal owns the screen, so they never fire by
 * accident mid-sentence.
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const { openPalette, openQuickAdd, paletteOpen, quickAdd, setPaletteOpen } = useAppUI();
  const chordArmed = useRef<number | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }

      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;
      // A modal is open, let it keep the keyboard.
      if (quickAdd || paletteOpen) return;

      const key = event.key.toLowerCase();

      if (chordArmed.current && Date.now() - chordArmed.current < CHORD_WINDOW) {
        chordArmed.current = null;
        const href = GOTO_KEYS[key];
        if (href) {
          event.preventDefault();
          router.push(href);
        }
        return;
      }

      if (key === "g") {
        chordArmed.current = Date.now();
        return;
      }

      if (key === "/") {
        event.preventDefault();
        openPalette("search");
        return;
      }

      if (event.shiftKey) return;

      const kind = QUICK_ADD_KEYS[key];
      if (kind) {
        event.preventDefault();
        openQuickAdd(kind);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openPalette, openQuickAdd, paletteOpen, quickAdd, router, setPaletteOpen]);
}

export const SHORTCUT_HINTS = {
  palette: "⌘K",
  search: "/",
  addApplication: "A",
  addJob: "J",
  addTask: "T",
  addInterview: "I",
  addContact: "C",
} as const;
