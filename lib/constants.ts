import type {
  ActivityType,
  ApplicationStatus,
  CompanySize,
  Competency,
  DocumentType,
  EmploymentType,
  EventType,
  FollowUpStatus,
  FollowUpType,
  GoalPeriod,
  GoalType,
  InterviewStatus,
  InterviewType,
  Priority,
  Relationship,
  ResumeVariant,
  Source,
  TaskStatus,
  Tone,
  WorkMode,
} from "./types";

export interface OptionConfig<T extends string> {
  value: T;
  label: string;
  tone: Tone;
  description?: string;
}

const opt = <T extends string>(value: T, label: string, tone: Tone, description?: string) =>
  ({ value, label, tone, description }) as OptionConfig<T>;

/* -------------------------------------------------------------------------- */
/* Application status                                                          */
/* -------------------------------------------------------------------------- */

/** Ordered exactly as the funnel reads: wishlist → accepted, then terminal states. */
export const STATUS_CONFIG: Record<ApplicationStatus, OptionConfig<ApplicationStatus>> = {
  wishlist: opt("wishlist", "Wishlist", "neutral", "Saved, not started"),
  preparing: opt("preparing", "Preparing", "neutral", "Tailoring resume, writing cover letter"),
  applied: opt("applied", "Applied", "blue", "Submitted, waiting"),
  viewed: opt("viewed", "Viewed", "blue", "They opened it"),
  recruiter_contacted: opt("recruiter_contacted", "Recruiter", "cyan", "Recruiter reached out"),
  screening: opt("screening", "Screening", "cyan", "Phone or recruiter screen"),
  assessment: opt("assessment", "Assessment", "violet", "Take-home or online test"),
  interview: opt("interview", "Interview", "violet", "In the loop"),
  final_round: opt("final_round", "Final round", "teal", "Last stage"),
  offer: opt("offer", "Offer", "primary", "Offer on the table"),
  accepted: opt("accepted", "Accepted", "green", "Signed"),
  rejected: opt("rejected", "Rejected", "rose", "Closed by them"),
  withdrawn: opt("withdrawn", "Withdrawn", "neutral", "Closed by you"),
  ghosted: opt("ghosted", "Ghosted", "amber", "No reply, gone quiet"),
};

/** The stages that make up the pipeline board, in order. */
export const PIPELINE_STATUSES: ApplicationStatus[] = [
  "wishlist",
  "preparing",
  "applied",
  "screening",
  "assessment",
  "interview",
  "final_round",
  "offer",
];

/** The conversion funnel shown on the dashboard. */
export const FUNNEL_STATUSES: ApplicationStatus[] = [
  "wishlist",
  "preparing",
  "applied",
  "screening",
  "interview",
  "final_round",
  "offer",
  "accepted",
];

/** Statuses that mean the application is still alive. */
export const ACTIVE_STATUSES: ApplicationStatus[] = [
  "preparing",
  "applied",
  "viewed",
  "recruiter_contacted",
  "screening",
  "assessment",
  "interview",
  "final_round",
  "offer",
];

/** Statuses that mean the company engaged with you. */
export const RESPONDED_STATUSES: ApplicationStatus[] = [
  "viewed",
  "recruiter_contacted",
  "screening",
  "assessment",
  "interview",
  "final_round",
  "offer",
  "accepted",
  "rejected",
];

export const INTERVIEWING_STATUSES: ApplicationStatus[] = [
  "screening",
  "assessment",
  "interview",
  "final_round",
  "offer",
  "accepted",
];

export const CLOSED_STATUSES: ApplicationStatus[] = [
  "accepted",
  "rejected",
  "withdrawn",
  "ghosted",
];

/** Rank used for "did this application move forward?" comparisons. */
export const STATUS_RANK: Record<ApplicationStatus, number> = {
  wishlist: 0,
  preparing: 1,
  applied: 2,
  viewed: 3,
  recruiter_contacted: 4,
  screening: 5,
  assessment: 6,
  interview: 7,
  final_round: 8,
  offer: 9,
  accepted: 10,
  rejected: -1,
  withdrawn: -1,
  ghosted: -1,
};

/* -------------------------------------------------------------------------- */
/* Everything else                                                             */
/* -------------------------------------------------------------------------- */

export const PRIORITY_CONFIG: Record<Priority, OptionConfig<Priority>> = {
  low: opt("low", "Low", "neutral"),
  medium: opt("medium", "Medium", "blue"),
  high: opt("high", "High", "orange"),
  urgent: opt("urgent", "Urgent", "rose"),
};

export const PRIORITY_RANK: Record<Priority, number> = { low: 0, medium: 1, high: 2, urgent: 3 };

export const WORK_MODE_CONFIG: Record<WorkMode, OptionConfig<WorkMode>> = {
  onsite: opt("onsite", "On-site", "neutral"),
  hybrid: opt("hybrid", "Hybrid", "cyan"),
  remote: opt("remote", "Remote", "teal"),
};

export const EMPLOYMENT_TYPE_CONFIG: Record<EmploymentType, OptionConfig<EmploymentType>> = {
  full_time: opt("full_time", "Full-time", "neutral"),
  part_time: opt("part_time", "Part-time", "neutral"),
  contract: opt("contract", "Contract", "violet"),
  internship: opt("internship", "Internship", "cyan"),
  temporary: opt("temporary", "Temporary", "neutral"),
  freelance: opt("freelance", "Freelance", "violet"),
};

export const SOURCE_CONFIG: Record<Source, OptionConfig<Source>> = {
  linkedin: opt("linkedin", "LinkedIn", "blue"),
  indeed: opt("indeed", "Indeed", "blue"),
  company_site: opt("company_site", "Company site", "neutral"),
  referral: opt("referral", "Referral", "primary"),
  recruiter: opt("recruiter", "Recruiter", "cyan"),
  job_board: opt("job_board", "Job board", "neutral"),
  wellfound: opt("wellfound", "Wellfound", "violet"),
  glassdoor: opt("glassdoor", "Glassdoor", "teal"),
  hacker_news: opt("hacker_news", "Hacker News", "orange"),
  network: opt("network", "Network", "green"),
  other: opt("other", "Other", "neutral"),
};

export const INTERVIEW_TYPE_CONFIG: Record<InterviewType, OptionConfig<InterviewType>> = {
  recruiter_screen: opt("recruiter_screen", "Recruiter screen", "cyan"),
  phone: opt("phone", "Phone", "blue"),
  video: opt("video", "Video", "blue"),
  technical: opt("technical", "Technical", "violet"),
  behavioral: opt("behavioral", "Behavioral", "teal"),
  system_design: opt("system_design", "System design", "violet"),
  manager: opt("manager", "Manager", "amber"),
  final: opt("final", "Final", "primary"),
};

export const INTERVIEW_STATUS_CONFIG: Record<InterviewStatus, OptionConfig<InterviewStatus>> = {
  scheduled: opt("scheduled", "Scheduled", "blue"),
  completed: opt("completed", "Completed", "neutral"),
  rescheduled: opt("rescheduled", "Rescheduled", "amber"),
  cancelled: opt("cancelled", "Cancelled", "neutral"),
  passed: opt("passed", "Passed", "green"),
  failed: opt("failed", "Failed", "rose"),
};

export const TASK_STATUS_CONFIG: Record<TaskStatus, OptionConfig<TaskStatus>> = {
  todo: opt("todo", "To do", "neutral"),
  in_progress: opt("in_progress", "In progress", "blue"),
  completed: opt("completed", "Completed", "green"),
};

export const FOLLOW_UP_TYPE_CONFIG: Record<FollowUpType, OptionConfig<FollowUpType>> = {
  recruiter: opt("recruiter", "Recruiter follow-up", "cyan"),
  thank_you: opt("thank_you", "Interview thank-you", "primary"),
  referral: opt("referral", "Referral follow-up", "violet"),
  application: opt("application", "Application follow-up", "blue"),
  networking: opt("networking", "Networking", "teal"),
};

export const FOLLOW_UP_STATUS_CONFIG: Record<FollowUpStatus, OptionConfig<FollowUpStatus>> = {
  pending: opt("pending", "Pending", "amber"),
  sent: opt("sent", "Sent", "blue"),
  replied: opt("replied", "Replied", "green"),
  no_response: opt("no_response", "No response", "neutral"),
};

export const RELATIONSHIP_CONFIG: Record<Relationship, OptionConfig<Relationship>> = {
  recruiter: opt("recruiter", "Recruiter", "cyan"),
  hiring_manager: opt("hiring_manager", "Hiring manager", "violet"),
  employee: opt("employee", "Employee", "blue"),
  referral: opt("referral", "Referral", "primary"),
  friend: opt("friend", "Friend", "teal"),
  alumni: opt("alumni", "Alumni", "amber"),
  other: opt("other", "Other", "neutral"),
};

export const RESUME_VARIANT_CONFIG: Record<ResumeVariant, OptionConfig<ResumeVariant>> = {
  general: opt("general", "General", "neutral"),
  software_engineer: opt("software_engineer", "Software Engineer", "blue"),
  frontend: opt("frontend", "Frontend", "cyan"),
  backend: opt("backend", "Backend", "violet"),
  ai_ml: opt("ai_ml", "AI / ML", "teal"),
  internship: opt("internship", "Internship", "amber"),
  custom: opt("custom", "Custom", "neutral"),
};

export const DOCUMENT_TYPE_CONFIG: Record<DocumentType, OptionConfig<DocumentType>> = {
  resume: opt("resume", "Resume", "blue"),
  cover_letter: opt("cover_letter", "Cover letter", "cyan"),
  certificate: opt("certificate", "Certificate", "teal"),
  portfolio: opt("portfolio", "Portfolio", "violet"),
  recommendation: opt("recommendation", "Recommendation", "primary"),
  transcript: opt("transcript", "Transcript", "amber"),
  other: opt("other", "Other", "neutral"),
};

export const EVENT_TYPE_CONFIG: Record<EventType, OptionConfig<EventType>> = {
  interview: opt("interview", "Interview", "violet"),
  follow_up: opt("follow_up", "Follow-up", "cyan"),
  deadline: opt("deadline", "Deadline", "rose"),
  task: opt("task", "Task", "blue"),
  assessment: opt("assessment", "Assessment", "amber"),
  networking: opt("networking", "Networking", "teal"),
  custom: opt("custom", "Event", "neutral"),
};

export const GOAL_TYPE_CONFIG: Record<GoalType, OptionConfig<GoalType>> = {
  applications: opt("applications", "Applications", "blue", "Applications submitted"),
  interviews: opt("interviews", "Interviews", "violet", "Interviews attended"),
  contacts: opt("contacts", "Networking", "teal", "New contacts added"),
  follow_ups: opt("follow_ups", "Follow-ups", "cyan", "Follow-ups sent"),
  learning: opt("learning", "Learning", "amber", "Tracked by hand"),
  target_companies: opt("target_companies", "Target companies", "primary", "Applied to targets"),
  target_salary: opt("target_salary", "Target salary", "green", "Tracked by hand"),
  target_role: opt("target_role", "Target role", "neutral", "Tracked by hand"),
};

export const GOAL_PERIOD_CONFIG: Record<GoalPeriod, OptionConfig<GoalPeriod>> = {
  week: opt("week", "This week", "neutral"),
  month: opt("month", "This month", "neutral"),
  quarter: opt("quarter", "This quarter", "neutral"),
  all_time: opt("all_time", "All time", "neutral"),
};

/** Goal types whose progress is entered by hand rather than derived from data. */
export const MANUAL_GOAL_TYPES: GoalType[] = ["learning", "target_salary", "target_role"];

export const COMPETENCY_CONFIG: Record<Competency, OptionConfig<Competency>> = {
  leadership: opt("leadership", "Leadership", "primary"),
  conflict: opt("conflict", "Conflict", "rose"),
  failure: opt("failure", "Failure", "orange"),
  teamwork: opt("teamwork", "Teamwork", "teal"),
  problem_solving: opt("problem_solving", "Problem solving", "violet"),
  ownership: opt("ownership", "Ownership", "blue"),
  communication: opt("communication", "Communication", "cyan"),
  ambiguity: opt("ambiguity", "Ambiguity", "amber"),
  impact: opt("impact", "Impact", "green"),
  mentorship: opt("mentorship", "Mentorship", "neutral"),
};

export const COMPANY_SIZE_LABEL: Record<CompanySize, string> = {
  "1-10": "1–10",
  "11-50": "11–50",
  "51-200": "51–200",
  "201-500": "201–500",
  "501-1000": "501–1,000",
  "1001-5000": "1,001–5,000",
  "5000+": "5,000+",
};

/** Icon key + phrasing for the activity timeline. */
export const ACTIVITY_CONFIG: Record<ActivityType, { label: string; tone: Tone; icon: string }> = {
  application_created: { label: "Application created", tone: "neutral", icon: "plus" },
  application_updated: { label: "Application updated", tone: "neutral", icon: "pencil" },
  status_changed: { label: "Status changed", tone: "blue", icon: "arrow-right" },
  priority_changed: { label: "Priority changed", tone: "orange", icon: "flag" },
  resume_attached: { label: "Resume attached", tone: "violet", icon: "file" },
  cover_letter_attached: { label: "Cover letter attached", tone: "cyan", icon: "file" },
  document_attached: { label: "Document attached", tone: "neutral", icon: "paperclip" },
  note_added: { label: "Note added", tone: "neutral", icon: "note" },
  interview_scheduled: { label: "Interview scheduled", tone: "violet", icon: "calendar" },
  interview_completed: { label: "Interview completed", tone: "teal", icon: "check" },
  interview_updated: { label: "Interview updated", tone: "neutral", icon: "calendar" },
  contact_added: { label: "Contact added", tone: "cyan", icon: "user" },
  contact_linked: { label: "Contact linked", tone: "cyan", icon: "user" },
  follow_up_created: { label: "Follow-up scheduled", tone: "amber", icon: "send" },
  follow_up_sent: { label: "Follow-up sent", tone: "blue", icon: "send" },
  follow_up_replied: { label: "Reply received", tone: "green", icon: "reply" },
  task_created: { label: "Task created", tone: "neutral", icon: "check-square" },
  task_completed: { label: "Task completed", tone: "green", icon: "check-square" },
  job_saved: { label: "Job saved", tone: "neutral", icon: "bookmark" },
  job_converted: { label: "Job converted", tone: "primary", icon: "arrow-right" },
  offer_received: { label: "Offer received", tone: "primary", icon: "party" },
  company_created: { label: "Company added", tone: "neutral", icon: "building" },
  goal_created: { label: "Goal set", tone: "neutral", icon: "target" },
  goal_reached: { label: "Goal reached", tone: "primary", icon: "target" },
};

/** Tailwind classes per tone. Keep in sync with the tone tokens in globals.css. */
export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-tone-neutral",
  blue: "bg-tone-blue",
  violet: "bg-tone-violet",
  cyan: "bg-tone-cyan",
  teal: "bg-tone-teal",
  green: "bg-tone-green",
  amber: "bg-tone-amber",
  orange: "bg-tone-orange",
  rose: "bg-tone-rose",
  primary: "bg-primary",
};

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-tone-neutral",
  blue: "text-tone-blue",
  violet: "text-tone-violet",
  cyan: "text-tone-cyan",
  teal: "text-tone-teal",
  green: "text-tone-green",
  amber: "text-tone-amber",
  orange: "text-tone-orange",
  rose: "text-tone-rose",
  primary: "text-primary",
};

/** The raw token per tone, for SVG fills and gradient stops. */
export const TONE_VAR: Record<Tone, string> = {
  neutral: "var(--tone-neutral)",
  blue: "var(--tone-blue)",
  violet: "var(--tone-violet)",
  cyan: "var(--tone-cyan)",
  teal: "var(--tone-teal)",
  green: "var(--tone-green)",
  amber: "var(--tone-amber)",
  orange: "var(--tone-orange)",
  rose: "var(--tone-rose)",
  primary: "var(--primary)",
};

/** SVG fill per tone. Written out because Tailwind cannot see a built string. */
export const TONE_FILL: Record<Tone, string> = {
  neutral: "fill-tone-neutral",
  blue: "fill-tone-blue",
  violet: "fill-tone-violet",
  cyan: "fill-tone-cyan",
  teal: "fill-tone-teal",
  green: "fill-tone-green",
  amber: "fill-tone-amber",
  orange: "fill-tone-orange",
  rose: "fill-tone-rose",
  primary: "fill-primary",
};

/** Soft tinted chip, for calendar entries and anywhere a dot is too quiet. */
export const TONE_SOFT: Record<Tone, string> = {
  neutral: "bg-tone-neutral/12 text-tone-neutral",
  blue: "bg-tone-blue/12 text-tone-blue",
  violet: "bg-tone-violet/12 text-tone-violet",
  cyan: "bg-tone-cyan/12 text-tone-cyan",
  teal: "bg-tone-teal/12 text-tone-teal",
  green: "bg-tone-green/12 text-tone-green",
  amber: "bg-tone-amber/12 text-tone-amber",
  orange: "bg-tone-orange/12 text-tone-orange",
  rose: "bg-tone-rose/12 text-tone-rose",
  primary: "bg-primary/12 text-primary",
};

export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "SGD", "JPY", "CHF"] as const;
