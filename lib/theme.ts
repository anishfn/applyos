export const THEME_STORAGE_KEY = "applyos-theme";

export type ThemeMode = "light" | "dark" | "system";

export const readTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  // Dark-first: an unset preference means dark, not the OS setting.
  return "dark";
};

const prefersDark = () =>
  typeof window !== "undefined" && !window.matchMedia("(prefers-color-scheme: light)").matches;

/** Writes the class before anything can observe the old one. No provider, no flash. */
export const applyTheme = (mode: ThemeMode) => {
  if (typeof document === "undefined") return;
  const dark = mode === "system" ? prefersDark() : mode === "dark";
  document.documentElement.classList.toggle("dark", dark);
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
};

export const isDarkNow = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark");
