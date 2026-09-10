import type { CollectionName, Database, ID, RecordOf } from "@/lib/types";
import { COLLECTIONS } from "@/lib/types";
import { emptyDatabase, type DataAdapter } from "./adapter";

/**
 * Zero-config persistence: one IndexedDB object store per collection.
 *
 * This is what a freshly forked ApplyOS runs on. Add Supabase credentials and
 * the exact same data shapes move to Postgres with no code changes.
 */

const DB_NAME = "applyos";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of COLLECTIONS) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB upgrade blocked by another tab"));
  });
  return dbPromise;
}

function tx(db: IDBDatabase, stores: string[], mode: IDBTransactionMode) {
  const transaction = db.transaction(stores, mode);
  const done = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  return { transaction, done };
}

function readAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export function createLocalAdapter(): DataAdapter {
  return {
    kind: "local",
    label: "Local (IndexedDB)",

    async load(): Promise<Database> {
      const db = await openDb();
      const { transaction, done } = tx(db, [...COLLECTIONS], "readonly");
      const result = emptyDatabase();
      await Promise.all(
        COLLECTIONS.map(async (name) => {
          const rows = await readAll(transaction.objectStore(name));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result as any)[name] = rows;
        }),
      );
      await done;
      return result;
    },

    async upsert<K extends CollectionName>(collection: K, records: RecordOf<K>[]) {
      if (records.length === 0) return;
      const db = await openDb();
      const { transaction, done } = tx(db, [collection], "readwrite");
      const store = transaction.objectStore(collection);
      for (const record of records) store.put(record);
      await done;
    },

    async remove(collection: CollectionName, ids: ID[]) {
      if (ids.length === 0) return;
      const db = await openDb();
      const { transaction, done } = tx(db, [collection], "readwrite");
      const store = transaction.objectStore(collection);
      for (const id of ids) store.delete(id);
      await done;
    },

    async clear() {
      const db = await openDb();
      const { transaction, done } = tx(db, [...COLLECTIONS], "readwrite");
      for (const name of COLLECTIONS) transaction.objectStore(name).clear();
      await done;
    },
  };
}
