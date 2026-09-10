/**
 * ApplyOS domain model.
 *
 * Every record is workspace-scoped, timestamped, and adapter-agnostic: the same
 * shapes are persisted by the Supabase adapter (as snake_case rows) and by the
 * zero-config local adapter (as IndexedDB objects).
 */

export type ID = string;
/** ISO-8601 timestamp. */
export type Timestamp = string;
/** ISO-8601 date, `YYYY-MM-DD`. */
export type DateOnly = string;

export interface BaseRecord {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

export const APPLICATION_STATUSES = [
  "wishlist",
  "preparing",
  "applied",
  "viewed",
  "recruiter_contacted",
  "screening",
  "assessment",
  "interview",
  "final_round",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
  "ghosted",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const WORK_MODES = ["onsite", "hybrid", "remote"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
  "freelance",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const SOURCES = [
  "linkedin",
  "indeed",
  "company_site",
  "referral",
  "recruiter",
  "job_board",
  "wellfound",
  "glassdoor",
  "hacker_news",
  "network",
  "other",
] as const;
export type Source = (typeof SOURCES)[number];

export const INTERVIEW_TYPES = [
  "recruiter_screen",
  "phone",
  "video",
  "technical",
  "behavioral",
  "system_design",
  "manager",
  "final",
] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_STATUSES = [
  "scheduled",
  "completed",
  "rescheduled",
  "cancelled",
  "passed",
  "failed",
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const TASK_STATUSES = ["todo", "in_progress", "completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const FOLLOW_UP_TYPES = [
  "recruiter",
  "thank_you",
  "referral",
  "application",
  "networking",
] as const;
export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

export const FOLLOW_UP_STATUSES = ["pending", "sent", "replied", "no_response"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const RELATIONSHIPS = [
  "recruiter",
  "hiring_manager",
  "employee",
  "referral",
  "friend",
  "alumni",
  "other",
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const RESUME_VARIANTS = [
  "general",
  "software_engineer",
  "frontend",
  "backend",
  "ai_ml",
  "internship",
  "custom",
] as const;
export type ResumeVariant = (typeof RESUME_VARIANTS)[number];

export const DOCUMENT_TYPES = [
  "resume",
  "cover_letter",
  "certificate",
  "portfolio",
  "recommendation",
  "transcript",
  "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+",
] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export const EVENT_TYPES = [
  "interview",
  "follow_up",
  "deadline",
  "task",
  "assessment",
  "networking",
  "custom",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const GOAL_TYPES = [
  "applications",
  "interviews",
  "contacts",
  "follow_ups",
  "learning",
  "target_companies",
  "target_salary",
  "target_role",
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_PERIODS = ["week", "month", "quarter", "all_time"] as const;
export type GoalPeriod = (typeof GOAL_PERIODS)[number];

export const COMPETENCIES = [
  "leadership",
  "conflict",
  "failure",
  "teamwork",
  "problem_solving",
  "ownership",
  "communication",
  "ambiguity",
  "impact",
  "mentorship",
] as const;
export type Competency = (typeof COMPETENCIES)[number];

export const ENTITY_TYPES = [
  "application",
  "job",
  "company",
  "contact",
  "interview",
  "task",
  "follow_up",
  "resume",
  "cover_letter",
  "document",
  "goal",
  "story",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Design-system tones. One family, matched lightness, dots and hairlines only. */
export type Tone =
  | "neutral"
  | "blue"
  | "violet"
  | "cyan"
  | "teal"
  | "green"
  | "amber"
  | "orange"
  | "rose"
  | "primary";

/* -------------------------------------------------------------------------- */
/* Records                                                                     */
/* -------------------------------------------------------------------------- */

export interface Company extends BaseRecord {
  name: string;
  domain?: string | null;
  website?: string | null;
  careersUrl?: string | null;
  logoUrl?: string | null;
  industry?: string | null;
  size?: CompanySize | null;
  location?: string | null;
  /** 0–5, half steps allowed. */
  rating?: number | null;
  notes?: string | null;
  tags: string[];
  favorite: boolean;
}

export interface SalaryRange {
  min?: number | null;
  max?: number | null;
  currency: string;
  period: "year" | "month" | "hour";
}

export interface Application extends BaseRecord {
  companyId: ID;
  position: string;
  jobUrl?: string | null;
  location?: string | null;
  workMode?: WorkMode | null;
  employmentType?: EmploymentType | null;
  salary: SalaryRange;
  appliedAt?: DateOnly | null;
  deadline?: DateOnly | null;
  status: ApplicationStatus;
  priority: Priority;
  source?: Source | null;
  /** Recruiters, hiring managers and interviewers attached to this application. */
  contactIds: ID[];
  referral: boolean;
  referredBy?: string | null;
  notes?: string | null;
  tags: string[];
  resumeId?: ID | null;
  coverLetterId?: ID | null;
  documentIds: ID[];
  nextAction?: string | null;
  nextActionDate?: DateOnly | null;
  /** Set when this application was converted from a saved job. */
  jobId?: ID | null;
  /** Free-form description / JD text used by fit scoring and AI features. */
  description?: string | null;
  archived: boolean;
}

export interface Job extends BaseRecord {
  title: string;
  companyId: ID;
  url?: string | null;
  salary: SalaryRange;
  location?: string | null;
  workMode?: WorkMode | null;
  employmentType?: EmploymentType | null;
  description?: string | null;
  requirements: string[];
  skills: string[];
  experienceYears?: number | null;
  deadline?: DateOnly | null;
  source?: Source | null;
  savedAt: Timestamp;
  notes?: string | null;
  tags: string[];
  status: "saved" | "converted" | "archived";
  convertedApplicationId?: ID | null;
}

export interface Contact extends BaseRecord {
  name: string;
  companyId?: ID | null;
  position?: string | null;
  email?: string | null;
  linkedin?: string | null;
  phone?: string | null;
  relationship: Relationship;
  source?: Source | null;
  lastContactedAt?: DateOnly | null;
  nextFollowUpAt?: DateOnly | null;
  notes?: string | null;
  tags: string[];
  favorite: boolean;
}

export interface PrepQuestion {
  id: ID;
  text: string;
  answer?: string;
  done: boolean;
}

export interface InterviewPrep {
  companyOverview: string;
  products: string;
  competitors: string;
  recentNews: string;
  cultureNotes: string;
  responsibilities: string;
  requiredSkills: string;
  technologies: string;
  keyRequirements: string;
  questionsToAsk: PrepQuestion[];
  expectedQuestions: PrepQuestion[];
  storyIds: ID[];
}

export interface Interview extends BaseRecord {
  applicationId: ID;
  /** Denormalised for interviews logged without a full application. */
  companyId: ID;
  position: string;
  scheduledAt: Timestamp;
  durationMinutes: number;
  type: InterviewType;
  interviewerContactIds: ID[];
  interviewerNames: string[];
  round: number;
  meetingUrl?: string | null;
  location?: string | null;
  status: InterviewStatus;
  notes?: string | null;
  feedback?: string | null;
  /** Self-assessment 1–5 after the interview. */
  rating?: number | null;
  prep: InterviewPrep;
}

export interface Task extends BaseRecord {
  title: string;
  description?: string | null;
  dueDate?: DateOnly | null;
  priority: Priority;
  status: TaskStatus;
  relatedType?: EntityType | null;
  relatedId?: ID | null;
  completedAt?: Timestamp | null;
  tags: string[];
}

export interface FollowUp extends BaseRecord {
  type: FollowUpType;
  contactId?: ID | null;
  applicationId?: ID | null;
  interviewId?: ID | null;
  dueDate: DateOnly;
  channel: "email" | "linkedin" | "phone" | "other";
  subject?: string | null;
  message?: string | null;
  status: FollowUpStatus;
  sentAt?: Timestamp | null;
  repliedAt?: Timestamp | null;
}

export interface Resume extends BaseRecord {
  name: string;
  version: number;
  variant: ResumeVariant;
  /** An external link, or `local:<id>` for a file kept in this browser. */
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  content?: string | null;
  notes?: string | null;
  tags: string[];
  isDefault: boolean;
  archived: boolean;
}

export interface CoverLetter extends BaseRecord {
  name: string;
  version: number;
  isTemplate: boolean;
  companyId?: ID | null;
  applicationId?: ID | null;
  position?: string | null;
  content: string;
  notes?: string | null;
  archived: boolean;
}

export interface DocumentRecord extends BaseRecord {
  name: string;
  type: DocumentType;
  url?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  /** Supabase Storage object path, when storage is configured. */
  storagePath?: string | null;
  applicationIds: ID[];
  notes?: string | null;
  tags: string[];
}

export interface Note extends BaseRecord {
  entityType: EntityType;
  entityId: ID;
  body: string;
  pinned: boolean;
}

export const ACTIVITY_TYPES = [
  "application_created",
  "application_updated",
  "status_changed",
  "priority_changed",
  "resume_attached",
  "cover_letter_attached",
  "document_attached",
  "note_added",
  "interview_scheduled",
  "interview_completed",
  "interview_updated",
  "contact_added",
  "contact_linked",
  "follow_up_created",
  "follow_up_sent",
  "follow_up_replied",
  "task_created",
  "task_completed",
  "job_saved",
  "job_converted",
  "offer_received",
  "company_created",
  "goal_created",
  "goal_reached",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface Activity extends BaseRecord {
  type: ActivityType;
  entityType: EntityType;
  entityId: ID;
  /** Short, already-rendered summary: "Applied to Stripe · Product Engineer". */
  title: string;
  description?: string | null;
  meta: Record<string, unknown>;
  occurredAt: Timestamp;
}

export interface Goal extends BaseRecord {
  type: GoalType;
  label: string;
  target: number;
  period: GoalPeriod;
  unit?: string | null;
  /** For qualitative goals (learning, target role) that are tracked by hand. */
  manualProgress?: number | null;
  notes?: string | null;
  active: boolean;
}

export interface Tag extends BaseRecord {
  name: string;
  tone: Tone;
}

export interface CalendarEventRecord extends BaseRecord {
  title: string;
  type: EventType;
  startAt: Timestamp;
  endAt?: Timestamp | null;
  allDay: boolean;
  relatedType?: EntityType | null;
  relatedId?: ID | null;
  location?: string | null;
  url?: string | null;
  notes?: string | null;
}

export interface StarStory extends BaseRecord {
  title: string;
  /** The entry itself: markdown, written however the author likes. */
  body: string;
  /** @deprecated The old four-box form. Read for migration, never written. */
  situation: string;
  task: string;
  action: string;
  result: string;
  competencies: Competency[];
  tags: string[];
  /** Roughly how long the story takes to tell, in seconds. */
  durationSeconds?: number | null;
  favorite: boolean;
}

/* -------------------------------------------------------------------------- */
/* Profile & preferences                                                       */
/* -------------------------------------------------------------------------- */

export interface FitPreferences {
  skills: string[];
  desiredRoles: string[];
  locations: string[];
  workModes: WorkMode[];
  minSalary?: number | null;
  experienceYears?: number | null;
  preferredCompanyIds: ID[];
}

export interface NotificationPreferences {
  interviewTomorrow: boolean;
  interviewInOneHour: boolean;
  followUpDue: boolean;
  applicationDeadline: boolean;
  taskOverdue: boolean;
  offerDeadline: boolean;
  recruiterResponse: boolean;
  inactiveApplication: boolean;
  /** Days without a status change before an application is flagged inactive. */
  inactiveAfterDays: number;
  /** Days after applying before a follow-up is suggested. */
  followUpAfterDays: number;
}

export interface Profile extends BaseRecord {
  name: string;
  email?: string | null;
  headline?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  targetRole?: string | null;
  targetSalary?: number | null;
  currency: string;
  fit: FitPreferences;
  notifications: NotificationPreferences;
  /** Ordered list of statuses hidden from the pipeline board. */
  hiddenPipelineStatuses: ApplicationStatus[];
  weekStartsOn: 0 | 1;
}

/* -------------------------------------------------------------------------- */
/* Database shape                                                              */
/* -------------------------------------------------------------------------- */

export interface Database {
  companies: Company[];
  applications: Application[];
  jobs: Job[];
  contacts: Contact[];
  interviews: Interview[];
  tasks: Task[];
  followUps: FollowUp[];
  resumes: Resume[];
  coverLetters: CoverLetter[];
  documents: DocumentRecord[];
  notes: Note[];
  activities: Activity[];
  goals: Goal[];
  tags: Tag[];
  events: CalendarEventRecord[];
  stories: StarStory[];
  profiles: Profile[];
}

export type CollectionName = keyof Database;
export type RecordOf<K extends CollectionName> = Database[K][number];

export const COLLECTIONS: CollectionName[] = [
  "companies",
  "applications",
  "jobs",
  "contacts",
  "interviews",
  "tasks",
  "followUps",
  "resumes",
  "coverLetters",
  "documents",
  "notes",
  "activities",
  "goals",
  "tags",
  "events",
  "stories",
  "profiles",
];
