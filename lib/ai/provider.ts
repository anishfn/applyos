import type { Application, Company, Contact, Interview, Job, Resume } from "@/lib/types";
import type { ParsedJob } from "@/lib/job-url";

/**
 * The AI layer.
 *
 * Nothing here is wired to a model, and ApplyOS is fully functional without it.
 * The point of this file is that every AI feature has one narrow, typed entry
 * point, so adding a provider is a matter of implementing this interface and
 * registering it, no feature code changes, no keys required to run the app.
 *
 * Design rules:
 *   1. Every method is optional. The UI must check for it and degrade quietly.
 *   2. Every method returns plain data the app already models, never markup,
 *      never a chat transcript.
 *   3. Nothing here is on a hot path. AI is an accelerator, not a dependency.
 */

export interface JobDescriptionSummary {
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  keywords: string[];
  salary?: { min?: number; max?: number; currency?: string } | null;
  experienceYears?: number | null;
  /** A two-line human summary for the card. */
  summary: string;
}

export interface ResumeAnalysis {
  /** 0–100, how well this resume answers this job description. */
  matchScore: number;
  strengths: string[];
  gaps: string[];
  /** Concrete rewrite suggestions, most impactful first. */
  suggestions: string[];
  missingKeywords: string[];
}

export interface GeneratedQuestions {
  expected: string[];
  toAsk: string[];
  rationale?: string;
}

export interface AnswerFeedback {
  /** 0–100. */
  score: number;
  strengths: string[];
  improvements: string[];
  /** A tightened version of what the user wrote. */
  rewrite?: string;
}

export type EmailKind = "recruiter_follow_up" | "thank_you" | "networking" | "referral_request";

export interface GeneratedEmail {
  subject: string;
  body: string;
}

export interface CompanyBriefing {
  overview: string;
  products: string;
  competitors: string;
  recentNews: string;
  culture: string;
  /** Sources the model used, so the user can check the claims. */
  sources?: Array<{ title: string; url: string }>;
}

export interface AIProvider {
  readonly id: string;
  readonly label: string;

  /** Pull structure out of a pasted job description. */
  summarizeJobDescription?(input: { text: string; url?: string }): Promise<JobDescriptionSummary>;

  /** Richer than the URL parser: reads the page body rather than the path. */
  parseJobPosting?(input: { html: string; url: string }): Promise<ParsedJob & { description?: string }>;

  /** Score a resume against a specific job description. */
  analyzeResume?(input: {
    resume: Resume;
    jobDescription: string;
    application?: Application;
  }): Promise<ResumeAnalysis>;

  /** Semantic fit, as an alternative to the deterministic scorer. */
  scoreMatch?(input: {
    job: Job;
    company: Company | null;
    profileSummary: string;
  }): Promise<{ score: number; reasoning: string; missingSkills: string[] }>;

  generateInterviewQuestions?(input: {
    interview: Interview;
    company: Company | null;
    jobDescription?: string;
  }): Promise<GeneratedQuestions>;

  critiqueAnswer?(input: { question: string; answer: string }): Promise<AnswerFeedback>;

  generateEmail?(input: {
    kind: EmailKind;
    contact?: Contact | null;
    application?: Application | null;
    company?: Company | null;
    context?: string;
    tone?: "warm" | "direct" | "formal";
  }): Promise<GeneratedEmail>;

  researchCompany?(input: { company: Company; role?: string }): Promise<CompanyBriefing>;
}

/* -------------------------------------------------------------------------- */
/* Registry                                                                    */
/* -------------------------------------------------------------------------- */

let provider: AIProvider | null = null;

/**
 * Register a provider once, at startup.
 *
 * A real implementation should live behind a server route so the API key never
 * reaches the browser, this registry is the seam, not the transport.
 */
export function registerAIProvider(next: AIProvider | null) {
  provider = next;
}

export function getAIProvider(): AIProvider | null {
  return provider;
}

/** Whether a specific capability is available right now. */
export function hasAICapability<K extends keyof AIProvider>(capability: K): boolean {
  const current = getAIProvider();
  return Boolean(current && typeof current[capability] === "function");
}

/**
 * Calls a capability if it exists, and returns `null` if it doesn't or if it
 * fails. Callers render the AI affordance only when this resolves.
 */
export async function tryAI<T>(run: (ai: AIProvider) => Promise<T> | undefined): Promise<T | null> {
  const current = getAIProvider();
  if (!current) return null;
  try {
    const result = await run(current);
    return result ?? null;
  } catch {
    return null;
  }
}
