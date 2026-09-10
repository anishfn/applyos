import { STATUS_RANK } from "@/lib/constants";
import { addDays, toDateOnly } from "@/lib/date";
import { guessDomain } from "@/lib/job-url";
import type {
  Activity,
  ActivityType,
  Application,
  ApplicationStatus,
  CalendarEventRecord,
  Company,
  Contact,
  CoverLetter,
  Database,
  DocumentRecord,
  FollowUp,
  Goal,
  ID,
  Interview,
  Priority,
  Resume,
  Source,
  StarStory,
  Task,
  WorkMode,
} from "@/lib/types";
import { defaultPrep, defaultProfile } from "./actions";
import { emptyDatabase } from "./adapter";
import { newId, store } from "./store";

/**
 * A realistic sample workspace.
 *
 * This exists so the app can be evaluated without an hour of data entry, and so
 * screenshots aren't empty. It writes real rows through the normal persistence
 * path, there is no separate "demo mode" anywhere in the UI, and Settings can
 * wipe it in one click.
 */

/** Small deterministic PRNG, so the demo looks the same each time it's loaded. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const random = makeRandom(20260421);
const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
const between = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
const chance = (probability: number) => random() < probability;

const daysAgo = (days: number, hour = 10, minute = 0) => {
  const date = addDays(new Date(), -days);
  date.setHours(hour, minute, 0, 0);
  // Setting an hour can push "0 days ago" into the future; step back a day if so.
  if (date.getTime() > Date.now()) date.setDate(date.getDate() - 1);
  return date;
};

const iso = (date: Date) => date.toISOString();

const COMPANIES: Array<{
  name: string;
  industry: string;
  size: Company["size"];
  location: string;
  rating: number;
}> = [
  { name: "Linear", industry: "Developer tools", size: "51-200", location: "Remote", rating: 5 },
  { name: "Stripe", industry: "Fintech", size: "5000+", location: "San Francisco, CA", rating: 4.5 },
  { name: "Vercel", industry: "Developer tools", size: "201-500", location: "Remote", rating: 4.5 },
  { name: "Figma", industry: "Design software", size: "1001-5000", location: "San Francisco, CA", rating: 4.5 },
  { name: "Supabase", industry: "Developer tools", size: "51-200", location: "Remote", rating: 5 },
  { name: "Ramp", industry: "Fintech", size: "501-1000", location: "New York, NY", rating: 4 },
  { name: "Notion", industry: "Productivity", size: "501-1000", location: "San Francisco, CA", rating: 4 },
  { name: "Anthropic", industry: "AI research", size: "501-1000", location: "San Francisco, CA", rating: 5 },
  { name: "Cloudflare", industry: "Infrastructure", size: "1001-5000", location: "Austin, TX", rating: 4 },
  { name: "Retool", industry: "Developer tools", size: "201-500", location: "San Francisco, CA", rating: 4 },
  { name: "Datadog", industry: "Observability", size: "5000+", location: "New York, NY", rating: 4 },
  { name: "PlanetScale", industry: "Databases", size: "51-200", location: "Remote", rating: 4.5 },
  { name: "Render", industry: "Cloud platform", size: "51-200", location: "Remote", rating: 4 },
  { name: "Sentry", industry: "Developer tools", size: "201-500", location: "San Francisco, CA", rating: 4.5 },
];

const ROLES = [
  "Senior Product Engineer",
  "Staff Frontend Engineer",
  "Full-stack Engineer",
  "Senior Software Engineer, Platform",
  "Frontend Engineer",
  "Product Engineer",
  "Senior Backend Engineer",
  "Software Engineer, Infrastructure",
  "Senior Full-stack Engineer",
  "Design Engineer",
  "Staff Software Engineer",
  "Backend Engineer, Payments",
];

const LOCATIONS = [
  "Remote · US",
  "Remote · EU",
  "San Francisco, CA",
  "New York, NY",
  "London, UK",
  "Berlin, DE",
  "Austin, TX",
];

const SOURCES: Source[] = [
  "linkedin",
  "company_site",
  "referral",
  "recruiter",
  "wellfound",
  "hacker_news",
  "job_board",
];

const WORK_MODES: WorkMode[] = ["remote", "hybrid", "onsite"];
const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

/** Where each application ends up, and how long ago it was submitted. */
const PIPELINE: Array<{ status: ApplicationStatus; ageDays: number }> = [
  { status: "accepted", ageDays: 68 },
  { status: "offer", ageDays: 41 },
  { status: "final_round", ageDays: 33 },
  { status: "interview", ageDays: 27 },
  { status: "interview", ageDays: 22 },
  { status: "assessment", ageDays: 19 },
  { status: "screening", ageDays: 16 },
  { status: "screening", ageDays: 12 },
  { status: "recruiter_contacted", ageDays: 9 },
  { status: "viewed", ageDays: 8 },
  { status: "applied", ageDays: 34 },
  { status: "applied", ageDays: 21 },
  { status: "applied", ageDays: 11 },
  { status: "applied", ageDays: 6 },
  { status: "applied", ageDays: 4 },
  { status: "applied", ageDays: 2 },
  { status: "rejected", ageDays: 58 },
  { status: "rejected", ageDays: 44 },
  { status: "rejected", ageDays: 30 },
  { status: "rejected", ageDays: 17 },
  { status: "ghosted", ageDays: 62 },
  { status: "ghosted", ageDays: 47 },
  { status: "withdrawn", ageDays: 39 },
  { status: "preparing", ageDays: 1 },
  { status: "preparing", ageDays: 0 },
  { status: "wishlist", ageDays: 3 },
  { status: "wishlist", ageDays: 1 },
];

const CONTACTS: Array<{
  name: string;
  position: string;
  relationship: Contact["relationship"];
  companyIndex: number;
}> = [
  { name: "Priya Raman", position: "Technical Recruiter", relationship: "recruiter", companyIndex: 1 },
  { name: "Sam Okafor", position: "Engineering Manager", relationship: "hiring_manager", companyIndex: 0 },
  { name: "Dana Whitfield", position: "Staff Engineer", relationship: "referral", companyIndex: 2 },
  { name: "Marcus Lee", position: "Head of Talent", relationship: "recruiter", companyIndex: 4 },
  { name: "Yuki Tanaka", position: "Senior Engineer", relationship: "alumni", companyIndex: 3 },
  { name: "Elena Vasquez", position: "Director of Engineering", relationship: "hiring_manager", companyIndex: 7 },
  { name: "Tom Brennan", position: "Product Engineer", relationship: "friend", companyIndex: 5 },
  { name: "Aisha Bello", position: "Recruiting Lead", relationship: "recruiter", companyIndex: 9 },
];

/**
 * Seeded entries carry the four STAR fields because that is what the demo prose
 * was written as; `body` is composed from them so every sample entry opens as a
 * normal markdown document.
 */
const composeBody = (story: {
  situation: string;
  task: string;
  action: string;
  result: string;
}) =>
  [story.situation, story.task, story.action, `**How it landed:** ${story.result}`]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");

const STORIES: Array<Omit<StarStory, keyof Pick<StarStory, "id" | "createdAt" | "updatedAt" | "body">>> = [
  {
    title: "Rescued the migration nobody owned",
    situation:
      "Our Postgres upgrade had stalled for two quarters. Three teams depended on it and each assumed another owned it.",
    task: "I volunteered to own the migration end to end without any formal authority over the teams involved.",
    action:
      "Mapped every blocking query, wrote a shadow-read harness so we could compare results in production, and ran a weekly 20-minute sync that only covered blockers.",
    result:
      "Shipped in seven weeks with zero downtime and cut p99 read latency by 38%. The sync format got adopted by two other teams.",
    competencies: ["ownership", "leadership", "ambiguity"],
    tags: ["infrastructure"],
    durationSeconds: 150,
    favorite: true,
  },
  {
    title: "The launch I shipped too early",
    situation:
      "I pushed a checkout redesign live behind a flag at 5%, two days before a holiday freeze, because I wanted the metrics before the break.",
    task: "I owned the rollout decision and the on-call rotation over the freeze.",
    action:
      "A currency-rounding bug hit international customers. I rolled back within 20 minutes, wrote the incident report myself, and added a pre-launch checklist item for non-USD test coverage.",
    result:
      "Eleven affected orders, all refunded manually within a day. The checklist caught two similar bugs in the following quarter.",
    competencies: ["failure", "ownership", "communication"],
    tags: ["incident"],
    durationSeconds: 120,
    favorite: false,
  },
  {
    title: "Disagreeing with a staff engineer about the rewrite",
    situation:
      "A staff engineer proposed rewriting our reporting service in a new language. I thought the real problem was the query layer.",
    task: "I needed to make the case without turning it into a status fight.",
    action:
      "Spent a day instrumenting the existing service and brought profiles to the design review instead of opinions. Proposed a two-week spike to test both.",
    result:
      "The spike showed 80% of latency was one N+1 query. We fixed it in four days, skipped the rewrite, and he later asked me to co-author the perf guidelines.",
    competencies: ["conflict", "problem_solving", "communication"],
    tags: ["technical"],
    durationSeconds: 135,
    favorite: true,
  },
  {
    title: "Bringing a struggling engineer up to speed",
    situation:
      "A mid-level engineer on my team had been stuck on the same feature for three sprints and had stopped asking questions in standup.",
    task: "I picked up mentoring informally, she wasn't my report.",
    action:
      "Paired twice a week on her actual tickets rather than reviewing after the fact, and split the feature into pieces small enough to finish in a day.",
    result:
      "She shipped the feature in two weeks and led the follow-up project the next quarter. She's now the go-to reviewer for that service.",
    competencies: ["mentorship", "teamwork"],
    tags: ["people"],
    durationSeconds: 110,
    favorite: false,
  },
  {
    title: "Cutting build times when nobody asked me to",
    situation: "CI took 24 minutes and everyone had quietly accepted it as the cost of doing business.",
    task: "Nobody owned build performance. I took a Friday to see how bad it really was.",
    action:
      "Profiled the pipeline, found we rebuilt the same Docker layer 11 times, introduced a shared cache and split the test suite by historical runtime.",
    result:
      "24 minutes down to 6. Roughly 90 engineer-hours a week back across the org, measured over the next month.",
    competencies: ["impact", "ownership", "problem_solving"],
    tags: ["infrastructure", "impact"],
    durationSeconds: 100,
    favorite: false,
  },
];

function buildDemoDatabase(existing: Database): Database {
  const db = emptyDatabase();
  db.profiles = existing.profiles.length > 0 ? existing.profiles : [defaultProfile()];

  const stamp = (createdAt: Date, updatedAt = createdAt) => ({
    id: newId(),
    createdAt: iso(createdAt),
    updatedAt: iso(updatedAt),
  });

  const activities: Activity[] = [];
  const logActivity = (
    type: ActivityType,
    entityType: Activity["entityType"],
    entityId: ID,
    title: string,
    occurredAt: Date,
    meta: Record<string, unknown> = {},
  ) => {
    activities.push({
      ...stamp(occurredAt),
      type,
      entityType,
      entityId,
      title,
      description: null,
      meta,
      occurredAt: iso(occurredAt),
    });
  };

  /* Companies ------------------------------------------------------------- */
  const companies: Company[] = COMPANIES.map((entry, index) => ({
    ...stamp(daysAgo(80 - index)),
    name: entry.name,
    domain: guessDomain(entry.name),
    website: `https://${guessDomain(entry.name)}`,
    careersUrl: `https://${guessDomain(entry.name)}/careers`,
    logoUrl: null,
    industry: entry.industry,
    size: entry.size,
    location: entry.location,
    rating: entry.rating,
    notes: null,
    tags: [],
    favorite: index < 3,
  }));
  db.companies = companies;

  /* Resumes --------------------------------------------------------------- */
  const resumes: Resume[] = [
    {
      ...stamp(daysAgo(90), daysAgo(12)),
      name: "Product Engineer",
      version: 4,
      variant: "software_engineer",
      fileUrl: null,
      fileName: "product-engineer-v4.pdf",
      content: null,
      notes: "Leads with shipped product work and impact numbers. Best reply rate so far.",
      tags: ["product", "fullstack"],
      isDefault: true,
      archived: false,
    },
    {
      ...stamp(daysAgo(88), daysAgo(30)),
      name: "Frontend Specialist",
      version: 2,
      variant: "frontend",
      fileUrl: null,
      fileName: "frontend-v2.pdf",
      content: null,
      notes: "Design-systems heavy, for roles that mention craft or accessibility.",
      tags: ["frontend"],
      isDefault: false,
      archived: false,
    },
    {
      ...stamp(daysAgo(86), daysAgo(45)),
      name: "Platform / Infra",
      version: 3,
      variant: "backend",
      fileUrl: null,
      fileName: "platform-v3.pdf",
      content: null,
      notes: "Migration and reliability work up top.",
      tags: ["backend", "infra"],
      isDefault: false,
      archived: false,
    },
    {
      ...stamp(daysAgo(84), daysAgo(60)),
      name: "General",
      version: 1,
      variant: "general",
      fileUrl: null,
      fileName: "general-v1.pdf",
      content: null,
      notes: "The old one. Kept for reference.",
      tags: [],
      isDefault: false,
      archived: false,
    },
  ];
  db.resumes = resumes;

  /* Contacts -------------------------------------------------------------- */
  const contacts: Contact[] = CONTACTS.map((entry, index) => {
    const created = daysAgo(60 - index * 5);
    return {
      ...stamp(created),
      name: entry.name,
      companyId: companies[entry.companyIndex].id,
      position: entry.position,
      email: `${entry.name.split(" ")[0].toLowerCase()}@${companies[entry.companyIndex].domain}`,
      linkedin: `https://linkedin.com/in/${entry.name.toLowerCase().replace(/\s+/g, "-")}`,
      phone: null,
      relationship: entry.relationship,
      source: entry.relationship === "recruiter" ? "linkedin" : "network",
      lastContactedAt: toDateOnly(daysAgo(between(2, 25))),
      nextFollowUpAt: index % 3 === 0 ? toDateOnly(addDays(new Date(), between(-3, 9))) : null,
      notes:
        index === 0
          ? "Moves fast, prefers a short update over a long email. Owns the whole platform loop."
          : null,
      tags: [],
      favorite: index < 2,
    };
  });
  db.contacts = contacts;
  for (const contact of contacts) {
    logActivity(
      "contact_added",
      "contact",
      contact.id,
      `Added ${contact.name}`,
      new Date(contact.createdAt),
    );
  }

  /* Applications ---------------------------------------------------------- */
  const applications: Application[] = [];
  PIPELINE.forEach((entry, index) => {
    const company = companies[index % companies.length];
    const created = daysAgo(entry.ageDays, between(9, 17), between(0, 59));
    const submitted = STATUS_RANK[entry.status] !== 0;
    const isReferral = chance(0.22);
    const lastTouch = daysAgo(Math.max(entry.ageDays - between(1, 8), 0));

    const application: Application = {
      ...stamp(created, lastTouch),
      companyId: company.id,
      position: ROLES[index % ROLES.length],
      jobUrl: `https://${company.domain}/careers/${ROLES[index % ROLES.length].toLowerCase().replace(/[^a-z]+/g, "-")}`,
      location: pick(LOCATIONS),
      workMode: pick(WORK_MODES),
      employmentType: "full_time",
      salary: {
        min: between(13, 18) * 10000,
        max: between(19, 24) * 10000,
        currency: "USD",
        period: "year",
      },
      appliedAt: submitted ? toDateOnly(created) : null,
      deadline: chance(0.25) ? toDateOnly(addDays(new Date(), between(-2, 12))) : null,
      status: entry.status,
      priority: pickPriority(entry.status),
      source: isReferral ? "referral" : pick(SOURCES),
      contactIds: [],
      referral: isReferral,
      referredBy: isReferral ? pick(contacts).name : null,
      notes: null,
      tags: chance(0.4) ? [pick(["dream", "backup", "stretch", "fast-process"])] : [],
      resumeId: pickResume(resumes, entry.status, index),
      coverLetterId: null,
      documentIds: [],
      nextAction: null,
      nextActionDate: null,
      jobId: null,
      description: null,
      archived: false,
    };

    // Next actions on the live ones, some already due.
    if (["applied", "screening", "interview", "final_round", "offer", "recruiter_contacted"].includes(entry.status)) {
      const overdue = index % 4 === 0;
      application.nextAction =
        entry.status === "offer"
          ? "Respond to offer"
          : entry.status === "final_round"
            ? "Send thank-you note"
            : "Follow up with recruiter";
      application.nextActionDate = toDateOnly(addDays(new Date(), overdue ? -between(1, 5) : between(1, 8)));
    }

    applications.push(application);

    logActivity(
      "application_created",
      "application",
      application.id,
      `Added ${application.position} at ${company.name}`,
      created,
    );

    // Walk the application through the stages it must have passed.
    if (submitted) {
      const path = stagePath(entry.status);
      path.forEach((status, step) => {
        const when = daysAgo(Math.max(entry.ageDays - (step + 1) * between(2, 6), 0));
        logActivity(
          status === "offer" ? "offer_received" : "status_changed",
          "application",
          application.id,
          status === "offer"
            ? `Offer from ${company.name}`
            : `${company.name} · moved to ${status.replace(/_/g, " ")}`,
          when,
          { to: status },
        );
      });
    }
  });
  db.applications = applications;

  // Attach recruiters to the applications that got that far.
  for (const contact of contacts) {
    const match = applications.find(
      (application) =>
        application.companyId === contact.companyId &&
        STATUS_RANK[application.status] >= STATUS_RANK.screening,
    );
    if (match && !match.contactIds.includes(contact.id)) match.contactIds.push(contact.id);
  }

  /* Interviews ------------------------------------------------------------ */
  const interviews: Interview[] = [];
  const interviewable = applications.filter(
    (application) => STATUS_RANK[application.status] >= STATUS_RANK.screening,
  );

  const schedule: Array<{ offsetDays: number; type: Interview["type"]; status: Interview["status"] }> = [
    { offsetDays: 0, type: "technical", status: "scheduled" },
    { offsetDays: 1, type: "system_design", status: "scheduled" },
    { offsetDays: 3, type: "manager", status: "scheduled" },
    { offsetDays: 6, type: "final", status: "scheduled" },
    { offsetDays: -2, type: "recruiter_screen", status: "passed" },
    { offsetDays: -5, type: "technical", status: "completed" },
    { offsetDays: -9, type: "behavioral", status: "passed" },
    { offsetDays: -14, type: "recruiter_screen", status: "passed" },
    { offsetDays: -21, type: "technical", status: "failed" },
  ];

  schedule.forEach((entry, index) => {
    const application = interviewable[index % interviewable.length];
    if (!application) return;
    const when = addDays(new Date(), entry.offsetDays);
    when.setHours(between(10, 16), pick([0, 30]), 0, 0);
    const contact = contacts.find((item) => item.companyId === application.companyId);

    interviews.push({
      ...stamp(daysAgo(Math.max(-entry.offsetDays + 3, 1)), daysAgo(Math.max(-entry.offsetDays, 0))),
      applicationId: application.id,
      companyId: application.companyId,
      position: application.position,
      scheduledAt: iso(when),
      durationMinutes: pick([30, 45, 60, 60, 90]),
      type: entry.type,
      interviewerContactIds: contact ? [contact.id] : [],
      interviewerNames: contact ? [] : [pick(["Jordan Ellis", "Nina Kapoor", "Chris Duval"])],
      round: (index % 4) + 1,
      meetingUrl: "https://meet.google.com/demo-link",
      location: null,
      status: entry.status,
      notes:
        entry.type === "system_design"
          ? "45 minutes of design, 15 for questions. They said to expect a rate-limiter or a feed."
          : null,
      feedback:
        entry.status === "passed"
          ? "Went well. They dug into the migration story and asked how I'd scope it differently."
          : entry.status === "failed"
            ? "Ran out of time on the second problem. Should have asked about constraints earlier."
            : null,
      rating: entry.status === "passed" ? between(4, 5) : entry.status === "failed" ? 2 : null,
      prep: {
        ...defaultPrep(),
        ...(entry.offsetDays >= 0 && entry.offsetDays <= 1
          ? {
              companyOverview:
                "Series C, roughly 180 people, engineering is about 60. Product-led, ships weekly.",
              responsibilities:
                "Own a product surface end to end, work directly with design, no separate QA.",
              requiredSkills: "TypeScript, React, Postgres. They care about taste more than breadth.",
              questionsToAsk: [
                { id: newId(), text: "How do you decide what not to build?", done: false },
                { id: newId(), text: "What does the first 90 days look like?", done: false },
                { id: newId(), text: "Where does the team disagree most often?", done: false },
              ],
              expectedQuestions: [
                { id: newId(), text: "Walk me through a system you designed end to end.", done: false },
                { id: newId(), text: "Tell me about a time you disagreed with a technical decision.", done: false },
              ],
            }
          : {}),
      },
    });
  });
  db.interviews = interviews;

  for (const interview of interviews) {
    const company = companies.find((item) => item.id === interview.companyId);
    logActivity(
      "interview_scheduled",
      "interview",
      interview.id,
      `${company?.name ?? "Interview"} · round ${interview.round} scheduled`,
      new Date(interview.createdAt),
      { applicationId: interview.applicationId },
    );
    if (interview.status === "passed" || interview.status === "completed") {
      logActivity(
        "interview_completed",
        "interview",
        interview.id,
        `${company?.name ?? "Interview"} · round ${interview.round} ${interview.status}`,
        new Date(interview.scheduledAt),
        { applicationId: interview.applicationId },
      );
    }
  }

  /* Tasks ----------------------------------------------------------------- */
  const taskSeeds: Array<{ title: string; offset: number; priority: Priority; status: Task["status"] }> = [
    { title: "Write thank-you note to Sam", offset: -2, priority: "high", status: "todo" },
    { title: "Practice two system design problems", offset: 0, priority: "urgent", status: "in_progress" },
    { title: "Update Product Engineer resume with the CI numbers", offset: -1, priority: "medium", status: "todo" },
    { title: "Ask Dana about a referral at Vercel", offset: 1, priority: "high", status: "todo" },
    { title: "Prep questions for the Anthropic manager round", offset: 2, priority: "high", status: "todo" },
    { title: "Review the offer breakdown with someone I trust", offset: 3, priority: "urgent", status: "todo" },
    { title: "Refresh the portfolio case study", offset: 6, priority: "low", status: "todo" },
    { title: "Block two hours for take-home", offset: 4, priority: "medium", status: "todo" },
    { title: "Sent follow-up to Priya", offset: -6, priority: "medium", status: "completed" },
    { title: "Finished Supabase take-home", offset: -9, priority: "high", status: "completed" },
    { title: "Rewrote the STAR story about the migration", offset: -12, priority: "low", status: "completed" },
    { title: "Reach out to two alumni this week", offset: 5, priority: "medium", status: "todo" },
  ];

  const tasks: Task[] = taskSeeds.map((entry, index) => {
    const created = daysAgo(between(3, 20));
    const related = applications[index % Math.min(applications.length, 10)];
    return {
      ...stamp(created),
      title: entry.title,
      description: null,
      dueDate: toDateOnly(addDays(new Date(), entry.offset)),
      priority: entry.priority,
      status: entry.status,
      relatedType: index % 3 === 0 ? "application" : null,
      relatedId: index % 3 === 0 ? related.id : null,
      completedAt: entry.status === "completed" ? iso(daysAgo(Math.abs(entry.offset))) : null,
      tags: [],
    };
  });
  db.tasks = tasks;

  for (const task of tasks) {
    if (task.status === "completed") {
      logActivity(
        "task_completed",
        "task",
        task.id,
        `Completed: ${task.title}`,
        new Date(task.completedAt ?? task.createdAt),
      );
    }
  }

  /* Follow-ups ------------------------------------------------------------ */
  const followUpSeeds: Array<{ offset: number; status: FollowUp["status"]; type: FollowUp["type"] }> = [
    { offset: -6, status: "pending", type: "application" },
    { offset: -3, status: "pending", type: "recruiter" },
    { offset: 0, status: "pending", type: "thank_you" },
    { offset: 2, status: "pending", type: "application" },
    { offset: 5, status: "pending", type: "referral" },
    { offset: -11, status: "sent", type: "application" },
    { offset: -16, status: "replied", type: "recruiter" },
    { offset: -24, status: "no_response", type: "application" },
  ];

  const followUps: FollowUp[] = followUpSeeds.map((entry, index) => {
    const application = applications[(index * 3) % applications.length];
    const contact = contacts[index % contacts.length];
    const created = daysAgo(between(6, 30));
    return {
      ...stamp(created),
      type: entry.type,
      contactId: contact.id,
      applicationId: application.id,
      interviewId: null,
      dueDate: toDateOnly(addDays(new Date(), entry.offset)),
      channel: entry.type === "referral" ? "linkedin" : "email",
      subject: `Following up on ${application.position}`,
      message:
        entry.type === "thank_you"
          ? "Thanks for the time today. The part about how the team scopes work stuck with me. Happy to share more on the migration work if useful."
          : "Hi, just checking in on where things stand. Still very interested, and happy to send anything else that would help.",
      status: entry.status,
      sentAt: entry.status === "pending" ? null : iso(daysAgo(Math.abs(entry.offset))),
      repliedAt: entry.status === "replied" ? iso(daysAgo(Math.abs(entry.offset) - 2)) : null,
    };
  });
  db.followUps = followUps;

  /* Cover letters, documents --------------------------------------------- */
  const coverLetters: CoverLetter[] = [
    {
      ...stamp(daysAgo(70), daysAgo(14)),
      name: "Product-led template",
      version: 3,
      isTemplate: true,
      companyId: null,
      applicationId: null,
      position: null,
      content:
        "Hi {{company}} team,\n\nI've been using {{company}} for two years and the thing I keep coming back to is how little it gets in the way. That's the kind of product I want to build.\n\nMost recently I owned {{highlight}}, which is the closest thing I've done to the {{role}} scope you've described.\n\nWould love to talk.",
      notes: "Opens with a real product observation. Swap the second paragraph per role.",
      archived: false,
    },
    {
      ...stamp(daysAgo(60), daysAgo(22)),
      name: "Infrastructure template",
      version: 2,
      isTemplate: true,
      companyId: null,
      applicationId: null,
      position: null,
      content: "Hi {{company}},\n\nMy last three years have been migrations, reliability and build performance…",
      notes: null,
      archived: false,
    },
  ];
  db.coverLetters = coverLetters;

  const documents: DocumentRecord[] = [
    {
      ...stamp(daysAgo(75)),
      name: "Portfolio: case studies",
      type: "portfolio",
      url: "https://example.com/portfolio",
      fileName: null,
      mimeType: null,
      sizeBytes: null,
      storagePath: null,
      applicationIds: [applications[0].id],
      notes: "Three deep case studies. Send with design-adjacent roles.",
      tags: ["portfolio"],
    },
    {
      ...stamp(daysAgo(64)),
      name: "AWS Solutions Architect",
      type: "certificate",
      url: "https://example.com/cert",
      fileName: null,
      mimeType: null,
      sizeBytes: null,
      storagePath: null,
      applicationIds: [],
      notes: null,
      tags: [],
    },
    {
      ...stamp(daysAgo(50)),
      name: "Reference: Sam Okafor",
      type: "recommendation",
      url: "https://example.com/reference",
      fileName: null,
      mimeType: null,
      sizeBytes: null,
      storagePath: null,
      applicationIds: [],
      notes: "Former manager. Ask before sending.",
      tags: [],
    },
  ];
  db.documents = documents;

  /* Goals ----------------------------------------------------------------- */
  const goals: Goal[] = [
    {
      ...stamp(daysAgo(40)),
      type: "applications",
      label: "Applications per week",
      target: 12,
      period: "week",
      unit: null,
      manualProgress: null,
      notes: "Quality over volume, but not zero.",
      active: true,
    },
    {
      ...stamp(daysAgo(40)),
      type: "interviews",
      label: "Interviews per month",
      target: 6,
      period: "month",
      unit: null,
      manualProgress: null,
      notes: null,
      active: true,
    },
    {
      ...stamp(daysAgo(38)),
      type: "contacts",
      label: "New contacts per week",
      target: 3,
      period: "week",
      unit: null,
      manualProgress: null,
      notes: "Referrals convert best.",
      active: true,
    },
    {
      ...stamp(daysAgo(38)),
      type: "follow_ups",
      label: "Follow-ups per week",
      target: 5,
      period: "week",
      unit: null,
      manualProgress: null,
      notes: null,
      active: true,
    },
    {
      ...stamp(daysAgo(35)),
      type: "target_salary",
      label: "Target base salary",
      target: 210000,
      period: "all_time",
      unit: "USD",
      manualProgress: 195000,
      notes: "Best offer so far.",
      active: true,
    },
  ];
  db.goals = goals;

  /* Stories & events ------------------------------------------------------ */
  db.stories = STORIES.map((story, index) => ({
    ...stamp(daysAgo(70 - index * 6)),
    ...story,
    body: composeBody(story),
  }));

  const events: CalendarEventRecord[] = [
    {
      ...stamp(daysAgo(5)),
      title: "Coffee with Dana about the Vercel referral",
      type: "networking",
      startAt: iso((() => { const d = addDays(new Date(), 2); d.setHours(9, 30, 0, 0); return d; })()),
      endAt: null,
      allDay: false,
      relatedType: "contact",
      relatedId: contacts[2].id,
      location: "Blue Bottle, Hayes Valley",
      url: null,
      notes: "Ask about the platform team's roadmap before asking for the referral.",
    },
    {
      ...stamp(daysAgo(3)),
      title: "Supabase take-home due",
      type: "assessment",
      startAt: iso((() => { const d = addDays(new Date(), 4); d.setHours(17, 0, 0, 0); return d; })()),
      endAt: null,
      allDay: false,
      relatedType: "application",
      relatedId: applications[5].id,
      location: null,
      url: null,
      notes: "Timebox to four hours.",
    },
  ];
  db.events = events;

  db.activities = activities.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  db.tags = [];
  db.notes = [
    {
      ...stamp(daysAgo(9)),
      entityType: "application",
      entityId: applications[3].id,
      body: "Recruiter said the loop is four rounds and they move in about two weeks. Team is six engineers, no dedicated QA, so they want someone comfortable owning quality.",
      pinned: true,
    },
    {
      ...stamp(daysAgo(4)),
      entityType: "application",
      entityId: applications[1].id,
      body: "Offer: $195k base, 0.15% equity over four years, $15k signing. Asked for a week to decide.",
      pinned: true,
    },
  ];

  return db;
}

const pickPriority = (status: ApplicationStatus): Priority => {
  if (status === "offer" || status === "final_round") return "urgent";
  if (STATUS_RANK[status] >= STATUS_RANK.screening) return "high";
  if (STATUS_RANK[status] < 0) return "low";
  return pick(PRIORITIES.slice(0, 3));
};

const pickResume = (resumes: Resume[], status: ApplicationStatus, index: number): ID | null => {
  // Bias the strongest resume toward the applications that went furthest, so
  // the "which resume performs best" insight has something true to find.
  if (STATUS_RANK[status] >= STATUS_RANK.screening) return resumes[index % 2].id;
  return resumes[index % resumes.length].id;
};

/** The stages an application must have passed through to reach `status`. */
function stagePath(status: ApplicationStatus): ApplicationStatus[] {
  const ordered: ApplicationStatus[] = [
    "applied",
    "viewed",
    "screening",
    "assessment",
    "interview",
    "final_round",
    "offer",
    "accepted",
  ];
  if (status === "rejected" || status === "withdrawn" || status === "ghosted") return ["applied"];
  const index = ordered.indexOf(status);
  return index === -1 ? ["applied"] : ordered.slice(0, index + 1);
}

/** Replaces the workspace with the sample data. */
export async function seedDemoWorkspace(): Promise<void> {
  const database = buildDemoDatabase(store.getDatabase());
  await store.replaceAll(database);
}
