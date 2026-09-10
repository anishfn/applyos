import type { Source, WorkMode } from "./types";

/**
 * Best-effort extraction of job details from a posting URL.
 *
 * Runs entirely client-side against the URL structure of the major applicant
 * tracking systems, so pasting a link fills most of the form instantly and
 * without a network round-trip. The shape returned here is deliberately the
 * same one a server-side scraper or the browser extension would produce, so
 * either can be swapped in later without touching callers.
 *
 * @see lib/ai/provider.ts for the richer, optional JD-parsing path.
 */

export interface ParsedJob {
  company?: string;
  position?: string;
  source?: Source;
  location?: string;
  workMode?: WorkMode;
  /** Which parts we actually recognised, for UI hinting. */
  confidence: "none" | "partial" | "good";
}

const TITLE_CASE_EXCEPTIONS: Record<string, string> = {
  ai: "AI",
  ml: "ML",
  ui: "UI",
  ux: "UX",
  ios: "iOS",
  api: "API",
  qa: "QA",
  sre: "SRE",
  devops: "DevOps",
  fullstack: "Full-stack",
  nodejs: "Node.js",
  and: "and",
  of: "of",
  the: "the",
  ii: "II",
  iii: "III",
  iv: "IV",
};

export function humanize(slug: string): string {
  const words = slug
    .replace(/[_+]/g, "-")
    .split("-")
    .filter((word) => word.length > 0 && !/^\d{4,}$/.test(word));
  if (words.length === 0) return "";
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      const exception = TITLE_CASE_EXCEPTIONS[lower];
      if (exception) return index === 0 ? capitalize(exception) : exception;
      return capitalize(lower);
    })
    .join(" ")
    .trim();
}

const capitalize = (word: string) =>
  word.length === 0 ? word : word[0].toUpperCase() + word.slice(1);

/** Hostnames that host many companies, the company lives in the path. */
const ATS_HOSTS: Record<string, { source: Source; companyIndex: number }> = {
  "boards.greenhouse.io": { source: "job_board", companyIndex: 0 },
  "job-boards.greenhouse.io": { source: "job_board", companyIndex: 0 },
  "jobs.lever.co": { source: "job_board", companyIndex: 0 },
  "jobs.ashbyhq.com": { source: "job_board", companyIndex: 0 },
  "apply.workable.com": { source: "job_board", companyIndex: 0 },
  "jobs.workable.com": { source: "job_board", companyIndex: 0 },
  "careers.smartrecruiters.com": { source: "job_board", companyIndex: 0 },
  "jobs.smartrecruiters.com": { source: "job_board", companyIndex: 0 },
  "boards.eu.greenhouse.io": { source: "job_board", companyIndex: 0 },
  "jobs.jobvite.com": { source: "job_board", companyIndex: 0 },
  "recruiting.paylocity.com": { source: "job_board", companyIndex: 0 },
  "breezy.hr": { source: "job_board", companyIndex: 0 },
  "hire.withgoogle.com": { source: "job_board", companyIndex: 0 },
};

/** Aggregators where the company is in a query param or not in the URL at all. */
const AGGREGATOR_SOURCES: Record<string, Source> = {
  "linkedin.com": "linkedin",
  "indeed.com": "indeed",
  "wellfound.com": "wellfound",
  "angel.co": "wellfound",
  "glassdoor.com": "glassdoor",
  "news.ycombinator.com": "hacker_news",
  "ycombinator.com": "job_board",
  "otta.com": "job_board",
  "builtin.com": "job_board",
  "dice.com": "job_board",
  "monster.com": "job_board",
  "ziprecruiter.com": "job_board",
  "simplyhired.com": "job_board",
  "remoteok.com": "job_board",
  "weworkremotely.com": "job_board",
  "naukri.com": "job_board",
};

const GENERIC_SUBDOMAINS = new Set([
  "www",
  "jobs",
  "careers",
  "career",
  "apply",
  "boards",
  "job",
  "hiring",
  "work",
  "talent",
  "recruiting",
  "my",
]);

/** Path segments that are never a job title. */
const NOISE_SEGMENTS = new Set([
  "jobs",
  "job",
  "careers",
  "career",
  "positions",
  "position",
  "openings",
  "opening",
  "opportunities",
  "vacancy",
  "vacancies",
  "apply",
  "view",
  "details",
  "detail",
  "posting",
  "postings",
  "role",
  "roles",
  "en",
  "en-us",
  "us",
  "search",
  "listing",
  "p",
  "o",
]);

const WORK_MODE_HINTS: Array<[RegExp, WorkMode]> = [
  [/\bremote\b/i, "remote"],
  [/\bhybrid\b/i, "hybrid"],
  [/\bon-?site\b/i, "onsite"],
  [/\bin-?office\b/i, "onsite"],
];

export function parseJobUrl(input: string): ParsedJob {
  const trimmed = input.trim();
  if (!trimmed) return { confidence: "none" };

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { confidence: "none" };
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".")) return { confidence: "none" };
  const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const result: ParsedJob = { confidence: "none" };

  // 1. Multi-tenant ATS: company is the first path segment.
  const ats = ATS_HOSTS[host] ?? ATS_HOSTS[url.hostname.toLowerCase()];
  if (ats) {
    result.source = ats.source;
    const companySlug = segments[ats.companyIndex];
    if (companySlug) result.company = humanize(companySlug);
    const title = pickTitleSegment(segments.slice(ats.companyIndex + 1));
    if (title) result.position = title;
  } else {
    // 2. Known aggregator: source only, company usually lives in the page body.
    const aggregator = Object.keys(AGGREGATOR_SOURCES).find(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
    if (aggregator) {
      result.source = AGGREGATOR_SOURCES[aggregator];
      const title = pickTitleSegment(segments);
      if (title) result.position = title;
    } else {
      // 3. Company-owned careers page: the domain is the company.
      result.source = "company_site";
      result.company = companyFromHost(host);
      const title = pickTitleSegment(segments);
      if (title) result.position = title;
    }
  }

  // Query params used by several boards (`?title=`, `?gh_jid=`, LinkedIn's `?currentJobId=`).
  const queryTitle = url.searchParams.get("title") ?? url.searchParams.get("jobTitle");
  if (queryTitle && !result.position) result.position = humanize(queryTitle.replace(/\s+/g, "-"));
  const queryCompany = url.searchParams.get("company") ?? url.searchParams.get("companyName");
  if (queryCompany && !result.company) result.company = humanize(queryCompany.replace(/\s+/g, "-"));

  const haystack = `${url.pathname} ${url.search}`;
  for (const [pattern, mode] of WORK_MODE_HINTS) {
    if (pattern.test(haystack)) {
      result.workMode = mode;
      break;
    }
  }
  if (result.position) result.position = stripWorkModeWords(result.position);

  const known = [result.company, result.position].filter(Boolean).length;
  result.confidence = known === 2 ? "good" : known === 1 ? "partial" : "none";
  return result;
}

function companyFromHost(host: string): string | undefined {
  const parts = host.split(".");
  // Drop the TLD (and a second-level country TLD like `co.uk`).
  let base = parts.slice(0, -1);
  if (base.length > 1 && ["co", "com", "org", "net", "ac", "gov"].includes(base[base.length - 1])) {
    base = base.slice(0, -1);
  }
  const meaningful = base.filter((part) => !GENERIC_SUBDOMAINS.has(part));
  const name = meaningful[meaningful.length - 1] ?? base[base.length - 1];
  if (!name) return undefined;
  return humanize(name);
}

function pickTitleSegment(segments: string[]): string | undefined {
  const candidates = segments
    .filter((segment) => !NOISE_SEGMENTS.has(segment.toLowerCase()))
    // Drop pure IDs and UUIDs.
    .filter((segment) => !/^[0-9]+$/.test(segment))
    .filter((segment) => !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment))
    .filter((segment) => segment.includes("-") || /[a-z]/i.test(segment));

  // Prefer the longest word-like segment, job slugs are the verbose ones.
  const best = candidates
    .map((segment) => segment.replace(/-{2,}/g, "-").replace(/^-|-$/g, ""))
    .map(stripIdTokens)
    .filter((segment) => segment.split("-").filter((w) => /[a-z]/i.test(w)).length >= 2)
    .sort((a, b) => b.length - a.length)[0];

  if (!best) return undefined;
  const humanized = humanize(best);
  return humanized.length > 1 ? humanized : undefined;
}

/** Removes hash-like tokens that job boards prepend or append to title slugs. */
function stripIdTokens(slug: string): string {
  return slug
    .split("-")
    .filter((word) => !(/\d/.test(word) && /^[0-9a-f]{3,12}$/i.test(word)))
    .join("-");
}

function stripWorkModeWords(title: string): string {
  return title
    .replace(/\b(remote|hybrid|on-?site|in-?office)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s\-–—,|]+$/, "")
    .replace(/^[\s\-–—,|]+/, "")
    .trim();
}

/** Derives a company website domain from any URL, for logo + website defaults. */
export function domainFromUrl(input?: string | null): string | undefined {
  if (!input) return undefined;
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (ATS_HOSTS[host] || Object.keys(AGGREGATOR_SOURCES).some((d) => host.endsWith(d))) {
      return undefined;
    }
    return host;
  } catch {
    return undefined;
  }
}

/** Guesses a company's primary domain from its name, for logo lookups. */
export function guessDomain(companyName: string): string {
  return `${companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40)}.com`;
}
