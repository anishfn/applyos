import { PRIORITY_RANK, STATUS_RANK } from "./constants";
import { toDate } from "./date";
import { salaryMidpoint } from "./format";
import type { ApplicationView } from "./derive";
import type { ApplicationStatus, Priority, Source, WorkMode } from "./types";

/** Filter + sort state shared by the table, list and board views. */
export interface ApplicationFilters {
  query: string;
  statuses: ApplicationStatus[];
  priorities: Priority[];
  sources: Source[];
  workModes: WorkMode[];
  tags: string[];
  companyIds: string[];
  resumeIds: string[];
  /** `active` hides closed applications; `all` shows everything. */
  scope: "active" | "all" | "closed" | "archived";
  onlyReferrals: boolean;
  onlyNeedsAction: boolean;
}

export const emptyFilters = (): ApplicationFilters => ({
  query: "",
  statuses: [],
  priorities: [],
  sources: [],
  workModes: [],
  tags: [],
  companyIds: [],
  resumeIds: [],
  scope: "active",
  onlyReferrals: false,
  onlyNeedsAction: false,
});

export const countActiveFilters = (filters: ApplicationFilters): number =>
  filters.statuses.length +
  filters.priorities.length +
  filters.sources.length +
  filters.workModes.length +
  filters.tags.length +
  filters.companyIds.length +
  filters.resumeIds.length +
  (filters.onlyReferrals ? 1 : 0) +
  (filters.onlyNeedsAction ? 1 : 0);

const CLOSED: ApplicationStatus[] = ["accepted", "rejected", "withdrawn", "ghosted"];

export function applyFilters(
  applications: ApplicationView[],
  filters: ApplicationFilters,
): ApplicationView[] {
  const query = filters.query.trim().toLowerCase();

  return applications.filter((application) => {
    if (filters.scope === "archived") {
      if (!application.archived) return false;
    } else if (application.archived) {
      return false;
    }

    if (filters.scope === "active" && CLOSED.includes(application.status)) return false;
    if (filters.scope === "closed" && !CLOSED.includes(application.status)) return false;

    if (filters.statuses.length > 0 && !filters.statuses.includes(application.status)) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(application.priority)) return false;
    if (
      filters.sources.length > 0 &&
      (!application.source || !filters.sources.includes(application.source))
    ) {
      return false;
    }
    if (
      filters.workModes.length > 0 &&
      (!application.workMode || !filters.workModes.includes(application.workMode))
    ) {
      return false;
    }
    if (filters.companyIds.length > 0 && !filters.companyIds.includes(application.companyId)) {
      return false;
    }
    if (
      filters.resumeIds.length > 0 &&
      (!application.resumeId || !filters.resumeIds.includes(application.resumeId))
    ) {
      return false;
    }
    if (filters.tags.length > 0 && !filters.tags.some((tag) => application.tags.includes(tag))) {
      return false;
    }
    if (filters.onlyReferrals && !application.referral) return false;
    if (filters.onlyNeedsAction && !application.nextAction) return false;

    if (query.length > 0) {
      const haystack = [
        application.position,
        application.companyName,
        application.location,
        application.nextAction,
        application.notes,
        application.tags.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export type SortKey =
  | "updated"
  | "created"
  | "company"
  | "position"
  | "status"
  | "priority"
  | "salary"
  | "applied"
  | "next_action"
  | "deadline";

export interface SortState {
  key: SortKey;
  direction: "asc" | "desc";
}

const nullsLast = (value: number | null, direction: "asc" | "desc") =>
  value ?? (direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);

export function sortApplications(
  applications: ApplicationView[],
  sort: SortState,
): ApplicationView[] {
  const factor = sort.direction === "asc" ? 1 : -1;
  const time = (value: string | null | undefined) => toDate(value)?.getTime() ?? null;

  return [...applications].sort((a, b) => {
    switch (sort.key) {
      case "company":
        return factor * a.companyName.localeCompare(b.companyName);
      case "position":
        return factor * a.position.localeCompare(b.position);
      case "status":
        return factor * (STATUS_RANK[a.status] - STATUS_RANK[b.status]);
      case "priority":
        return factor * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
      case "salary":
        return (
          factor *
          (nullsLast(salaryMidpoint(a.salary), sort.direction) -
            nullsLast(salaryMidpoint(b.salary), sort.direction))
        );
      case "applied":
        return factor * (nullsLast(time(a.appliedAt), sort.direction) - nullsLast(time(b.appliedAt), sort.direction));
      case "deadline":
        return factor * (nullsLast(time(a.deadline), sort.direction) - nullsLast(time(b.deadline), sort.direction));
      case "next_action":
        return (
          factor *
          (nullsLast(time(a.nextActionDate), sort.direction) -
            nullsLast(time(b.nextActionDate), sort.direction))
        );
      case "created":
        return factor * ((time(a.createdAt) ?? 0) - (time(b.createdAt) ?? 0));
      case "updated":
      default:
        return factor * ((time(a.updatedAt) ?? 0) - (time(b.updatedAt) ?? 0));
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Columns                                                                     */
/* -------------------------------------------------------------------------- */

export const APPLICATION_COLUMNS = [
  { key: "company", label: "Company", sortKey: "company" as SortKey, always: true },
  { key: "position", label: "Role", sortKey: "position" as SortKey, always: true },
  { key: "status", label: "Status", sortKey: "status" as SortKey },
  { key: "priority", label: "Priority", sortKey: "priority" as SortKey },
  { key: "salary", label: "Salary", sortKey: "salary" as SortKey },
  { key: "location", label: "Location" },
  { key: "source", label: "Source" },
  { key: "resume", label: "Resume" },
  { key: "applied", label: "Applied", sortKey: "applied" as SortKey },
  { key: "nextAction", label: "Next action", sortKey: "next_action" as SortKey },
  { key: "deadline", label: "Deadline", sortKey: "deadline" as SortKey },
  { key: "updated", label: "Updated", sortKey: "updated" as SortKey },
] as const;

export type ColumnKey = (typeof APPLICATION_COLUMNS)[number]["key"];

export const DEFAULT_COLUMNS: ColumnKey[] = [
  "company",
  "position",
  "status",
  "priority",
  "salary",
  "applied",
  "nextAction",
  "updated",
];
