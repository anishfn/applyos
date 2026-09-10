import type { ApplicationStatus } from "@/lib/types";

/**
 * Email integration architecture.
 *
 * No provider code lives here on purpose. Gmail, Outlook, IMAP and a paste-it-in
 * textarea all reduce to `NormalizedMessage`, and everything downstream works
 * from that, so adding a provider means writing one adapter, and the matching
 * and classification logic below is shared and testable without any of them.
 *
 * Nothing is auto-applied. `classifyMessage` proposes; the user confirms.
 */

export interface NormalizedMessage {
  id: string;
  threadId?: string;
  from: { name?: string; email: string };
  to: string[];
  subject: string;
  /** Plain text, adapters strip markup before handing it over. */
  body: string;
  receivedAt: string;
}

/** What a mail provider must implement. Deliberately tiny. */
export interface EmailAdapter {
  readonly id: string;
  readonly label: string;
  /** Messages since a cursor, newest last. */
  fetchSince(cursor: string | null, limit: number): Promise<{ messages: NormalizedMessage[]; cursor: string }>;
}

export type ProposalKind =
  | "application_confirmed"
  | "interview_invitation"
  | "rejection"
  | "offer"
  | "recruiter_outreach"
  | "reply_received";

export interface MessageProposal {
  kind: ProposalKind;
  confidence: number;
  /** Suggested status change, when the message implies one. */
  status?: ApplicationStatus;
  /** Best guess at the company, from the sender's domain or the subject. */
  companyHint?: string;
  /** Best guess at the role, from the subject line. */
  positionHint?: string;
  summary: string;
}

const PATTERNS: Array<{
  kind: ProposalKind;
  status?: ApplicationStatus;
  weight: number;
  test: RegExp;
}> = [
  { kind: "application_confirmed", status: "applied", weight: 0.8, test: /\b(we(?:'ve| have) received|thanks for applying|application (?:was )?received|successfully submitted)\b/i },
  { kind: "interview_invitation", status: "screening", weight: 0.9, test: /\b(schedule (?:a|an) (?:call|chat|interview)|invite you to interview|book a time|availability for)\b/i },
  { kind: "rejection", status: "rejected", weight: 0.9, test: /\b(not (?:be )?moving forward|decided to (?:move|proceed) with other|unfortunately|will not be progressing|other candidates)\b/i },
  { kind: "offer", status: "offer", weight: 0.95, test: /\b(pleased to offer|offer letter|extend an offer|formal offer)\b/i },
  { kind: "recruiter_outreach", status: "recruiter_contacted", weight: 0.7, test: /\b(came across your (?:profile|github)|reaching out about|opportunity at|would you be open to)\b/i },
];

const GENERIC_DOMAINS = new Set([
  "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me",
  "greenhouse.io", "lever.co", "ashbyhq.com", "workable.com", "myworkday.com",
  "smartrecruiters.com", "linkedin.com", "indeed.com",
]);

/**
 * Classifies a message into a proposed action.
 *
 * Pure and provider-agnostic, the same function serves a Gmail sync, an
 * Outlook sync, or a "paste the email here" box.
 */
export function classifyMessage(message: NormalizedMessage): MessageProposal | null {
  const haystack = `${message.subject}\n${message.body.slice(0, 4000)}`;

  let best: (typeof PATTERNS)[number] | null = null;
  for (const pattern of PATTERNS) {
    if (!pattern.test.test(haystack)) continue;
    if (!best || pattern.weight > best.weight) best = pattern;
  }
  if (!best) return null;

  return {
    kind: best.kind,
    status: best.status,
    confidence: best.weight,
    companyHint: companyFromSender(message.from.email),
    positionHint: positionFromSubject(message.subject),
    summary: message.subject.slice(0, 160),
  };
}

/** The sender's domain is the company, unless it's a mail host or an ATS. */
export function companyFromSender(email: string): string | undefined {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return undefined;
  const base = domain.replace(/^(mail|email|no-?reply|notifications?|jobs|careers|talent)\./, "");
  if (GENERIC_DOMAINS.has(base)) return undefined;
  const name = base.split(".")[0];
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : undefined;
}

/** Pulls a role out of subjects like "Your application for Senior Engineer at Acme". */
export function positionFromSubject(subject: string): string | undefined {
  const patterns = [
    /application (?:for|to)[:\s]+([^—\-|,(]+)/i,
    /(?:role|position) (?:of|as)[:\s]+([^—\-|,(]+)/i,
    /interview (?:for|with).*?(?:for|as)[:\s]+([^—\-|,(]+)/i,
  ];
  for (const pattern of patterns) {
    const match = subject.match(pattern);
    const captured = match?.[1]?.trim();
    if (captured && captured.length > 2 && captured.length < 80) return captured.replace(/\s+at\s+.*$/i, "").trim();
  }
  return undefined;
}
