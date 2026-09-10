import type { SalaryRange } from "./types";

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
  SGD: "S$",
  JPY: "¥",
  CHF: "CHF ",
};

export const currencySymbol = (currency: string) => CURRENCY_SYMBOL[currency] ?? `${currency} `;

/** 145000 → "145k", 1250000 → "1.25M", 65 → "65". */
export const compactNumber = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${trimZeros(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${trimZeros(value / 1_000)}k`;
  return String(Math.round(value));
};

const trimZeros = (value: number) =>
  value.toFixed(value % 1 === 0 ? 0 : value < 10 ? 2 : 1).replace(/\.0+$/, "");

export const formatSalary = (salary: SalaryRange | null | undefined): string | null => {
  if (!salary) return null;
  const { min, max, currency, period } = salary;
  if (min == null && max == null) return null;
  const symbol = currencySymbol(currency);
  const suffix = period === "hour" ? "/hr" : period === "month" ? "/mo" : "";
  if (min != null && max != null) {
    return min === max
      ? `${symbol}${compactNumber(min)}${suffix}`
      : `${symbol}${compactNumber(min)}–${compactNumber(max)}${suffix}`;
  }
  const value = (min ?? max) as number;
  return `${min != null ? "from " : "up to "}${symbol}${compactNumber(value)}${suffix}`;
};

export const formatSalaryFull = (salary: SalaryRange | null | undefined): string | null => {
  if (!salary || (salary.min == null && salary.max == null)) return null;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: salary.currency,
    maximumFractionDigits: 0,
  });
  const suffix = salary.period === "hour" ? " / hour" : salary.period === "month" ? " / month" : " / year";
  if (salary.min != null && salary.max != null && salary.min !== salary.max) {
    return `${formatter.format(salary.min)} – ${formatter.format(salary.max)}${suffix}`;
  }
  return `${formatter.format((salary.min ?? salary.max) as number)}${suffix}`;
};

/** Midpoint of a range, for averages. */
export const salaryMidpoint = (salary: SalaryRange | null | undefined): number | null => {
  if (!salary) return null;
  const { min, max } = salary;
  if (min != null && max != null) return (min + max) / 2;
  return min ?? max ?? null;
};

export const formatPercent = (value: number, digits = 0): string =>
  `${(value * 100).toFixed(digits)}%`;

export const formatRate = (numerator: number, denominator: number, digits = 0): string =>
  denominator === 0 ? "-" : formatPercent(numerator / denominator, digits);

export const initials = (name: string): string => {
  const parts = name
    .trim()
    .split(/[\s\-_]+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const formatBytes = (bytes: number | null | undefined): string => {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
};

export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

/** Turns `final_round` into `Final round` for anything without an explicit label. */
export const humanizeKey = (value: string): string =>
  value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export const truncate = (value: string, length: number): string =>
  value.length <= length ? value : `${value.slice(0, length - 1).trimEnd()}…`;

/** Stable 0–n hash so a name always maps to the same avatar tone. */
export const hashIndex = (value: string, buckets: number): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % buckets;
};
