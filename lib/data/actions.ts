import {
  ACTIVE_STATUSES,
  STATUS_CONFIG,
  STATUS_RANK,
} from "@/lib/constants";
import { domainFromUrl, guessDomain } from "@/lib/job-url";
import type {
  Activity,
  ActivityType,
  Application,
  ApplicationStatus,
  CalendarEventRecord,
  CollectionName,
  Company,
  Contact,
  CoverLetter,
  DocumentRecord,
  EntityType,
  FollowUp,
  Goal,
  ID,
  Interview,
  InterviewPrep,
  Job,
  Note,
  Priority,
  Profile,
  Resume,
  SalaryRange,
  StarStory,
  Task,
} from "@/lib/types";
import { addDays, toDateOnly, todayDateOnly } from "@/lib/date";
import { newId, now, store } from "./store";

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

const base = () => {
  const timestamp = now();
  return { id: newId(), createdAt: timestamp, updatedAt: timestamp };
};

export const defaultSalary = (currency = "USD"): SalaryRange => ({
  min: null,
  max: null,
  currency,
  period: "year",
});

export const defaultPrep = (): InterviewPrep => ({
  companyOverview: "",
  products: "",
  competitors: "",
  recentNews: "",
  cultureNotes: "",
  responsibilities: "",
  requiredSkills: "",
  technologies: "",
  keyRequirements: "",
  questionsToAsk: [],
  expectedQuestions: [],
  storyIds: [],
});

/** A snapshot of everything a delete removed, so undo is exact. */
export interface UndoBundle {
  label: string;
  entries: Array<{ collection: CollectionName; records: unknown[] }>;
}

export function restoreBundle(bundle: UndoBundle) {
  store.batch(() => {
    for (const entry of bundle.entries) {
      store.restore(entry.collection, entry.records as never);
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Activity                                                                    */
/* -------------------------------------------------------------------------- */

export function logActivity(input: {
  type: ActivityType;
  entityType: EntityType;
  entityId: ID;
  title: string;
  description?: string | null;
  meta?: Record<string, unknown>;
  occurredAt?: string;
}): Activity {
  const activity: Activity = {
    ...base(),
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    description: input.description ?? null,
    meta: input.meta ?? {},
    occurredAt: input.occurredAt ?? now(),
  };
  return store.insert("activities", activity);
}

const companyName = (companyId: ID) => store.find("companies", companyId)?.name ?? "Unknown";

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

export const defaultProfile = (): Profile => ({
  ...base(),
  name: "You",
  email: null,
  headline: null,
  location: null,
  avatarUrl: null,
  targetRole: null,
  targetSalary: null,
  currency: "USD",
  fit: {
    skills: [],
    desiredRoles: [],
    locations: [],
    workModes: [],
    minSalary: null,
    experienceYears: null,
    preferredCompanyIds: [],
  },
  notifications: {
    interviewTomorrow: true,
    interviewInOneHour: true,
    followUpDue: true,
    applicationDeadline: true,
    taskOverdue: true,
    offerDeadline: true,
    recruiterResponse: true,
    inactiveApplication: true,
    inactiveAfterDays: 14,
    followUpAfterDays: 7,
  },
  hiddenPipelineStatuses: [],
  weekStartsOn: 1,
});

export function ensureProfile(): Profile {
  const existing = store.getCollection("profiles")[0];
  if (existing) return existing;
  return store.insert("profiles", defaultProfile());
}

export function getProfile(): Profile {
  return store.getCollection("profiles")[0] ?? defaultProfile();
}

export function updateProfile(patch: Partial<Profile>) {
  const profile = ensureProfile();
  return store.patch("profiles", profile.id, patch);
}

/* -------------------------------------------------------------------------- */
/* Companies                                                                   */
/* -------------------------------------------------------------------------- */

export function createCompany(input: Partial<Company> & { name: string }): Company {
  const company: Company = {
    ...base(),
    name: input.name.trim(),
    domain: input.domain ?? null,
    website: input.website ?? null,
    careersUrl: input.careersUrl ?? null,
    logoUrl: input.logoUrl ?? null,
    industry: input.industry ?? null,
    size: input.size ?? null,
    location: input.location ?? null,
    rating: input.rating ?? null,
    notes: input.notes ?? null,
    tags: input.tags ?? [],
    favorite: input.favorite ?? false,
  };
  store.insert("companies", company);
  logActivity({
    type: "company_created",
    entityType: "company",
    entityId: company.id,
    title: `Added ${company.name}`,
  });
  return company;
}

/** Matches on normalised name so "Stripe" and "stripe " are one company. */
export function findOrCreateCompany(name: string, extra?: Partial<Company>): Company {
  const trimmed = name.trim();
  const key = trimmed.toLowerCase();
  const existing = store.getCollection("companies").find((c) => c.name.toLowerCase() === key);
  if (existing) {
    if (extra?.domain && !existing.domain) store.patch("companies", existing.id, { domain: extra.domain });
    return existing;
  }
  return createCompany({ name: trimmed, domain: guessDomain(trimmed), ...extra });
}

export function updateCompany(id: ID, patch: Partial<Company>) {
  return store.patch("companies", id, patch);
}

export function deleteCompany(id: ID): UndoBundle {
  const company = store.find("companies", id);
  const applications = store.getCollection("applications").filter((a) => a.companyId === id);
  const entries: UndoBundle["entries"] = [];

  for (const application of applications) {
    const bundle = deleteApplication(application.id);
    entries.push(...bundle.entries);
  }

  const contacts = store.getCollection("contacts").filter((c) => c.companyId === id);
  const jobs = store.getCollection("jobs").filter((j) => j.companyId === id);
  entries.push({ collection: "contacts", records: store.remove("contacts", contacts.map((c) => c.id)) });
  entries.push({ collection: "jobs", records: store.remove("jobs", jobs.map((j) => j.id)) });
  entries.push({ collection: "companies", records: store.remove("companies", [id]) });

  return { label: company ? `${company.name} deleted` : "Company deleted", entries };
}

/* -------------------------------------------------------------------------- */
/* Applications                                                                */
/* -------------------------------------------------------------------------- */

export interface ApplicationDraft extends Partial<Omit<Application, "companyId">> {
  companyId?: ID;
  companyName?: string;
  position: string;
}

export function createApplication(draft: ApplicationDraft): Application {
  return store.batch(() => {
    const profile = getProfile();
    const company = draft.companyId
      ? store.find("companies", draft.companyId)
      : draft.companyName
        ? findOrCreateCompany(draft.companyName, {
            domain: domainFromUrl(draft.jobUrl) ?? undefined,
          })
        : null;
    const companyId = company?.id ?? findOrCreateCompany("Unknown company").id;
    const status = draft.status ?? "wishlist";

    const application: Application = {
      ...base(),
      companyId,
      position: draft.position.trim(),
      jobUrl: draft.jobUrl ?? null,
      location: draft.location ?? null,
      workMode: draft.workMode ?? null,
      employmentType: draft.employmentType ?? null,
      salary: draft.salary ?? defaultSalary(profile.currency),
      appliedAt: draft.appliedAt ?? (isAppliedStatus(status) ? todayDateOnly() : null),
      deadline: draft.deadline ?? null,
      status,
      priority: draft.priority ?? "medium",
      source: draft.source ?? null,
      contactIds: draft.contactIds ?? [],
      referral: draft.referral ?? false,
      referredBy: draft.referredBy ?? null,
      notes: draft.notes ?? null,
      tags: draft.tags ?? [],
      resumeId: draft.resumeId ?? null,
      coverLetterId: draft.coverLetterId ?? null,
      documentIds: draft.documentIds ?? [],
      nextAction: draft.nextAction ?? null,
      nextActionDate: draft.nextActionDate ?? null,
      jobId: draft.jobId ?? null,
      description: draft.description ?? null,
      archived: false,
    };

    applyStatusDefaults(application, null, status, profile);
    store.insert("applications", application);

    logActivity({
      type: "application_created",
      entityType: "application",
      entityId: application.id,
      title: `Added ${application.position} at ${companyName(companyId)}`,
      meta: { status },
    });
    if (isAppliedStatus(status)) {
      logActivity({
        type: "status_changed",
        entityType: "application",
        entityId: application.id,
        title: `Applied to ${companyName(companyId)} · ${application.position}`,
        meta: { to: status },
      });
    }
    return application;
  });
}

const isAppliedStatus = (status: ApplicationStatus) =>
  STATUS_RANK[status] >= STATUS_RANK.applied && STATUS_RANK[status] > 0;

/** Intelligent defaults applied when an application enters a new stage. */
function applyStatusDefaults(
  application: Application,
  from: ApplicationStatus | null,
  to: ApplicationStatus,
  profile: Profile,
) {
  if (isAppliedStatus(to) && !application.appliedAt) {
    application.appliedAt = todayDateOnly();
  }
  if (to === "applied" && !application.nextAction) {
    application.nextAction = "Follow up with recruiter";
    application.nextActionDate = toDateOnly(
      addDays(new Date(), profile.notifications.followUpAfterDays),
    );
  }
  if (to === "offer" && (!application.nextAction || from === "final_round")) {
    application.nextAction = "Respond to offer";
    application.nextActionDate = application.nextActionDate ?? toDateOnly(addDays(new Date(), 5));
  }
  if (to === "rejected" || to === "withdrawn" || to === "ghosted" || to === "accepted") {
    application.nextAction = null;
    application.nextActionDate = null;
  }
}

export function updateApplication(id: ID, patch: Partial<Application>) {
  const before = store.find("applications", id);
  if (!before) return null;

  if (patch.status && patch.status !== before.status) {
    return setApplicationStatus(id, patch.status, patch);
  }

  const updated = store.patch("applications", id, patch);
  if (updated && patch.priority && patch.priority !== before.priority) {
    logActivity({
      type: "priority_changed",
      entityType: "application",
      entityId: id,
      title: `Priority set to ${patch.priority}`,
      meta: { from: before.priority, to: patch.priority },
    });
  }
  if (updated && patch.resumeId && patch.resumeId !== before.resumeId) {
    const resume = store.find("resumes", patch.resumeId);
    logActivity({
      type: "resume_attached",
      entityType: "application",
      entityId: id,
      title: `Attached ${resume ? `${resume.name} v${resume.version}` : "a resume"}`,
    });
  }
  if (updated && patch.coverLetterId && patch.coverLetterId !== before.coverLetterId) {
    const letter = store.find("coverLetters", patch.coverLetterId);
    logActivity({
      type: "cover_letter_attached",
      entityType: "application",
      entityId: id,
      title: `Attached ${letter ? letter.name : "a cover letter"}`,
    });
  }
  return updated;
}

export function setApplicationStatus(
  id: ID,
  status: ApplicationStatus,
  extra: Partial<Application> = {},
) {
  return store.batch(() => {
    const before = store.find("applications", id);
    if (!before) return null;
    if (before.status === status && Object.keys(extra).length === 0) return before;

    const draft: Application = { ...before, ...extra, status };
    applyStatusDefaults(draft, before.status, status, getProfile());

    const updated = store.patch("applications", id, {
      ...extra,
      status,
      appliedAt: draft.appliedAt,
      nextAction: draft.nextAction,
      nextActionDate: draft.nextActionDate,
    });

    if (before.status !== status) {
      logActivity({
        type: status === "offer" ? "offer_received" : "status_changed",
        entityType: "application",
        entityId: id,
        title:
          status === "offer"
            ? `Offer from ${companyName(before.companyId)}`
            : `${companyName(before.companyId)} · ${STATUS_CONFIG[before.status].label} → ${STATUS_CONFIG[status].label}`,
        meta: { from: before.status, to: status },
      });
    }
    return updated;
  });
}

export function completeNextAction(id: ID) {
  const application = store.find("applications", id);
  if (!application?.nextAction) return null;
  const label = application.nextAction;
  const updated = store.patch("applications", id, { nextAction: null, nextActionDate: null });
  logActivity({
    type: "application_updated",
    entityType: "application",
    entityId: id,
    title: `Completed: ${label}`,
  });
  return updated;
}

export function setNextAction(id: ID, action: string | null, date: string | null) {
  return store.patch("applications", id, { nextAction: action, nextActionDate: date });
}

export function deleteApplication(id: ID): UndoBundle {
  return store.batch(() => {
    const application = store.find("applications", id);
    const entries: UndoBundle["entries"] = [];
    const interviewIds = store
      .getCollection("interviews")
      .filter((i) => i.applicationId === id)
      .map((i) => i.id);
    const followUpIds = store
      .getCollection("followUps")
      .filter((f) => f.applicationId === id)
      .map((f) => f.id);
    const taskIds = store
      .getCollection("tasks")
      .filter((t) => t.relatedType === "application" && t.relatedId === id)
      .map((t) => t.id);
    const noteIds = store
      .getCollection("notes")
      .filter((n) => n.entityType === "application" && n.entityId === id)
      .map((n) => n.id);
    const activityIds = store
      .getCollection("activities")
      .filter((a) => a.entityType === "application" && a.entityId === id)
      .map((a) => a.id);

    entries.push({ collection: "interviews", records: store.remove("interviews", interviewIds) });
    entries.push({ collection: "followUps", records: store.remove("followUps", followUpIds) });
    entries.push({ collection: "tasks", records: store.remove("tasks", taskIds) });
    entries.push({ collection: "notes", records: store.remove("notes", noteIds) });
    entries.push({ collection: "activities", records: store.remove("activities", activityIds) });
    entries.push({ collection: "applications", records: store.remove("applications", [id]) });

    return {
      label: application ? `${application.position} deleted` : "Application deleted",
      entries,
    };
  });
}

export function deleteApplications(ids: ID[]): UndoBundle {
  return store.batch(() => {
    const entries: UndoBundle["entries"] = [];
    for (const id of ids) entries.push(...deleteApplication(id).entries);
    return { label: `${ids.length} applications deleted`, entries };
  });
}

export function archiveApplication(id: ID, archived = true) {
  return store.patch("applications", id, { archived });
}

/* -------------------------------------------------------------------------- */
/* Jobs                                                                        */
/* -------------------------------------------------------------------------- */

export interface JobDraft extends Partial<Omit<Job, "companyId">> {
  companyId?: ID;
  companyName?: string;
  title: string;
}

export function createJob(draft: JobDraft): Job {
  return store.batch(() => {
    const profile = getProfile();
    const company = draft.companyId
      ? store.find("companies", draft.companyId)
      : findOrCreateCompany(draft.companyName?.trim() || "Unknown company", {
          domain: domainFromUrl(draft.url) ?? undefined,
        });
    const companyId = company?.id ?? findOrCreateCompany("Unknown company").id;

    const job: Job = {
      ...base(),
      title: draft.title.trim(),
      companyId,
      url: draft.url ?? null,
      salary: draft.salary ?? defaultSalary(profile.currency),
      location: draft.location ?? null,
      workMode: draft.workMode ?? null,
      employmentType: draft.employmentType ?? null,
      description: draft.description ?? null,
      requirements: draft.requirements ?? [],
      skills: draft.skills ?? [],
      experienceYears: draft.experienceYears ?? null,
      deadline: draft.deadline ?? null,
      source: draft.source ?? null,
      savedAt: draft.savedAt ?? now(),
      notes: draft.notes ?? null,
      tags: draft.tags ?? [],
      status: "saved",
      convertedApplicationId: null,
    };
    store.insert("jobs", job);
    logActivity({
      type: "job_saved",
      entityType: "job",
      entityId: job.id,
      title: `Saved ${job.title} at ${companyName(companyId)}`,
    });
    return job;
  });
}

export function updateJob(id: ID, patch: Partial<Job>) {
  return store.patch("jobs", id, patch);
}

export function convertJobToApplication(id: ID): Application | null {
  return store.batch(() => {
    const job = store.find("jobs", id);
    if (!job) return null;
    const application = createApplication({
      companyId: job.companyId,
      position: job.title,
      jobUrl: job.url,
      location: job.location,
      workMode: job.workMode,
      employmentType: job.employmentType,
      salary: job.salary,
      deadline: job.deadline,
      source: job.source,
      status: "preparing",
      priority: "medium",
      tags: job.tags,
      description: job.description,
      notes: job.notes,
      jobId: job.id,
    });
    store.patch("jobs", id, { status: "converted", convertedApplicationId: application.id });
    logActivity({
      type: "job_converted",
      entityType: "application",
      entityId: application.id,
      title: `Moved ${job.title} into the pipeline`,
    });
    return application;
  });
}

export function deleteJob(id: ID): UndoBundle {
  const job = store.find("jobs", id);
  return {
    label: job ? `${job.title} removed` : "Job removed",
    entries: [{ collection: "jobs", records: store.remove("jobs", [id]) }],
  };
}

/* -------------------------------------------------------------------------- */
/* Contacts                                                                    */
/* -------------------------------------------------------------------------- */

export function createContact(input: Partial<Contact> & { name: string }): Contact {
  const contact: Contact = {
    ...base(),
    name: input.name.trim(),
    companyId: input.companyId ?? null,
    position: input.position ?? null,
    email: input.email ?? null,
    linkedin: input.linkedin ?? null,
    phone: input.phone ?? null,
    relationship: input.relationship ?? "recruiter",
    source: input.source ?? null,
    lastContactedAt: input.lastContactedAt ?? null,
    nextFollowUpAt: input.nextFollowUpAt ?? null,
    notes: input.notes ?? null,
    tags: input.tags ?? [],
    favorite: input.favorite ?? false,
  };
  store.insert("contacts", contact);
  logActivity({
    type: "contact_added",
    entityType: "contact",
    entityId: contact.id,
    title: `Added ${contact.name}${contact.companyId ? ` · ${companyName(contact.companyId)}` : ""}`,
  });
  return contact;
}

export function updateContact(id: ID, patch: Partial<Contact>) {
  return store.patch("contacts", id, patch);
}

export function deleteContact(id: ID): UndoBundle {
  const contact = store.find("contacts", id);
  return store.batch(() => {
    // Detach from applications and interviews so nothing points at a ghost.
    for (const application of store.getCollection("applications")) {
      if (application.contactIds.includes(id)) {
        store.patch("applications", application.id, {
          contactIds: application.contactIds.filter((c) => c !== id),
        });
      }
    }
    for (const interview of store.getCollection("interviews")) {
      if (interview.interviewerContactIds.includes(id)) {
        store.patch("interviews", interview.id, {
          interviewerContactIds: interview.interviewerContactIds.filter((c) => c !== id),
        });
      }
    }
    return {
      label: contact ? `${contact.name} deleted` : "Contact deleted",
      entries: [{ collection: "contacts", records: store.remove("contacts", [id]) }],
    };
  });
}

export function linkContactToApplication(contactId: ID, applicationId: ID) {
  const application = store.find("applications", applicationId);
  if (!application || application.contactIds.includes(contactId)) return null;
  const updated = store.patch("applications", applicationId, {
    contactIds: [...application.contactIds, contactId],
  });
  const contact = store.find("contacts", contactId);
  logActivity({
    type: "contact_linked",
    entityType: "application",
    entityId: applicationId,
    title: `Linked ${contact?.name ?? "a contact"}`,
  });
  return updated;
}

/* -------------------------------------------------------------------------- */
/* Interviews                                                                  */
/* -------------------------------------------------------------------------- */

export interface InterviewDraft extends Partial<Interview> {
  applicationId: ID;
  scheduledAt: string;
}

export function createInterview(draft: InterviewDraft): Interview | null {
  return store.batch(() => {
    const application = store.find("applications", draft.applicationId);
    if (!application) return null;
    const round =
      draft.round ??
      store.getCollection("interviews").filter((i) => i.applicationId === application.id).length + 1;

    const interview: Interview = {
      ...base(),
      applicationId: application.id,
      companyId: application.companyId,
      position: application.position,
      scheduledAt: draft.scheduledAt,
      durationMinutes: draft.durationMinutes ?? 45,
      type: draft.type ?? "recruiter_screen",
      interviewerContactIds: draft.interviewerContactIds ?? [],
      interviewerNames: draft.interviewerNames ?? [],
      round,
      meetingUrl: draft.meetingUrl ?? null,
      location: draft.location ?? null,
      status: draft.status ?? "scheduled",
      notes: draft.notes ?? null,
      feedback: draft.feedback ?? null,
      rating: draft.rating ?? null,
      prep: draft.prep ?? defaultPrep(),
    };
    store.insert("interviews", interview);
    logActivity({
      type: "interview_scheduled",
      entityType: "interview",
      entityId: interview.id,
      title: `${companyName(application.companyId)} · round ${round} scheduled`,
      meta: { applicationId: application.id },
    });
    // Moving an application into the interview stage is implied by scheduling one.
    if (STATUS_RANK[application.status] < STATUS_RANK.interview && STATUS_RANK[application.status] > 0) {
      setApplicationStatus(application.id, "interview");
    }
    return interview;
  });
}

export function updateInterview(id: ID, patch: Partial<Interview>) {
  const before = store.find("interviews", id);
  const updated = store.patch("interviews", id, patch);
  if (before && patch.status && patch.status !== before.status) {
    const finished = patch.status === "completed" || patch.status === "passed";
    logActivity({
      type: finished ? "interview_completed" : "interview_updated",
      entityType: "interview",
      entityId: id,
      title: `${companyName(before.companyId)} · round ${before.round} ${patch.status}`,
      meta: { applicationId: before.applicationId, from: before.status, to: patch.status },
    });
  }
  return updated;
}

export function updatePrep(id: ID, patch: Partial<InterviewPrep>) {
  const interview = store.find("interviews", id);
  if (!interview) return null;
  return store.patch("interviews", id, { prep: { ...interview.prep, ...patch } });
}

export function deleteInterview(id: ID): UndoBundle {
  const interview = store.find("interviews", id);
  return {
    label: interview ? `Round ${interview.round} deleted` : "Interview deleted",
    entries: [{ collection: "interviews", records: store.remove("interviews", [id]) }],
  };
}

/* -------------------------------------------------------------------------- */
/* Tasks                                                                       */
/* -------------------------------------------------------------------------- */

export function createTask(input: Partial<Task> & { title: string }): Task {
  const task: Task = {
    ...base(),
    title: input.title.trim(),
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? "medium",
    status: input.status ?? "todo",
    relatedType: input.relatedType ?? null,
    relatedId: input.relatedId ?? null,
    completedAt: null,
    tags: input.tags ?? [],
  };
  store.insert("tasks", task);
  logActivity({
    type: "task_created",
    entityType: "task",
    entityId: task.id,
    title: `Task: ${task.title}`,
  });
  return task;
}

export function updateTask(id: ID, patch: Partial<Task>) {
  const before = store.find("tasks", id);
  if (!before) return null;
  const wasCompleted = before.status === "completed";
  const willComplete = patch.status === "completed";
  const updated = store.patch("tasks", id, {
    ...patch,
    completedAt: willComplete ? now() : patch.status ? null : before.completedAt,
  });
  if (!wasCompleted && willComplete) {
    logActivity({
      type: "task_completed",
      entityType: "task",
      entityId: id,
      title: `Completed: ${before.title}`,
    });
  }
  return updated;
}

export function toggleTask(id: ID) {
  const task = store.find("tasks", id);
  if (!task) return null;
  return updateTask(id, { status: task.status === "completed" ? "todo" : "completed" });
}

export function deleteTask(id: ID): UndoBundle {
  const task = store.find("tasks", id);
  return {
    label: task ? `"${task.title}" deleted` : "Task deleted",
    entries: [{ collection: "tasks", records: store.remove("tasks", [id]) }],
  };
}

/* -------------------------------------------------------------------------- */
/* Follow-ups                                                                  */
/* -------------------------------------------------------------------------- */

export function createFollowUp(input: Partial<FollowUp> & { dueDate: string }): FollowUp {
  const followUp: FollowUp = {
    ...base(),
    type: input.type ?? "application",
    contactId: input.contactId ?? null,
    applicationId: input.applicationId ?? null,
    interviewId: input.interviewId ?? null,
    dueDate: input.dueDate,
    channel: input.channel ?? "email",
    subject: input.subject ?? null,
    message: input.message ?? null,
    status: input.status ?? "pending",
    sentAt: input.sentAt ?? null,
    repliedAt: input.repliedAt ?? null,
  };
  store.insert("followUps", followUp);
  logActivity({
    type: "follow_up_created",
    entityType: "follow_up",
    entityId: followUp.id,
    title: `Follow-up scheduled${followUp.applicationId ? ` · ${store.find("applications", followUp.applicationId)?.position ?? ""}` : ""}`,
    meta: { applicationId: followUp.applicationId },
  });
  return followUp;
}

export function updateFollowUp(id: ID, patch: Partial<FollowUp>) {
  const before = store.find("followUps", id);
  if (!before) return null;
  const updated = store.patch("followUps", id, {
    ...patch,
    sentAt: patch.status === "sent" ? (before.sentAt ?? now()) : patch.sentAt ?? before.sentAt,
    repliedAt: patch.status === "replied" ? (before.repliedAt ?? now()) : patch.repliedAt ?? before.repliedAt,
  });
  if (patch.status && patch.status !== before.status) {
    if (patch.status === "sent") {
      logActivity({
        type: "follow_up_sent",
        entityType: "follow_up",
        entityId: id,
        title: "Follow-up sent",
        meta: { applicationId: before.applicationId },
      });
      if (before.contactId) {
        store.patch("contacts", before.contactId, { lastContactedAt: todayDateOnly() });
      }
    }
    if (patch.status === "replied") {
      logActivity({
        type: "follow_up_replied",
        entityType: "follow_up",
        entityId: id,
        title: "Reply received",
        meta: { applicationId: before.applicationId },
      });
    }
  }
  return updated;
}

export function deleteFollowUp(id: ID): UndoBundle {
  return {
    label: "Follow-up deleted",
    entries: [{ collection: "followUps", records: store.remove("followUps", [id]) }],
  };
}

/* -------------------------------------------------------------------------- */
/* Documents, resumes, cover letters                                           */
/* -------------------------------------------------------------------------- */

export function createResume(input: Partial<Resume> & { name: string }): Resume {
  const sameName = store.getCollection("resumes").filter((r) => r.name === input.name);
  const resume: Resume = {
    ...base(),
    name: input.name.trim(),
    version: input.version ?? sameName.length + 1,
    variant: input.variant ?? "general",
    fileUrl: input.fileUrl ?? null,
    fileName: input.fileName ?? null,
    fileSize: input.fileSize ?? null,
    content: input.content ?? null,
    notes: input.notes ?? null,
    tags: input.tags ?? [],
    isDefault: input.isDefault ?? store.getCollection("resumes").length === 0,
    archived: false,
  };
  return store.insert("resumes", resume);
}

export function updateResume(id: ID, patch: Partial<Resume>) {
  if (patch.isDefault) {
    for (const resume of store.getCollection("resumes")) {
      if (resume.id !== id && resume.isDefault) store.patch("resumes", resume.id, { isDefault: false });
    }
  }
  return store.patch("resumes", id, patch);
}

export function deleteResume(id: ID): UndoBundle {
  const resume = store.find("resumes", id);
  return store.batch(() => {
    for (const application of store.getCollection("applications")) {
      if (application.resumeId === id) store.patch("applications", application.id, { resumeId: null });
    }
    return {
      label: resume ? `${resume.name} deleted` : "Resume deleted",
      entries: [{ collection: "resumes", records: store.remove("resumes", [id]) }],
    };
  });
}

export function createCoverLetter(input: Partial<CoverLetter> & { name: string }): CoverLetter {
  const letter: CoverLetter = {
    ...base(),
    name: input.name.trim(),
    version: input.version ?? 1,
    isTemplate: input.isTemplate ?? false,
    companyId: input.companyId ?? null,
    applicationId: input.applicationId ?? null,
    position: input.position ?? null,
    content: input.content ?? "",
    notes: input.notes ?? null,
    archived: false,
  };
  return store.insert("coverLetters", letter);
}

export function updateCoverLetter(id: ID, patch: Partial<CoverLetter>) {
  return store.patch("coverLetters", id, patch);
}

export function deleteCoverLetter(id: ID): UndoBundle {
  const letter = store.find("coverLetters", id);
  return store.batch(() => {
    for (const application of store.getCollection("applications")) {
      if (application.coverLetterId === id) {
        store.patch("applications", application.id, { coverLetterId: null });
      }
    }
    return {
      label: letter ? `${letter.name} deleted` : "Cover letter deleted",
      entries: [{ collection: "coverLetters", records: store.remove("coverLetters", [id]) }],
    };
  });
}

export function createDocument(input: Partial<DocumentRecord> & { name: string }): DocumentRecord {
  const document: DocumentRecord = {
    ...base(),
    name: input.name.trim(),
    type: input.type ?? "other",
    url: input.url ?? null,
    fileName: input.fileName ?? null,
    mimeType: input.mimeType ?? null,
    sizeBytes: input.sizeBytes ?? null,
    storagePath: input.storagePath ?? null,
    applicationIds: input.applicationIds ?? [],
    notes: input.notes ?? null,
    tags: input.tags ?? [],
  };
  return store.insert("documents", document);
}

export function updateDocument(id: ID, patch: Partial<DocumentRecord>) {
  return store.patch("documents", id, patch);
}

export function deleteDocument(id: ID): UndoBundle {
  const document = store.find("documents", id);
  return {
    label: document ? `${document.name} deleted` : "Document deleted",
    entries: [{ collection: "documents", records: store.remove("documents", [id]) }],
  };
}

export function attachDocumentToApplication(documentId: ID, applicationId: ID) {
  return store.batch(() => {
    const document = store.find("documents", documentId);
    const application = store.find("applications", applicationId);
    if (!document || !application) return null;
    if (!document.applicationIds.includes(applicationId)) {
      store.patch("documents", documentId, {
        applicationIds: [...document.applicationIds, applicationId],
      });
    }
    if (!application.documentIds.includes(documentId)) {
      store.patch("applications", applicationId, {
        documentIds: [...application.documentIds, documentId],
      });
    }
    logActivity({
      type: "document_attached",
      entityType: "application",
      entityId: applicationId,
      title: `Attached ${document.name}`,
    });
    return document;
  });
}

export function detachDocumentFromApplication(documentId: ID, applicationId: ID) {
  return store.batch(() => {
    const document = store.find("documents", documentId);
    const application = store.find("applications", applicationId);
    if (document) {
      store.patch("documents", documentId, {
        applicationIds: document.applicationIds.filter((a) => a !== applicationId),
      });
    }
    if (application) {
      store.patch("applications", applicationId, {
        documentIds: application.documentIds.filter((d) => d !== documentId),
      });
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Notes, goals, stories, events                                               */
/* -------------------------------------------------------------------------- */

export function createNote(input: Partial<Note> & { entityType: EntityType; entityId: ID; body: string }): Note {
  const note: Note = {
    ...base(),
    entityType: input.entityType,
    entityId: input.entityId,
    body: input.body,
    pinned: input.pinned ?? false,
  };
  store.insert("notes", note);
  logActivity({
    type: "note_added",
    entityType: input.entityType,
    entityId: input.entityId,
    title: "Note added",
  });
  return note;
}

export function updateNote(id: ID, patch: Partial<Note>) {
  return store.patch("notes", id, patch);
}

export function deleteNote(id: ID): UndoBundle {
  return {
    label: "Note deleted",
    entries: [{ collection: "notes", records: store.remove("notes", [id]) }],
  };
}

export function createGoal(input: Partial<Goal> & { type: Goal["type"]; target: number }): Goal {
  const goal: Goal = {
    ...base(),
    type: input.type,
    label: input.label ?? "",
    target: input.target,
    period: input.period ?? "week",
    unit: input.unit ?? null,
    manualProgress: input.manualProgress ?? null,
    notes: input.notes ?? null,
    active: input.active ?? true,
  };
  store.insert("goals", goal);
  logActivity({
    type: "goal_created",
    entityType: "goal",
    entityId: goal.id,
    title: `Goal: ${goal.label || goal.type}`,
  });
  return goal;
}

export function updateGoal(id: ID, patch: Partial<Goal>) {
  return store.patch("goals", id, patch);
}

export function deleteGoal(id: ID): UndoBundle {
  return {
    label: "Goal deleted",
    entries: [{ collection: "goals", records: store.remove("goals", [id]) }],
  };
}

export function createStory(input: Partial<StarStory> & { title: string }): StarStory {
  const story: StarStory = {
    ...base(),
    title: input.title.trim(),
    body: input.body ?? "",
    situation: input.situation ?? "",
    task: input.task ?? "",
    action: input.action ?? "",
    result: input.result ?? "",
    competencies: input.competencies ?? [],
    tags: input.tags ?? [],
    durationSeconds: input.durationSeconds ?? null,
    favorite: input.favorite ?? false,
  };
  return store.insert("stories", story);
}

export function updateStory(id: ID, patch: Partial<StarStory>) {
  return store.patch("stories", id, patch);
}

export function deleteStory(id: ID): UndoBundle {
  const story = store.find("stories", id);
  return {
    label: story ? `"${story.title}" deleted` : "Story deleted",
    entries: [{ collection: "stories", records: store.remove("stories", [id]) }],
  };
}

export function createEvent(
  input: Partial<CalendarEventRecord> & { title: string; startAt: string },
): CalendarEventRecord {
  const event: CalendarEventRecord = {
    ...base(),
    title: input.title.trim(),
    type: input.type ?? "custom",
    startAt: input.startAt,
    endAt: input.endAt ?? null,
    allDay: input.allDay ?? false,
    relatedType: input.relatedType ?? null,
    relatedId: input.relatedId ?? null,
    location: input.location ?? null,
    url: input.url ?? null,
    notes: input.notes ?? null,
  };
  return store.insert("events", event);
}

export function updateEvent(id: ID, patch: Partial<CalendarEventRecord>) {
  return store.patch("events", id, patch);
}

export function deleteEvent(id: ID): UndoBundle {
  return {
    label: "Event deleted",
    entries: [{ collection: "events", records: store.remove("events", [id]) }],
  };
}

/* -------------------------------------------------------------------------- */
/* Bulk operations                                                             */
/* -------------------------------------------------------------------------- */

export function bulkSetStatus(ids: ID[], status: ApplicationStatus) {
  store.batch(() => {
    for (const id of ids) setApplicationStatus(id, status);
  });
}

export function bulkSetPriority(ids: ID[], priority: Priority) {
  store.batch(() => {
    for (const id of ids) updateApplication(id, { priority });
  });
}

export function bulkAddTag(ids: ID[], tag: string) {
  store.batch(() => {
    for (const id of ids) {
      const application = store.find("applications", id);
      if (application && !application.tags.includes(tag)) {
        store.patch("applications", id, { tags: [...application.tags, tag] });
      }
    }
  });
}

export const activeApplications = (applications: Application[]) =>
  applications.filter((a) => !a.archived && ACTIVE_STATUSES.includes(a.status));
