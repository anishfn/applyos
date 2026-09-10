import type { Source, WorkMode } from "@/lib/types";

/**
 * The contract between ApplyOS and a browser extension.
 *
 * The extension is not built here, but everything it needs to exist already is:
 * this payload shape, the validator below, and the `/api/capture` route that
 * accepts it. Keeping the contract in the app (rather than in the extension)
 * means the two can be versioned together.
 */

export const CAPTURE_VERSION = 1;

export interface CapturePayload {
  version: number;
  /** Where the extension found this. */
  url: string;
  capturedAt: string;
  company?: string;
  position?: string;
  location?: string;
  workMode?: WorkMode;
  source?: Source;
  /** The job description text, already stripped of markup by the extension. */
  description?: string;
  salary?: { min?: number | null; max?: number | null; currency?: string };
  skills?: string[];
  deadline?: string;
  notes?: string;
  /** `job` parks it in the Jobs list; `application` puts it straight in the pipeline. */
  target: "job" | "application";
  /** Set when the user marks a posting as already applied to. */
  alreadyApplied?: boolean;
  resumeId?: string;
}

export interface CaptureResult {
  ok: boolean;
  id?: string;
  kind?: "job" | "application";
  error?: string;
}

const MAX_TEXT = 20_000;

/**
 * Server-side validation.
 *
 * Everything crossing the network boundary is treated as hostile: types are
 * checked, strings are length-capped, and unknown fields are dropped rather
 * than passed through.
 */
export function validateCapturePayload(input: unknown): { ok: true; value: CapturePayload } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) return { ok: false, error: "Body must be an object" };
  const raw = input as Record<string, unknown>;

  const url = str(raw.url, 2048);
  if (!url) return { ok: false, error: "`url` is required" };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "`url` must be http or https" };
    }
  } catch {
    return { ok: false, error: "`url` is not a valid URL" };
  }

  const target = raw.target === "application" ? "application" : "job";

  const value: CapturePayload = {
    version: typeof raw.version === "number" ? raw.version : CAPTURE_VERSION,
    url,
    capturedAt: str(raw.capturedAt, 40) ?? new Date().toISOString(),
    company: str(raw.company, 200),
    position: str(raw.position, 200),
    location: str(raw.location, 200),
    workMode: oneOf(raw.workMode, ["onsite", "hybrid", "remote"] as const),
    source: str(raw.source, 40) as Source | undefined,
    description: str(raw.description, MAX_TEXT),
    skills: strArray(raw.skills, 60, 40),
    deadline: str(raw.deadline, 20),
    notes: str(raw.notes, 2000),
    target,
    alreadyApplied: raw.alreadyApplied === true,
    resumeId: str(raw.resumeId, 100),
  };

  if (typeof raw.salary === "object" && raw.salary !== null) {
    const salary = raw.salary as Record<string, unknown>;
    value.salary = {
      min: num(salary.min),
      max: num(salary.max),
      currency: str(salary.currency, 8) ?? "USD",
    };
  }

  return { ok: true, value };
}

const str = (value: unknown, max: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed.slice(0, max);
};

const num = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

const strArray = (value: unknown, maxItems: number, maxLength: number): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => str(item, maxLength))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);
};

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
