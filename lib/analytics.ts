import {
  ACTIVE_STATUSES,
  INTERVIEWING_STATUSES,
  RESPONDED_STATUSES,
  SOURCE_CONFIG,
  STATUS_CONFIG,
  STATUS_RANK,
  WORK_MODE_CONFIG,
} from "./constants";
import { addDays, daysSince, differenceInCalendarDays, startOfDay, subDays, toDate, toDateOnly } from "./date";
import { salaryMidpoint } from "./format";
import type {
  Activity,
  Application,
  ApplicationStatus,
  Company,
  Contact,
  FollowUp,
  ID,
  Interview,
  Resume,
} from "./types";

/**
 * Job-search analytics.
 *
 * Two rules keep the numbers honest:
 *   1. An application counts toward a period by the day it was *applied*, not
 *      the day the row was created, importing history doesn't spike this week.
 *   2. Rates are only reported once the denominator is meaningful; below that
 *      the UI shows a dash rather than a confident-looking 100%.
 */

export const RANGES = {
  "7d": { label: "7 days", days: 7 },
  "30d": { label: "30 days", days: 30 },
  "90d": { label: "90 days", days: 90 },
  all: { label: "All time", days: Number.POSITIVE_INFINITY },
} as const;

export type RangeKey = keyof typeof RANGES;

/** Below this many applications a percentage is noise, not signal. */
const MIN_SAMPLE = 4;

export interface AnalyticsInput {
  applications: Application[];
  interviews: Interview[];
  activities: Activity[];
  companies: Company[];
  contacts: Contact[];
  followUps: FollowUp[];
  resumes: Resume[];
}

/** The day an application entered the funnel. */
export const applicationDate = (application: Application): Date =>
  toDate(application.appliedAt) ?? toDate(application.createdAt) ?? new Date();

export const hasResponded = (application: Application) =>
  RESPONDED_STATUSES.includes(application.status);

export const hasInterviewed = (application: Application) =>
  INTERVIEWING_STATUSES.includes(application.status);

export const hasOffer = (application: Application) =>
  application.status === "offer" || application.status === "accepted";

/** Explicitly ghosted, or applied over a month ago and never acknowledged. */
export const isGhosted = (application: Application) => {
  if (application.status === "ghosted") return true;
  if (application.status !== "applied") return false;
  const age = daysSince(application.appliedAt ?? application.createdAt);
  return age !== null && age > 30;
};

export function inRange(application: Application, range: RangeKey, now = new Date()): boolean {
  const config = RANGES[range];
  if (!Number.isFinite(config.days)) return true;
  const start = startOfDay(subDays(now, config.days - 1));
  return applicationDate(application).getTime() >= start.getTime();
}

function previousWindow(application: Application, range: RangeKey, now = new Date()): boolean {
  const config = RANGES[range];
  if (!Number.isFinite(config.days)) return false;
  const end = startOfDay(subDays(now, config.days));
  const start = startOfDay(subDays(now, config.days * 2 - 1));
  const time = applicationDate(application).getTime();
  return time >= start.getTime() && time <= end.getTime() + 86_399_999;
}

const rate = (numerator: number, denominator: number): number | null =>
  denominator < MIN_SAMPLE ? null : numerator / denominator;

const delta = (current: number, previous: number): number | null => {
  if (previous === 0) return current === 0 ? null : 1;
  return (current - previous) / previous;
};

/* -------------------------------------------------------------------------- */
/* Summary                                                                     */
/* -------------------------------------------------------------------------- */

export interface AnalyticsSummary {
  totalApplications: number;
  activeApplications: number;
  interviewCount: number;
  offerCount: number;
  responseRate: number | null;
  interviewRate: number | null;
  rejectionRate: number | null;
  ghostRate: number | null;
  offerRate: number | null;
  interviewToFinalRate: number | null;
  interviewToOfferRate: number | null;
  applicationsPerWeek: number;
  applicationsPerMonth: number;
  interviewsPerWeek: number;
  averageSalary: number | null;
  averageTimeToOfferDays: number | null;
  averageResponseDays: number | null;
  /** Change vs the previous window of the same length. */
  deltas: {
    totalApplications: number | null;
    activeApplications: number | null;
    interviewCount: number | null;
    offerCount: number | null;
    responseRate: number | null;
    interviewRate: number | null;
  };
}

export function computeSummary(
  input: AnalyticsInput,
  range: RangeKey = "30d",
  now = new Date(),
): AnalyticsSummary {
  const all = input.applications.filter((application) => !application.archived);
  const current = all.filter((application) => inRange(application, range, now));
  const previous = all.filter((application) => previousWindow(application, range, now));

  const submitted = current.filter((application) => STATUS_RANK[application.status] !== 0);
  const previousSubmitted = previous.filter((application) => STATUS_RANK[application.status] !== 0);

  const responded = current.filter(hasResponded);
  const previousResponded = previous.filter(hasResponded);
  const interviewed = current.filter(hasInterviewed);
  const previousInterviewed = previous.filter(hasInterviewed);
  const offers = current.filter(hasOffer);
  const rejected = current.filter((application) => application.status === "rejected");
  const ghosted = current.filter(isGhosted);
  const finals = current.filter(
    (application) => STATUS_RANK[application.status] >= STATUS_RANK.final_round,
  );

  const windowDays = Number.isFinite(RANGES[range].days)
    ? RANGES[range].days
    : Math.max(spanInDays(all, now), 7);

  const interviewsInWindow = input.interviews.filter((interview) => {
    const date = toDate(interview.scheduledAt);
    if (!date) return false;
    if (!Number.isFinite(RANGES[range].days)) return true;
    return date.getTime() >= startOfDay(subDays(now, RANGES[range].days - 1)).getTime();
  });

  const salaries = current
    .filter(hasOffer)
    .map((application) => salaryMidpoint(application.salary))
    .filter((value): value is number => value != null && value > 0);

  return {
    totalApplications: submitted.length,
    activeApplications: current.filter((application) => ACTIVE_STATUSES.includes(application.status))
      .length,
    interviewCount: interviewsInWindow.length,
    offerCount: offers.length,
    responseRate: rate(responded.length, submitted.length),
    interviewRate: rate(interviewed.length, submitted.length),
    rejectionRate: rate(rejected.length, submitted.length),
    ghostRate: rate(ghosted.length, submitted.length),
    offerRate: rate(offers.length, submitted.length),
    interviewToFinalRate: rate(finals.length, interviewed.length),
    interviewToOfferRate: rate(offers.length, interviewed.length),
    applicationsPerWeek: round1((submitted.length / windowDays) * 7),
    applicationsPerMonth: round1((submitted.length / windowDays) * 30),
    interviewsPerWeek: round1((interviewsInWindow.length / windowDays) * 7),
    averageSalary: salaries.length > 0 ? Math.round(mean(salaries)) : null,
    averageTimeToOfferDays: averageTimeToOffer(current, input.activities),
    averageResponseDays: averageResponseTime(current, input.activities),
    deltas: {
      totalApplications: delta(submitted.length, previousSubmitted.length),
      activeApplications: delta(
        current.filter((a) => ACTIVE_STATUSES.includes(a.status)).length,
        previous.filter((a) => ACTIVE_STATUSES.includes(a.status)).length,
      ),
      interviewCount: delta(interviewsInWindow.length, previousInterviewCount(input, range, now)),
      offerCount: delta(offers.length, previous.filter(hasOffer).length),
      responseRate: deltaRate(
        rate(responded.length, submitted.length),
        rate(previousResponded.length, previousSubmitted.length),
      ),
      interviewRate: deltaRate(
        rate(interviewed.length, submitted.length),
        rate(previousInterviewed.length, previousSubmitted.length),
      ),
    },
  };
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

const deltaRate = (current: number | null, previous: number | null): number | null => {
  if (current == null || previous == null || previous === 0) return null;
  return (current - previous) / previous;
};

function previousInterviewCount(input: AnalyticsInput, range: RangeKey, now: Date): number {
  const config = RANGES[range];
  if (!Number.isFinite(config.days)) return 0;
  const end = startOfDay(subDays(now, config.days));
  const start = startOfDay(subDays(now, config.days * 2 - 1));
  return input.interviews.filter((interview) => {
    const date = toDate(interview.scheduledAt);
    if (!date) return false;
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime() + 86_399_999;
  }).length;
}

function spanInDays(applications: Application[], now: Date): number {
  if (applications.length === 0) return 30;
  const earliest = applications.reduce(
    (min, application) => Math.min(min, applicationDate(application).getTime()),
    Number.POSITIVE_INFINITY,
  );
  return Math.max(differenceInCalendarDays(now, new Date(earliest)) + 1, 1);
}

/** Days between applying and the activity that recorded the offer. */
function averageTimeToOffer(applications: Application[], activities: Activity[]): number | null {
  const offerActivities = new Map<ID, string>();
  for (const activity of activities) {
    if (activity.type !== "offer_received") continue;
    const existing = offerActivities.get(activity.entityId);
    if (!existing || activity.occurredAt < existing) {
      offerActivities.set(activity.entityId, activity.occurredAt);
    }
  }

  const durations: number[] = [];
  for (const application of applications) {
    if (!hasOffer(application)) continue;
    const applied = toDate(application.appliedAt);
    const offered = toDate(offerActivities.get(application.id) ?? application.updatedAt);
    if (!applied || !offered) continue;
    const days = differenceInCalendarDays(offered, applied);
    if (days >= 0) durations.push(days);
  }
  return durations.length > 0 ? Math.round(mean(durations)) : null;
}

/** Days between applying and the first sign the company engaged. */
function averageResponseTime(applications: Application[], activities: Activity[]): number | null {
  const firstResponse = new Map<ID, string>();
  for (const activity of activities) {
    if (activity.type !== "status_changed") continue;
    const to = (activity.meta as { to?: ApplicationStatus }).to;
    if (!to || !RESPONDED_STATUSES.includes(to)) continue;
    const existing = firstResponse.get(activity.entityId);
    if (!existing || activity.occurredAt < existing) {
      firstResponse.set(activity.entityId, activity.occurredAt);
    }
  }

  const durations: number[] = [];
  for (const application of applications) {
    if (!hasResponded(application)) continue;
    const applied = toDate(application.appliedAt);
    const responded = toDate(firstResponse.get(application.id));
    if (!applied || !responded) continue;
    const days = differenceInCalendarDays(responded, applied);
    if (days >= 0) durations.push(days);
  }
  return durations.length > 0 ? Math.round(mean(durations)) : null;
}

/* -------------------------------------------------------------------------- */
/* Funnel & trends                                                             */
/* -------------------------------------------------------------------------- */

export interface FunnelPoint {
  status: ApplicationStatus;
  label: string;
  count: number;
}

/**
 * How far an application actually travelled.
 *
 * Current status alone isn't enough: a rejection after a final round still
 * passed through screening and interview, and `STATUS_RANK` scores every
 * terminal state at -1. The activity log holds the real path, so we take the
 * highest stage it ever recorded and fall back to the current status.
 */
export function furthestRankByApplication(activities: Activity[]): Map<ID, number> {
  const furthest = new Map<ID, number>();
  for (const activity of activities) {
    if (activity.type !== "status_changed" && activity.type !== "offer_received") continue;
    const to = (activity.meta as { to?: ApplicationStatus }).to;
    const rank = to ? STATUS_RANK[to] : activity.type === "offer_received" ? STATUS_RANK.offer : -1;
    if (rank < 0) continue;
    const current = furthest.get(activity.entityId) ?? -1;
    if (rank > current) furthest.set(activity.entityId, rank);
  }
  return furthest;
}

export function reachedRank(application: Application, furthest: Map<ID, number>): number {
  const fromHistory = furthest.get(application.id) ?? -1;
  const fromStatus = STATUS_RANK[application.status];
  // A closed application must at least have been submitted.
  const floor = fromStatus < 0 ? STATUS_RANK.applied : fromStatus;
  return Math.max(fromHistory, floor);
}

/**
 * Funnel counts are cumulative: an application that reached `offer` is counted
 * at every earlier stage too, because it passed through them.
 */
export function computeFunnel(
  applications: Application[],
  stages: ApplicationStatus[],
  activities: Activity[] = [],
): FunnelPoint[] {
  const live = applications.filter((application) => !application.archived);
  const furthest = furthestRankByApplication(activities);
  const ranks = live.map((application) =>
    // Wishlist items were never submitted, so they only count at the first stage.
    application.status === "wishlist" ? 0 : reachedRank(application, furthest),
  );
  return stages.map((status) => ({
    status,
    label: STATUS_CONFIG[status].label,
    count: ranks.filter((rank) => rank >= STATUS_RANK[status]).length,
  }));
}

/** Applications and interviews bucketed by day, for the trend chart. */
export function computeTrend(
  input: AnalyticsInput,
  range: RangeKey,
  now = new Date(),
): Array<{ label: string; value: number; secondary: number; date: string }> {
  const days = Number.isFinite(RANGES[range].days)
    ? RANGES[range].days
    : Math.min(spanInDays(input.applications, now), 180);

  const buckets = new Map<string, { value: number; secondary: number }>();
  for (let index = days - 1; index >= 0; index -= 1) {
    buckets.set(toDateOnly(subDays(now, index)), { value: 0, secondary: 0 });
  }

  for (const application of input.applications) {
    if (application.archived) continue;
    const key = toDateOnly(applicationDate(application));
    const bucket = buckets.get(key);
    if (bucket) bucket.value += 1;
  }

  for (const interview of input.interviews) {
    const date = toDate(interview.scheduledAt);
    if (!date) continue;
    const bucket = buckets.get(toDateOnly(date));
    if (bucket) bucket.secondary += 1;
  }

  return [...buckets.entries()].map(([date, counts]) => ({
    date,
    label: formatBucketLabel(date),
    ...counts,
  }));
}

const formatBucketLabel = (date: string) => {
  const parsed = toDate(date);
  if (!parsed) return date;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/** Weekly application counts, used by the goals page. */
export function applicationsInWeek(applications: Application[], weekStart: Date): number {
  const weekEnd = addDays(weekStart, 7);
  return applications.filter((application) => {
    if (application.archived || STATUS_RANK[application.status] === 0) return false;
    const date = applicationDate(application);
    return date >= weekStart && date < weekEnd;
  }).length;
}

/* -------------------------------------------------------------------------- */
/* Breakdowns                                                                  */
/* -------------------------------------------------------------------------- */

export type BreakdownDimension =
  | "source"
  | "resume"
  | "company"
  | "role"
  | "location"
  | "work_mode"
  | "status";

export interface BreakdownEntry {
  key: string;
  label: string;
  total: number;
  responded: number;
  interviewed: number;
  offers: number;
  responseRate: number | null;
  interviewRate: number | null;
}

export function computeBreakdown(
  input: AnalyticsInput,
  dimension: BreakdownDimension,
  range: RangeKey = "all",
  now = new Date(),
): BreakdownEntry[] {
  const applications = input.applications.filter(
    (application) => !application.archived && inRange(application, range, now),
  );
  const companyById = new Map(input.companies.map((company) => [company.id, company]));
  const resumeById = new Map(input.resumes.map((resume) => [resume.id, resume]));

  const keyOf = (application: Application): { key: string; label: string } | null => {
    switch (dimension) {
      case "source":
        return application.source
          ? { key: application.source, label: SOURCE_CONFIG[application.source].label }
          : { key: "unknown", label: "Not recorded" };
      case "resume": {
        const resume = application.resumeId ? resumeById.get(application.resumeId) : null;
        return resume
          ? { key: resume.id, label: `${resume.name} v${resume.version}` }
          : { key: "none", label: "No resume attached" };
      }
      case "company": {
        const company = companyById.get(application.companyId);
        return { key: application.companyId, label: company?.name ?? "Unknown" };
      }
      case "role":
        return { key: normalizeRole(application.position), label: normalizeRole(application.position) };
      case "location":
        return application.location
          ? { key: application.location, label: application.location }
          : { key: "unknown", label: "Not recorded" };
      case "work_mode":
        return application.workMode
          ? { key: application.workMode, label: WORK_MODE_CONFIG[application.workMode].label }
          : { key: "unknown", label: "Not recorded" };
      case "status":
        return { key: application.status, label: STATUS_CONFIG[application.status].label };
      default:
        return null;
    }
  };

  const groups = new Map<string, BreakdownEntry>();
  for (const application of applications) {
    const identity = keyOf(application);
    if (!identity) continue;
    const entry =
      groups.get(identity.key) ??
      ({
        key: identity.key,
        label: identity.label,
        total: 0,
        responded: 0,
        interviewed: 0,
        offers: 0,
        responseRate: null,
        interviewRate: null,
      } satisfies BreakdownEntry);
    entry.total += 1;
    if (hasResponded(application)) entry.responded += 1;
    if (hasInterviewed(application)) entry.interviewed += 1;
    if (hasOffer(application)) entry.offers += 1;
    groups.set(identity.key, entry);
  }

  return [...groups.values()]
    .map((entry) => ({
      ...entry,
      responseRate: rate(entry.responded, entry.total),
      interviewRate: rate(entry.interviewed, entry.total),
    }))
    .sort((a, b) => b.total - a.total);
}

/** "Senior Backend Engineer II" and "Backend Engineer" collapse to one bucket. */
function normalizeRole(position: string): string {
  const cleaned = position
    .toLowerCase()
    .replace(/\b(senior|staff|principal|lead|junior|entry|mid|sr\.?|jr\.?|i{1,3}|iv|[0-9]+)\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cleaned) return position;
  return cleaned.replace(/\b\w/g, (character) => character.toUpperCase());
}

/* -------------------------------------------------------------------------- */
/* Insights                                                                    */
/* -------------------------------------------------------------------------- */

export interface Insight {
  id: string;
  text: string;
  tone: "good" | "warning" | "neutral";
  href?: string;
}

/**
 * Observations worth acting on. Each one needs a real sample behind it, the
 * whole point is that the user can trust these enough to change behaviour.
 */
export function computeInsights(input: AnalyticsInput, now = new Date()): Insight[] {
  const insights: Insight[] = [];
  const applications = input.applications.filter(
    (application) => !application.archived && STATUS_RANK[application.status] !== 0,
  );
  if (applications.length === 0) return insights;

  const summary = computeSummary(input, "all", now);

  // Which source converts best?
  const bySource = computeBreakdown(input, "source", "all", now).filter(
    (entry) => entry.total >= MIN_SAMPLE && entry.key !== "unknown",
  );
  const bestSource = [...bySource].sort(
    (a, b) => (b.interviewRate ?? 0) - (a.interviewRate ?? 0),
  )[0];
  if (bestSource?.interviewRate != null && bestSource.interviewRate > 0) {
    insights.push({
      id: "best-source",
      tone: "good",
      text: `Your interview rate is highest for ${bestSource.label.toLowerCase()} applications: ${Math.round(bestSource.interviewRate * 100)}% across ${bestSource.total}.`,
      href: "/app/analytics",
    });
  }

  // Which resume earns replies?
  const byResume = computeBreakdown(input, "resume", "all", now).filter(
    (entry) => entry.total >= MIN_SAMPLE && entry.key !== "none",
  );
  const bestResume = [...byResume].sort((a, b) => (b.responseRate ?? 0) - (a.responseRate ?? 0))[0];
  if (bestResume?.responseRate != null && byResume.length > 1) {
    insights.push({
      id: "best-resume",
      tone: "good",
      text: `${bestResume.label} has the highest response rate at ${Math.round(bestResume.responseRate * 100)}%.`,
      href: "/app/resumes",
    });
  }

  // Which kind of role responds?
  const byRole = computeBreakdown(input, "role", "all", now).filter(
    (entry) => entry.total >= MIN_SAMPLE,
  );
  const bestRole = [...byRole].sort((a, b) => (b.responseRate ?? 0) - (a.responseRate ?? 0))[0];
  if (bestRole?.responseRate != null && byRole.length > 1) {
    insights.push({
      id: "best-role",
      tone: "neutral",
      text: `${bestRole.label} applications respond at ${Math.round(bestRole.responseRate * 100)}%, across ${bestRole.total} applications.`,
      href: "/app/analytics",
    });
  }

  // Applications sitting without any follow-up.
  const followUpApplicationIds = new Set(
    input.followUps.map((followUp) => followUp.applicationId).filter(Boolean),
  );
  const unfollowed = applications.filter(
    (application) =>
      application.status === "applied" &&
      !followUpApplicationIds.has(application.id) &&
      (daysSince(application.appliedAt) ?? 0) >= 7,
  );
  if (unfollowed.length > 0) {
    insights.push({
      id: "unfollowed",
      tone: "warning",
      text: `${unfollowed.length} application${unfollowed.length === 1 ? " hasn't" : "s haven't"} been followed up after a week.`,
      href: "/app/follow-ups",
    });
  }

  // Momentum.
  const lastApplied = applications
    .map((application) => applicationDate(application).getTime())
    .sort((a, b) => b - a)[0];
  const idleDays = lastApplied ? differenceInCalendarDays(now, new Date(lastApplied)) : null;
  if (idleDays !== null && idleDays >= 3) {
    insights.push({
      id: "momentum",
      tone: "warning",
      text: `You haven't applied to anything new in ${idleDays} days.`,
      href: "/app/jobs",
    });
  }

  if (summary.averageResponseDays != null) {
    insights.push({
      id: "response-time",
      tone: "neutral",
      text: `Companies take about ${summary.averageResponseDays} days to come back to you.`,
    });
  }

  if (summary.ghostRate != null && summary.ghostRate > 0.4) {
    insights.push({
      id: "ghost-rate",
      tone: "warning",
      text: `${Math.round(summary.ghostRate * 100)}% of your applications go quiet, so referrals are worth prioritising.`,
      href: "/app/contacts",
    });
  }

  if (summary.interviewToOfferRate != null && summary.interviewToOfferRate > 0) {
    insights.push({
      id: "interview-conversion",
      tone: summary.interviewToOfferRate >= 0.25 ? "good" : "neutral",
      text: `${Math.round(summary.interviewToOfferRate * 100)}% of the loops you enter end in an offer.`,
      href: "/app/interviews",
    });
  }

  const referralApplications = applications.filter((application) => application.referral);
  if (referralApplications.length >= MIN_SAMPLE) {
    const referralRate = referralApplications.filter(hasInterviewed).length / referralApplications.length;
    const coldApplications = applications.filter((application) => !application.referral);
    const coldRate =
      coldApplications.length >= MIN_SAMPLE
        ? coldApplications.filter(hasInterviewed).length / coldApplications.length
        : null;
    if (coldRate != null && referralRate > coldRate) {
      insights.push({
        id: "referrals",
        tone: "good",
        text: `Referrals interview at ${Math.round(referralRate * 100)}% versus ${Math.round(coldRate * 100)}% for cold applications.`,
        href: "/app/contacts",
      });
    }
  }

  return insights;
}
