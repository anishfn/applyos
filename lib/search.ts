import { formatSmartDate } from "./date";
import type {
  Application,
  ApplicationStatus,
  Company,
  Contact,
  DocumentRecord,
  ID,
  Interview,
  Job,
  Note,
  Resume,
  StarStory,
  Task,
} from "./types";

/**
 * Global search.
 *
 * Ranking is deliberately simple and predictable: a prefix match on the primary
 * field beats a word-boundary match, which beats a substring, and each entity
 * type carries a small bias so a company you typed exactly outranks an
 * application that merely mentions it.
 */

export type SearchKind =
  | "application"
  | "company"
  | "contact"
  | "interview"
  | "task"
  | "job"
  | "document"
  | "resume"
  | "note"
  | "story";

export interface SearchHit {
  id: string;
  kind: SearchKind;
  groupLabel: string;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
  status?: ApplicationStatus;
  companyName?: string;
  domain?: string | null;
  score: number;
}

interface SearchInput {
  applications: Application[];
  companies: Company[];
  contacts: Contact[];
  interviews: Interview[];
  tasks: Task[];
  jobs: Job[];
  documents: DocumentRecord[];
  resumes: Resume[];
  notes: Note[];
  stories: StarStory[];
}

const KIND_BIAS: Record<SearchKind, number> = {
  application: 6,
  company: 5,
  contact: 5,
  interview: 4,
  job: 4,
  task: 3,
  resume: 2,
  document: 2,
  story: 2,
  note: 1,
};

const GROUP_LABEL: Record<SearchKind, string> = {
  application: "Applications",
  company: "Companies",
  contact: "Contacts",
  interview: "Interviews",
  task: "Tasks",
  job: "Saved jobs",
  document: "Documents",
  resume: "Resumes",
  note: "Notes",
  story: "Stories",
};

/** 0 when there's no match; higher is better. */
function scoreField(field: string | null | undefined, query: string, weight: number): number {
  if (!field) return 0;
  const haystack = field.toLowerCase();
  const index = haystack.indexOf(query);
  if (index === -1) return 0;
  if (index === 0) return weight * 3;
  // Word boundary.
  if (/[\s\-_/·]/.test(haystack[index - 1])) return weight * 2;
  return weight;
}

const MAX_PER_GROUP = 6;
const MAX_TOTAL = 40;

export function searchWorkspace(rawQuery: string, input: SearchInput): SearchHit[] {
  const query = rawQuery.trim().toLowerCase();
  if (query.length === 0) return [];

  const companyById = new Map<ID, Company>(input.companies.map((c) => [c.id, c]));
  const applicationById = new Map<ID, Application>(input.applications.map((a) => [a.id, a]));
  const hits: SearchHit[] = [];

  const push = (hit: Omit<SearchHit, "groupLabel" | "score"> & { score: number }) => {
    if (hit.score <= 0) return;
    hits.push({
      ...hit,
      groupLabel: GROUP_LABEL[hit.kind],
      score: hit.score + KIND_BIAS[hit.kind],
    });
  };

  for (const application of input.applications) {
    const company = companyById.get(application.companyId);
    push({
      id: `application-${application.id}`,
      kind: "application",
      title: application.position,
      subtitle: company?.name,
      companyName: company?.name,
      domain: company?.domain,
      status: application.status,
      href: `/app/applications/${application.id}`,
      score:
        scoreField(application.position, query, 10) +
        scoreField(company?.name, query, 8) +
        scoreField(application.location, query, 3) +
        scoreField(application.tags.join(" "), query, 3) +
        scoreField(application.notes, query, 1) +
        scoreField(application.nextAction, query, 2),
    });
  }

  for (const company of input.companies) {
    const count = input.applications.filter((a) => a.companyId === company.id).length;
    push({
      id: `company-${company.id}`,
      kind: "company",
      title: company.name,
      subtitle: [company.industry, company.location].filter(Boolean).join(" · ") || undefined,
      domain: company.domain,
      meta: count > 0 ? `${count} app${count === 1 ? "" : "s"}` : undefined,
      href: `/app/companies/${company.id}`,
      score:
        scoreField(company.name, query, 12) +
        scoreField(company.industry, query, 3) +
        scoreField(company.domain, query, 4) +
        scoreField(company.notes, query, 1),
    });
  }

  for (const contact of input.contacts) {
    const company = contact.companyId ? companyById.get(contact.companyId) : null;
    push({
      id: `contact-${contact.id}`,
      kind: "contact",
      title: contact.name,
      subtitle: [contact.position, company?.name].filter(Boolean).join(" · ") || undefined,
      href: `/app/contacts/${contact.id}`,
      score:
        scoreField(contact.name, query, 12) +
        scoreField(contact.email, query, 6) +
        scoreField(contact.position, query, 4) +
        scoreField(company?.name, query, 4) +
        scoreField(contact.notes, query, 1),
    });
  }

  for (const interview of input.interviews) {
    const company = companyById.get(interview.companyId);
    push({
      id: `interview-${interview.id}`,
      kind: "interview",
      title: `${company?.name ?? "Interview"} · round ${interview.round}`,
      subtitle: interview.position,
      companyName: company?.name,
      domain: company?.domain,
      meta: formatSmartDate(interview.scheduledAt),
      href: `/app/interviews/${interview.id}`,
      score:
        scoreField(company?.name, query, 9) +
        scoreField(interview.position, query, 7) +
        scoreField(interview.interviewerNames.join(" "), query, 5) +
        scoreField(interview.notes, query, 1),
    });
  }

  for (const job of input.jobs) {
    if (job.status !== "saved") continue;
    const company = companyById.get(job.companyId);
    push({
      id: `job-${job.id}`,
      kind: "job",
      title: job.title,
      subtitle: company?.name,
      companyName: company?.name,
      domain: company?.domain,
      href: `/app/jobs?job=${job.id}`,
      score:
        scoreField(job.title, query, 10) +
        scoreField(company?.name, query, 7) +
        scoreField(job.skills.join(" "), query, 4) +
        scoreField(job.location, query, 2),
    });
  }

  for (const task of input.tasks) {
    push({
      id: `task-${task.id}`,
      kind: "task",
      title: task.title,
      subtitle: task.description ?? undefined,
      meta: task.dueDate ? formatSmartDate(task.dueDate) : undefined,
      href: `/app/tasks?task=${task.id}`,
      score: scoreField(task.title, query, 9) + scoreField(task.description, query, 3),
    });
  }

  for (const resume of input.resumes) {
    push({
      id: `resume-${resume.id}`,
      kind: "resume",
      title: `${resume.name} v${resume.version}`,
      subtitle: resume.notes ?? undefined,
      href: `/app/resumes?resume=${resume.id}`,
      score: scoreField(resume.name, query, 9) + scoreField(resume.tags.join(" "), query, 3),
    });
  }

  for (const document of input.documents) {
    push({
      id: `document-${document.id}`,
      kind: "document",
      title: document.name,
      subtitle: document.fileName ?? undefined,
      href: `/app/documents?document=${document.id}`,
      score: scoreField(document.name, query, 9) + scoreField(document.tags.join(" "), query, 3),
    });
  }

  for (const story of input.stories) {
    push({
      id: `story-${story.id}`,
      kind: "story",
      title: story.title,
      subtitle: story.situation.slice(0, 80) || undefined,
      href: `/app/stories?story=${story.id}`,
      score:
        scoreField(story.title, query, 9) +
        scoreField(story.situation, query, 2) +
        scoreField(story.result, query, 2) +
        scoreField(story.competencies.join(" "), query, 3),
    });
  }

  for (const note of input.notes) {
    const application =
      note.entityType === "application" ? applicationById.get(note.entityId) : null;
    push({
      id: `note-${note.id}`,
      kind: "note",
      title: note.body.slice(0, 70).replace(/\s+/g, " "),
      subtitle: application
        ? `${application.position} · ${companyById.get(application.companyId)?.name ?? ""}`
        : "Note",
      href: application ? `/app/applications/${application.id}` : "/app",
      score: scoreField(note.body, query, 5),
    });
  }

  hits.sort((a, b) => b.score - a.score);

  // Cap each group so one noisy type can't crowd out the rest.
  const perGroup = new Map<string, number>();
  const result: SearchHit[] = [];
  for (const hit of hits) {
    const count = perGroup.get(hit.groupLabel) ?? 0;
    if (count >= MAX_PER_GROUP) continue;
    perGroup.set(hit.groupLabel, count + 1);
    result.push(hit);
    if (result.length >= MAX_TOTAL) break;
  }
  return result;
}
