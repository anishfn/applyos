import type { BaseRecord, CollectionName, Database, ID, RecordOf } from "@/lib/types";
import { COLLECTIONS } from "@/lib/types";
import { emptyDatabase, getAdapter, type DataAdapter } from "./adapter";

/**
 * The in-memory workspace.
 *
 * Everything the UI renders reads from here, which is why navigation and
 * inline edits are instant: a mutation updates memory and notifies subscribers
 * synchronously, then flushes to the adapter in the background. A single user's
 * job search fits comfortably in memory, tens of thousands of rows, so we
 * trade a one-time load for zero per-interaction latency.
 */

export type StoreStatus = "idle" | "loading" | "ready" | "error";

export interface StoreSnapshot {
  status: StoreStatus;
  error: string | null;
  adapter: DataAdapter["kind"] | null;
  adapterLabel: string;
  /** Increments on every persisted flush; used by the sync indicator. */
  saving: boolean;
}

export const newId = (): ID =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const now = (): string => new Date().toISOString();

const FLUSH_DELAY = 140;

type AnyRecord = BaseRecord & Record<string, unknown>;

class ApplyStore {
  private db: Database = emptyDatabase();
  private listeners = new Set<() => void>();
  private adapter: DataAdapter | null = null;
  private initPromise: Promise<void> | null = null;

  private pendingUpserts = new Map<CollectionName, Map<ID, AnyRecord>>();
  private pendingDeletes = new Map<CollectionName, Set<ID>>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = 0;
  private batchDepth = 0;
  private dirty = false;

  private snapshot: StoreSnapshot = {
    status: "idle",
    error: null,
    adapter: null,
    adapterLabel: "",
    saving: false,
  };

  private serverSnapshot: StoreSnapshot = { ...this.snapshot };
  private serverDb: Database = emptyDatabase();

  /* ---------------------------------------------------------------- */
  /* Subscription                                                      */
  /* ---------------------------------------------------------------- */

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getCollection = <K extends CollectionName>(collection: K): Database[K] => this.db[collection];

  getServerCollection = <K extends CollectionName>(collection: K): Database[K] =>
    this.serverDb[collection];

  getSnapshot = (): StoreSnapshot => this.snapshot;

  getServerSnapshot = (): StoreSnapshot => this.serverSnapshot;

  getDatabase = (): Database => this.db;

  private emit() {
    if (this.batchDepth > 0) {
      this.dirty = true;
      return;
    }
    for (const listener of this.listeners) listener();
  }

  private setSnapshot(patch: Partial<StoreSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  /* ---------------------------------------------------------------- */
  /* Lifecycle                                                         */
  /* ---------------------------------------------------------------- */

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      this.setSnapshot({ status: "loading" });
      try {
        const adapter = await getAdapter();
        this.adapter = adapter;
        const data = await adapter.load();
        this.db = data;
        this.setSnapshot({
          status: "ready",
          error: null,
          adapter: adapter.kind,
          adapterLabel: adapter.label,
        });
      } catch (error) {
        this.setSnapshot({
          status: "error",
          error: error instanceof Error ? error.message : "Failed to load workspace",
        });
      }
    })();
    return this.initPromise;
  }

  async reload() {
    if (!this.adapter) return this.init();
    this.db = await this.adapter.load();
    this.emit();
  }

  /* ---------------------------------------------------------------- */
  /* Reads                                                             */
  /* ---------------------------------------------------------------- */

  find<K extends CollectionName>(collection: K, id: ID | null | undefined): RecordOf<K> | null {
    if (!id) return null;
    const rows = this.db[collection] as RecordOf<K>[];
    return rows.find((row) => row.id === id) ?? null;
  }

  /* ---------------------------------------------------------------- */
  /* Writes                                                            */
  /* ---------------------------------------------------------------- */

  /** Groups several mutations into one notification and one flush. */
  batch<T>(fn: () => T): T {
    this.batchDepth += 1;
    try {
      return fn();
    } finally {
      this.batchDepth -= 1;
      if (this.batchDepth === 0 && this.dirty) {
        this.dirty = false;
        this.emit();
      }
    }
  }

  insert<K extends CollectionName>(collection: K, record: RecordOf<K>): RecordOf<K> {
    const rows = this.db[collection] as RecordOf<K>[];
    this.db = { ...this.db, [collection]: [record, ...rows] };
    this.queueUpsert(collection, record as unknown as AnyRecord);
    this.emit();
    return record;
  }

  insertMany<K extends CollectionName>(collection: K, records: RecordOf<K>[]): RecordOf<K>[] {
    if (records.length === 0) return records;
    const rows = this.db[collection] as RecordOf<K>[];
    this.db = { ...this.db, [collection]: [...records, ...rows] };
    for (const record of records) this.queueUpsert(collection, record as unknown as AnyRecord);
    this.emit();
    return records;
  }

  patch<K extends CollectionName>(
    collection: K,
    id: ID,
    changes: Partial<RecordOf<K>>,
  ): RecordOf<K> | null {
    const rows = this.db[collection] as RecordOf<K>[];
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return null;
    const updated = { ...rows[index], ...changes, updatedAt: now() } as RecordOf<K>;
    const next = rows.slice();
    next[index] = updated;
    this.db = { ...this.db, [collection]: next };
    this.queueUpsert(collection, updated as unknown as AnyRecord);
    this.emit();
    return updated;
  }

  remove<K extends CollectionName>(collection: K, ids: ID[]): RecordOf<K>[] {
    if (ids.length === 0) return [];
    const idSet = new Set(ids);
    const rows = this.db[collection] as RecordOf<K>[];
    const removed = rows.filter((row) => idSet.has(row.id));
    if (removed.length === 0) return [];
    this.db = { ...this.db, [collection]: rows.filter((row) => !idSet.has(row.id)) };
    this.queueDelete(collection, ids);
    this.emit();
    return removed;
  }

  /** Puts records back exactly as they were. Powers every undo affordance. */
  restore<K extends CollectionName>(collection: K, records: RecordOf<K>[]) {
    if (records.length === 0) return;
    const rows = this.db[collection] as RecordOf<K>[];
    const ids = new Set(records.map((r) => r.id));
    const merged = [...records, ...rows.filter((row) => !ids.has(row.id))];
    merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    this.db = { ...this.db, [collection]: merged };
    for (const record of records) this.queueUpsert(collection, record as unknown as AnyRecord);
    this.emit();
  }

  /** Replaces the entire workspace. Used by seeding, import and reset. */
  async replaceAll(data: Database) {
    this.db = data;
    this.emit();
    const adapter = this.adapter ?? (await getAdapter());
    this.adapter = adapter;
    await adapter.clear();
    for (const collection of COLLECTIONS) {
      await adapter.upsert(collection, data[collection] as never);
    }
  }

  async reset() {
    await this.replaceAll(emptyDatabase());
  }

  /* ---------------------------------------------------------------- */
  /* Write-behind flush                                                */
  /* ---------------------------------------------------------------- */

  private queueUpsert(collection: CollectionName, record: AnyRecord) {
    let map = this.pendingUpserts.get(collection);
    if (!map) {
      map = new Map();
      this.pendingUpserts.set(collection, map);
    }
    map.set(record.id, record);
    this.pendingDeletes.get(collection)?.delete(record.id);
    this.scheduleFlush();
  }

  private queueDelete(collection: CollectionName, ids: ID[]) {
    let set = this.pendingDeletes.get(collection);
    if (!set) {
      set = new Set();
      this.pendingDeletes.set(collection, set);
    }
    const upserts = this.pendingUpserts.get(collection);
    for (const id of ids) {
      set.add(id);
      upserts?.delete(id);
    }
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => void this.flush(), FLUSH_DELAY);
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.pendingUpserts.size === 0 && this.pendingDeletes.size === 0) return;

    const upserts = this.pendingUpserts;
    const deletes = this.pendingDeletes;
    this.pendingUpserts = new Map();
    this.pendingDeletes = new Map();

    this.inFlight += 1;
    this.setSnapshot({ saving: true });
    try {
      const adapter = this.adapter ?? (await getAdapter());
      this.adapter = adapter;
      for (const [collection, records] of upserts) {
        await adapter.upsert(collection, [...records.values()] as never);
      }
      for (const [collection, ids] of deletes) {
        await adapter.remove(collection, [...ids]);
      }
      if (this.snapshot.error) this.setSnapshot({ error: null });
    } catch (error) {
      this.setSnapshot({
        error: error instanceof Error ? error.message : "Failed to save changes",
      });
    } finally {
      this.inFlight -= 1;
      if (this.inFlight === 0) this.setSnapshot({ saving: false });
    }
  }
}

export const store = new ApplyStore();

export type { ApplyStore };
