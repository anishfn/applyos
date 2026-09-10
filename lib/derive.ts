import {
  ACTIVE_STATUSES,
  CLOSED_STATUSES,
  INTERVIEWING_STATUSES,
  STATUS_CONFIG,
} from "./constants";
import { daysFromToday, daysSince, isPastDate, isToday, isTomorrow, toDate } from "./date";
import type {
  Application,
  Company,
  Contact,
  Database,
  FollowUp,
  ID,
  Interview,
  Priority,
  Profile,
  Task,
} from "./types";

/* -------------------------------------------------------------------------- */
/* View models                                                                 */
/* -------------------------------------------------------------------------- */

export interface ApplicationView extends Application {
  company: Company | null;
  companyName: string;
}

export const indexById = <T extends { id: ID }>(rows: T[]): Map<ID, T> =>
  new Map(rows.map((row) => [row.id, row]));

export function toApplicationViews(
  applications: Application[],
  companies: Company[],
): ApplicationView[] {
  const byId = indexById(companies);
  return applications.map((application) => {
    const company = byId.get(application.companyId) ?? null;
    return { ...application, company, companyName: company?.name ?? "Unknown company" };
  });
}

export const isActive = (application: Application) =>
  !application.archived && ACTIVE_STATUSES.includes(application.status);

export const isClosed = (application: Application) => CLOSED_STATUSES.includes(application.status);

/* -------------------------------------------------------------------------- */
/* Needs attention                                                             */
/* -------------------------------------------------------------------------- */

export type AttentionKind =
  | "interview_today"
  | "interview_tomorrow"
  | "follow_up_overdue"
  | "follow_up_due"
  | "next_action_due"
  | "task_overdue"
  | "deadline_approaching"
  | "offer_deadline"
  | "recruiter_waiting"
  | "stale_application";

export type AttentionSeverity = "critical" | "warning" | "info";

export interface QuickAction {
  label: string;
  kind:
    | "complete_task"
    | "mark_follow_up_sent"
    | "complete_next_action"
    | "open"
    | "snooze_follow_up"
    | "log_interview"
    | "create_follow_up";
  entityId: ID;
}

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: AttentionSeverity;
  title: string;
  subtitle: string;
  /** Sortable urgency: lower is more urgent. */
  rank: number;
  date: string | null;
  href: string;
  primaryAction?: QuickAction;
  secondaryAction?: QuickAction;
}

const SEVERITY_WEIGHT: Record<AttentionSeverity, number> = {
  critical: 0,
  warning: 1_000,
  info: 2_000,
};

interface AttentionContext {
  applications: Application[];
  companies: Company[];
  interviews: Interview[];
  tasks: Task[];
  followUps: FollowUp[];
  contacts: Contact[];
  profile: Profile;
}

/**
 * The single most important computation in the app: everything that is late,
 * imminent, or drifting, ranked so the top of the list is genuinely the next
 * thing to do.
 */
export function buildAttentionItems(context: AttentionContext): AttentionItem[] {
  const { applications, companies, interviews, tasks, followUps, contacts, profile } = context;
  const companyById = indexById(companies);
  const applicationById = indexById(applications);
  const contactById = indexById(contacts);
  const items: AttentionItem[] = [];

  const companyOf = (id: ID) => companyById.get(id)?.name ?? "Unknown company";

  // Interviews happening today or tomorrow.
  for (const interview of interviews) {
    if (interview.status !== "scheduled" && interview.status !== "rescheduled") continue;
    const when = toDate(interview.scheduledAt);
    if (!when) continue;
    const today = isToday(interview.scheduledAt);
    const tomorrow = isTomorrow(interview.scheduledAt);
    if (!today && !tomorrow) continue;
    items.push({
      id: `interview-${interview.id}`,
      kind: today ? "interview_today" : "interview_tomorrow",
      severity: today ? "critical" : "warning",
      title: `${today ? "Interview today" : "Interview tomorrow"} · ${companyOf(interview.companyId)}`,
      subtitle: `${interview.position} · round ${interview.round}`,
      rank: SEVERITY_WEIGHT[today ? "critical" : "warning"] + when.getHours(),
      date: interview.scheduledAt,
      href: `/app/interviews/${interview.id}`,
      primaryAction: { label: "Prep", kind: "open", entityId: interview.id },
    });
  }

  // Follow-ups that are late or due today.
  for (const followUp of followUps) {
    if (followUp.status !== "pending") continue;
    const overdueBy = daysFromToday(followUp.dueDate);
    if (overdueBy === null || overdueBy > 0) continue;
    const application = followUp.applicationId ? applicationById.get(followUp.applicationId) : null;
    const contact = followUp.contactId ? contactById.get(followUp.contactId) : null;
    const late = overdueBy < 0;
    items.push({
      id: `followup-${followUp.id}`,
      kind: late ? "follow_up_overdue" : "follow_up_due",
      severity: late ? "critical" : "warning",
      title: late ? `Follow-up ${Math.abs(overdueBy)}d overdue` : "Follow-up due today",
      subtitle: [contact?.name, application ? `${application.position} · ${companyOf(application.companyId)}` : null]
        .filter(Boolean)
        .join(" · ") || "No linked application",
      rank: SEVERITY_WEIGHT[late ? "critical" : "warning"] + overdueBy,
      date: followUp.dueDate,
      href: followUp.applicationId ? `/app/applications/${followUp.applicationId}` : "/app/follow-ups",
      primaryAction: { label: "Mark sent", kind: "mark_follow_up_sent", entityId: followUp.id },
      secondaryAction: { label: "Snooze", kind: "snooze_follow_up", entityId: followUp.id },
    });
  }

  // Overdue tasks.
  for (const task of tasks) {
    if (task.status === "completed" || !task.dueDate) continue;
    const days = daysFromToday(task.dueDate);
    if (days === null || days > 0) continue;
    const late = days < 0;
    items.push({
      id: `task-${task.id}`,
      kind: "task_overdue",
      severity: late ? "critical" : "warning",
      title: task.title,
      subtitle: late ? `Task ${Math.abs(days)}d overdue` : "Task due today",
      rank: SEVERITY_WEIGHT[late ? "critical" : "warning"] + days + priorityBoost(task.priority),
      date: task.dueDate,
      href: "/app/tasks",
      primaryAction: { label: "Complete", kind: "complete_task", entityId: task.id },
    });
  }

  for (const application of applications) {
    if (application.archived) continue;

    // A next action that has come due.
    if (application.nextAction && application.nextActionDate) {
      const days = daysFromToday(application.nextActionDate);
      if (days !== null && days <= 0) {
        items.push({
          id: `next-${application.id}`,
          kind: "next_action_due",
          severity: days < 0 ? "critical" : "warning",
          title: application.nextAction,
          subtitle: `${application.position} · ${companyOf(application.companyId)}`,
          rank: SEVERITY_WEIGHT[days < 0 ? "critical" : "warning"] + days,
          date: application.nextActionDate,
          href: `/app/applications/${application.id}`,
          primaryAction: { label: "Complete", kind: "complete_next_action", entityId: application.id },
        });
      }
    }

    // Application deadlines inside a week.
    if (application.deadline && !isClosed(application)) {
      const days = daysFromToday(application.deadline);
      if (days !== null && days <= 7) {
        const isOffer = application.status === "offer";
        items.push({
          id: `deadline-${application.id}`,
          kind: isOffer ? "offer_deadline" : "deadline_approaching",
          severity: days <= 1 ? "critical" : "warning",
          title: isOffer
            ? `Offer decision in ${Math.max(days, 0)}d`
            : days < 0
              ? "Deadline passed"
              : `Closes in ${days}d`,
          subtitle: `${application.position} · ${companyOf(application.companyId)}`,
          rank: SEVERITY_WEIGHT[days <= 1 ? "critical" : "warning"] + days,
          date: application.deadline,
          href: `/app/applications/${application.id}`,
          primaryAction: { label: "Open", kind: "open", entityId: application.id },
        });
      }
    }

    // A recruiter reached out and nothing has happened since.
    if (application.status === "recruiter_contacted") {
      const waiting = daysSince(application.updatedAt) ?? 0;
      if (waiting >= 2) {
        items.push({
          id: `recruiter-${application.id}`,
          kind: "recruiter_waiting",
          severity: waiting >= 5 ? "critical" : "warning",
          title: `Recruiter waiting ${waiting}d`,
          subtitle: `${application.position} · ${companyOf(application.companyId)}`,
          rank: SEVERITY_WEIGHT[waiting >= 5 ? "critical" : "warning"] - waiting,
          date: application.updatedAt,
          href: `/app/applications/${application.id}`,
          primaryAction: { label: "Schedule follow-up", kind: "create_follow_up", entityId: application.id },
        });
      }
    }

    // Applied a while ago, nothing has moved.
    if (
      profile.notifications.inactiveApplication &&
      isActive(application) &&
      application.status === "applied"
    ) {
      const idle = daysSince(application.updatedAt);
      if (idle !== null && idle >= profile.notifications.inactiveAfterDays) {
        items.push({
          id: `stale-${application.id}`,
          kind: "stale_application",
          severity: "info",
          title: `Quiet for ${idle} days`,
          subtitle: `${application.position} · ${companyOf(application.companyId)}`,
          rank: SEVERITY_WEIGHT.info - idle,
          date: application.updatedAt,
          href: `/app/applications/${application.id}`,
          primaryAction: { label: "Follow up", kind: "create_follow_up", entityId: application.id },
        });
      }
    }
  }

  // Interviews that happened but were never logged.
  for (const interview of interviews) {
    if (interview.status !== "scheduled" && interview.status !== "rescheduled") continue;
    const days = daysFromToday(interview.scheduledAt);
    if (days === null || days >= 0) continue;
    items.push({
      id: `log-${interview.id}`,
      kind: "task_overdue",
      severity: "warning",
      title: "Log interview outcome",
      subtitle: `${companyOf(interview.companyId)} · round ${interview.round}`,
      rank: SEVERITY_WEIGHT.warning + days,
      date: interview.scheduledAt,
      href: `/app/interviews/${interview.id}`,
      primaryAction: { label: "Log", kind: "log_interview", entityId: interview.id },
    });
  }

  return items.sort((a, b) => a.rank - b.rank);
}

const priorityBoost = (priority: Priority) =>
  ({ urgent: -3, high: -2, medium: 0, low: 1 })[priority];

/* -------------------------------------------------------------------------- */
/* Upcoming                                                                    */
/* -------------------------------------------------------------------------- */

export type UpcomingKind = "interview" | "deadline" | "follow_up" | "task";

export interface UpcomingItem {
  id: string;
  kind: UpcomingKind;
  title: string;
  subtitle: string;
  at: string;
  href: string;
  allDay: boolean;
}

export function buildUpcoming(context: AttentionContext, days = 14): UpcomingItem[] {
  const { applications, companies, interviews, tasks, followUps } = context;
  const companyById = indexById(companies);
  const applicationById = indexById(applications);
  const items: UpcomingItem[] = [];
  const within = (value: string | null | undefined) => {
    const delta = daysFromToday(value);
    return delta !== null && delta >= 0 && delta <= days;
  };
  const companyOf = (id: ID) => companyById.get(id)?.name ?? "Unknown company";

  for (const interview of interviews) {
    if (interview.status === "cancelled" || !within(interview.scheduledAt)) continue;
    if (interview.status === "completed" || interview.status === "passed" || interview.status === "failed") continue;
    items.push({
      id: `interview-${interview.id}`,
      kind: "interview",
      title: `${companyOf(interview.companyId)} · round ${interview.round}`,
      subtitle: interview.position,
      at: interview.scheduledAt,
      href: `/app/interviews/${interview.id}`,
      allDay: false,
    });
  }

  for (const application of applications) {
    if (application.deadline && within(application.deadline) && !isClosed(application)) {
      items.push({
        id: `deadline-${application.id}`,
        kind: "deadline",
        title: `${application.position} closes`,
        subtitle: companyOf(application.companyId),
        at: application.deadline,
        href: `/app/applications/${application.id}`,
        allDay: true,
      });
    }
  }

  for (const followUp of followUps) {
    if (followUp.status !== "pending" || !within(followUp.dueDate)) continue;
    const application = followUp.applicationId ? applicationById.get(followUp.applicationId) : null;
    items.push({
      id: `followup-${followUp.id}`,
      kind: "follow_up",
      title: "Follow-up due",
      subtitle: application ? `${application.position} · ${companyOf(application.companyId)}` : "No linked application",
      at: followUp.dueDate,
      href: application ? `/app/applications/${application.id}` : "/app/follow-ups",
      allDay: true,
    });
  }

  for (const task of tasks) {
    if (task.status === "completed" || !task.dueDate || !within(task.dueDate)) continue;
    items.push({
      id: `task-${task.id}`,
      kind: "task",
      title: task.title,
      subtitle: task.description ?? "Task",
      at: task.dueDate,
      href: "/app/tasks",
      allDay: true,
    });
  }

  return items.sort((a, b) => {
    const left = toDate(a.at)?.getTime() ?? 0;
    const right = toDate(b.at)?.getTime() ?? 0;
    return left - right;
  });
}

/* -------------------------------------------------------------------------- */
/* Sidebar counts                                                              */
/* -------------------------------------------------------------------------- */

export interface NavCounts {
  today: number;
  applications: number;
  interviews: number;
  tasks: number;
  followUps: number;
  jobs: number;
}

export function buildNavCounts(db: Pick<Database, "applications" | "interviews" | "tasks" | "followUps" | "jobs">): NavCounts {
  const overdueTasks = db.tasks.filter(
    (task) => task.status !== "completed" && task.dueDate && daysFromToday(task.dueDate)! <= 0,
  ).length;
  const dueFollowUps = db.followUps.filter(
    (followUp) => followUp.status === "pending" && daysFromToday(followUp.dueDate)! <= 0,
  ).length;
  const upcomingInterviews = db.interviews.filter((interview) => {
    if (interview.status !== "scheduled" && interview.status !== "rescheduled") return false;
    const days = daysFromToday(interview.scheduledAt);
    return days !== null && days >= 0 && days <= 7;
  }).length;
  const todayItems = db.interviews.filter((i) => isToday(i.scheduledAt) && i.status === "scheduled").length +
    db.tasks.filter((t) => t.status !== "completed" && (isToday(t.dueDate) || isPastDate(t.dueDate))).length +
    db.followUps.filter((f) => f.status === "pending" && (isToday(f.dueDate) || isPastDate(f.dueDate))).length;

  return {
    today: todayItems,
    applications: db.applications.filter(isActive).length,
    interviews: upcomingInterviews,
    tasks: overdueTasks,
    followUps: dueFollowUps,
    jobs: db.jobs.filter((job) => job.status === "saved").length,
  };
}

/* -------------------------------------------------------------------------- */
/* Related-entity lookups                                                      */
/* -------------------------------------------------------------------------- */

export const interviewsForApplication = (interviews: Interview[], applicationId: ID) =>
  interviews
    .filter((interview) => interview.applicationId === applicationId)
    .sort((a, b) => (a.scheduledAt < b.scheduledAt ? 1 : -1));

export const tasksForEntity = (tasks: Task[], type: string, id: ID) =>
  tasks.filter((task) => task.relatedType === type && task.relatedId === id);

export const followUpsForApplication = (followUps: FollowUp[], applicationId: ID) =>
  followUps
    .filter((followUp) => followUp.applicationId === applicationId)
    .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));

export const nextInterview = (interviews: Interview[], applicationId?: ID): Interview | null => {
  const upcoming = interviews
    .filter((interview) => (applicationId ? interview.applicationId === applicationId : true))
    .filter((interview) => interview.status === "scheduled" || interview.status === "rescheduled")
    .filter((interview) => (daysFromToday(interview.scheduledAt) ?? -1) >= 0)
    .sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1));
  return upcoming[0] ?? null;
};

export const isInterviewing = (application: Application) =>
  INTERVIEWING_STATUSES.includes(application.status);

export const statusLabel = (application: Application) => STATUS_CONFIG[application.status].label;
