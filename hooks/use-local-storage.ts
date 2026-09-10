"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A localStorage-backed value that is hydration-safe.
 *
 * `useSyncExternalStore` renders the fallback on the server and the stored
 * value on the client without a setState-in-effect round trip, and a custom
 * event keeps every hook using the same key in sync within the tab.
 */

const EVENT = "applyos:localstorage";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener(EVENT, handler);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", handler);
    window.removeEventListener(EVENT, handler);
  };
}

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

export function useLocalStorageState<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T | null = (raw) => raw as unknown as T,
  serialize: (value: T) => string = (value) => String(value),
): [T, (value: T) => void] {
  const getSnapshot = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return parse(raw) ?? fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback, parse]);

  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const setValue = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, serialize(next));
      } catch {
        /* storage can be unavailable in private browsing, fail quietly */
      }
      emit();
    },
    [key, serialize],
  );

  return [value, setValue];
}

/** JSON-serialised variant, for arrays and objects. */
export function useLocalStorageJSON<T>(key: string, fallback: T): [T, (value: T) => void] {
  const parse = useCallback((raw: string): T | null => {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, []);
  const serialize = useCallback((value: T) => JSON.stringify(value), []);
  return useLocalStorageState<T>(key, fallback, parse, serialize);
}
