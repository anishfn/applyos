import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CollectionName, Database, ID, RecordOf } from "@/lib/types";
import { COLLECTIONS } from "@/lib/types";
import { emptyDatabase, supabaseConfig, TABLE_NAMES, type DataAdapter } from "./adapter";

/**
 * Supabase persistence.
 *
 * Models are camelCase in TypeScript and snake_case in Postgres; the conversion
 * is generic so adding a field to a model needs only a migration, never a
 * hand-written mapper.
 */

const toSnake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

type Row = Record<string, unknown>;

function rowFromRecord(record: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(record)) out[toSnake(key)] = value;
  return out;
}

function recordFromRow(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) out[toCamel(key)] = value;
  return out;
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is not configured");
  client = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  });
  return client;
}

const PAGE_SIZE = 1000;

export function createSupabaseAdapter(): DataAdapter {
  const supabase = getSupabaseClient();

  async function loadTable(collection: CollectionName): Promise<Row[]> {
    const table = TABLE_NAMES[collection];
    const rows: Row[] = [];
    for (let page = 0; ; page += 1) {
      const from = page * PAGE_SIZE;
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
      const batch = (data ?? []) as Row[];
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }
    return rows.map(recordFromRow);
  }

  return {
    kind: "supabase",
    label: "Supabase (Postgres)",

    async load(): Promise<Database> {
      const result = emptyDatabase();
      const loaded = await Promise.all(
        COLLECTIONS.map(async (name) => [name, await loadTable(name)] as const),
      );
      for (const [name, rows] of loaded) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)[name] = rows;
      }
      return result;
    },

    async upsert<K extends CollectionName>(collection: K, records: RecordOf<K>[]) {
      if (records.length === 0) return;
      const table = TABLE_NAMES[collection];
      const payload = records.map((record) => rowFromRecord(record as unknown as Row));
      for (let i = 0; i < payload.length; i += 500) {
        const { error } = await supabase
          .from(table)
          .upsert(payload.slice(i, i + 500), { onConflict: "id" });
        if (error) throw new Error(`Failed to save ${table}: ${error.message}`);
      }
    },

    async remove(collection: CollectionName, ids: ID[]) {
      if (ids.length === 0) return;
      const table = TABLE_NAMES[collection];
      const { error } = await supabase.from(table).delete().in("id", ids);
      if (error) throw new Error(`Failed to delete from ${table}: ${error.message}`);
    },

    async clear() {
      // Reverse order so child rows go before the parents they reference.
      for (const collection of [...COLLECTIONS].reverse()) {
        const table = TABLE_NAMES[collection];
        const { error } = await supabase
          .from(table)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
      }
    },
  };
}
