import type { CollectionName, Database, ID, RecordOf } from "@/lib/types";
import { COLLECTIONS } from "@/lib/types";

/**
 * Persistence contract for ApplyOS.
 *
 * Two implementations ship with the app:
 *   - `supabase`, a real Postgres database (see `supabase/migrations`)
 *   - `local`, IndexedDB, so a fresh fork runs with zero configuration
 *
 * Both are write-behind: the in-memory store updates first (optimistic), then
 * flushes here. Nothing in the UI ever awaits a round-trip.
 */
export interface DataAdapter {
  readonly kind: "supabase" | "local";
  /** Human-readable description shown in Settings. */
  readonly label: string;
  load(): Promise<Database>;
  upsert<K extends CollectionName>(collection: K, records: RecordOf<K>[]): Promise<void>;
  remove(collection: CollectionName, ids: ID[]): Promise<void>;
  /** Wipe every collection. Used by "reset workspace" and by seeding. */
  clear(): Promise<void>;
}

export const emptyDatabase = (): Database => ({
  companies: [],
  applications: [],
  jobs: [],
  contacts: [],
  interviews: [],
  tasks: [],
  followUps: [],
  resumes: [],
  coverLetters: [],
  documents: [],
  notes: [],
  activities: [],
  goals: [],
  tags: [],
  events: [],
  stories: [],
  profiles: [],
});

export const supabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("your-project")) return null;
  return { url, key };
};

export const hasSupabase = () => supabaseConfig() !== null;

/** Table name for a collection. Camel collections map to snake_case tables. */
export const TABLE_NAMES: Record<CollectionName, string> = {
  companies: "companies",
  applications: "applications",
  jobs: "jobs",
  contacts: "contacts",
  interviews: "interviews",
  tasks: "tasks",
  followUps: "follow_ups",
  resumes: "resumes",
  coverLetters: "cover_letters",
  documents: "documents",
  notes: "notes",
  activities: "activities",
  goals: "goals",
  tags: "tags",
  events: "calendar_events",
  stories: "star_stories",
  profiles: "profiles",
};

export { COLLECTIONS };

let cached: DataAdapter | null = null;

/** Resolves the adapter once per browser session. */
export async function getAdapter(): Promise<DataAdapter> {
  if (cached) return cached;
  if (hasSupabase()) {
    const { createSupabaseAdapter } = await import("./supabase-adapter");
    cached = createSupabaseAdapter();
  } else {
    const { createLocalAdapter } = await import("./local-adapter");
    cached = createLocalAdapter();
  }
  return cached;
}
