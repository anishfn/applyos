import { STATUS_CONFIG } from "./constants";
import { store } from "./data/store";
import { formatSalaryFull } from "./format";
import type { CollectionName, Database } from "./types";

/**
 * Data export.
 *
 * Everything the app holds is exportable as JSON (lossless, re-importable) or
 * CSV (spreadsheet-friendly, flattened). No lock-in: an export plus the schema
 * in `supabase/migrations` is enough to rebuild a workspace anywhere.
 */

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportJSON(collection: CollectionName) {
  const rows = store.getCollection(collection);
  download(`applyos-${collection}-${stamp()}.json`, JSON.stringify(rows, null, 2), "application/json");
}

export function exportEverything() {
  const database = store.getDatabase();
  const payload = {
    application: "ApplyOS",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: database,
  };
  download(`applyos-workspace-${stamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
}

const escapeCell = (value: unknown): string => {
  if (value == null) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCSV(headers: string[], rows: unknown[][]): string {
  return [headers.map(escapeCell).join(","), ...rows.map((row) => row.map(escapeCell).join(","))].join(
    "\n",
  );
}

/** Human-readable CSVs, with ids resolved to names. */
export function exportCSV(collection: CollectionName) {
  const db = store.getDatabase();
  const companyName = (id: string | null | undefined) =>
    db.companies.find((c) => c.id === id)?.name ?? "";
  const contactName = (id: string | null | undefined) =>
    db.contacts.find((c) => c.id === id)?.name ?? "";
  const applicationLabel = (id: string | null | undefined) => {
    const application = db.applications.find((a) => a.id === id);
    return application ? `${application.position} · ${companyName(application.companyId)}` : "";
  };

  let headers: string[] = [];
  let rows: unknown[][] = [];

  switch (collection) {
    case "applications":
      headers = [
        "Company", "Position", "Status", "Priority", "Location", "Work mode", "Employment type",
        "Salary", "Source", "Applied", "Deadline", "Next action", "Next action date",
        "Resume", "Referral", "Tags", "Job URL", "Notes", "Created", "Updated",
      ];
      rows = db.applications.map((a) => [
        companyName(a.companyId), a.position, STATUS_CONFIG[a.status].label, a.priority,
        a.location, a.workMode, a.employmentType, formatSalaryFull(a.salary) ?? "",
        a.source, a.appliedAt, a.deadline, a.nextAction, a.nextActionDate,
        db.resumes.find((r) => r.id === a.resumeId)?.name ?? "",
        a.referral ? "yes" : "no", a.tags.join("; "), a.jobUrl, a.notes, a.createdAt, a.updatedAt,
      ]);
      break;
    case "contacts":
      headers = ["Name", "Company", "Position", "Relationship", "Email", "LinkedIn", "Phone", "Last contacted", "Next follow-up", "Notes"];
      rows = db.contacts.map((c) => [
        c.name, companyName(c.companyId), c.position, c.relationship, c.email, c.linkedin,
        c.phone, c.lastContactedAt, c.nextFollowUpAt, c.notes,
      ]);
      break;
    case "companies":
      headers = ["Name", "Industry", "Size", "Location", "Website", "Careers URL", "Rating", "Applications", "Notes"];
      rows = db.companies.map((c) => [
        c.name, c.industry, c.size, c.location, c.website, c.careersUrl, c.rating,
        db.applications.filter((a) => a.companyId === c.id).length, c.notes,
      ]);
      break;
    case "interviews":
      headers = ["Company", "Position", "Round", "Type", "Status", "Scheduled", "Duration (min)", "Interviewers", "Meeting URL", "Rating", "Feedback"];
      rows = db.interviews.map((i) => [
        companyName(i.companyId), i.position, i.round, i.type, i.status, i.scheduledAt,
        i.durationMinutes, i.interviewerNames.join("; "), i.meetingUrl, i.rating, i.feedback,
      ]);
      break;
    case "tasks":
      headers = ["Title", "Status", "Priority", "Due", "Related", "Description", "Completed"];
      rows = db.tasks.map((t) => [
        t.title, t.status, t.priority, t.dueDate,
        t.relatedType === "application" ? applicationLabel(t.relatedId) : t.relatedType,
        t.description, t.completedAt,
      ]);
      break;
    case "followUps":
      headers = ["Type", "Status", "Due", "Channel", "Contact", "Application", "Subject", "Message", "Sent", "Replied"];
      rows = db.followUps.map((f) => [
        f.type, f.status, f.dueDate, f.channel, contactName(f.contactId),
        applicationLabel(f.applicationId), f.subject, f.message, f.sentAt, f.repliedAt,
      ]);
      break;
    case "jobs":
      headers = ["Title", "Company", "Status", "Location", "Work mode", "Salary", "Deadline", "Skills", "URL", "Saved"];
      rows = db.jobs.map((j) => [
        j.title, companyName(j.companyId), j.status, j.location, j.workMode,
        formatSalaryFull(j.salary) ?? "", j.deadline, j.skills.join("; "), j.url, j.savedAt,
      ]);
      break;
    default: {
      const rowsRaw = db[collection] as unknown as Record<string, unknown>[];
      headers = rowsRaw.length > 0 ? Object.keys(rowsRaw[0]) : [];
      rows = rowsRaw.map((row) => headers.map((header) => row[header]));
    }
  }

  download(`applyos-${collection}-${stamp()}.csv`, toCSV(headers, rows), "text/csv");
}

/** Reads an exported workspace back in. Returns null when the file isn't ours. */
export function parseWorkspaceFile(text: string): Database | null {
  try {
    const parsed = JSON.parse(text) as { application?: string; data?: Database };
    if (parsed.application !== "ApplyOS" || !parsed.data) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
