"use client";

import { useCallback, useSyncExternalStore } from "react";
import { isDarkNow } from "@/lib/theme";

/**
 * Tracks the `dark` class on `<html>`.
 *
 * Subscribing to the DOM rather than holding a copy in React state means the
 * toggle stays correct no matter what flips the theme, the button, the command
 * palette, or the blocking script in the document head.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function useDarkMode(): boolean {
  const getSnapshot = useCallback(() => isDarkNow(), []);
  // Dark is the server-rendered default, matching the `dark` class on <html>.
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
