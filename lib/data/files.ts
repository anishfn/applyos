/**
 * Local file storage.
 *
 * Uploaded resumes and documents live in their own IndexedDB database, keyed by
 * id, with only that id written onto the record. Keeping blobs out of the main
 * store means a workspace row stays small enough to sync to Postgres later, and
 * a 2MB PDF never rides along in every snapshot.
 *
 * Files are always local. Configuring Supabase syncs the records, not the
 * binaries, which is the honest behaviour for a tool with no server.
 */

const DB_NAME = "applyos-files";
const STORE = "files";
const VERSION = 1;

/** `fileUrl` values that start with this are ids in here, not links. */
export const LOCAL_FILE_PREFIX = "local:";

export const MAX_FILE_BYTES = 15 * 1024 * 1024;

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  addedAt: string;
  blob: Blob;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

export const isLocalFile = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.startsWith(LOCAL_FILE_PREFIX);

export const localFileId = (value: string): string => value.slice(LOCAL_FILE_PREFIX.length);

/** Stores the blob and returns the reference to save on the record. */
export async function putFile(file: File): Promise<{ ref: string; name: string; size: number }> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_FILE_BYTES)}.`);
  }
  const id = crypto.randomUUID();
  const record: StoredFile = {
    id,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    addedAt: new Date().toISOString(),
    blob: file,
  };
  await tx("readwrite", (store) => store.put(record));
  return { ref: `${LOCAL_FILE_PREFIX}${id}`, name: file.name, size: file.size };
}

export async function getFile(ref: string): Promise<StoredFile | null> {
  if (!isLocalFile(ref)) return null;
  const record = await tx<StoredFile | undefined>("readonly", (store) =>
    store.get(localFileId(ref)),
  );
  return record ?? null;
}

export async function removeFile(ref: string): Promise<void> {
  if (!isLocalFile(ref)) return;
  await tx("readwrite", (store) => store.delete(localFileId(ref)));
}

/**
 * Opens a stored file in a new tab.
 *
 * The object URL is revoked on a timer rather than immediately: revoking before
 * the new tab has finished reading it shows an empty viewer.
 */
export async function openStoredFile(ref: string): Promise<boolean> {
  const record = await getFile(ref);
  if (!record) return false;
  const url = URL.createObjectURL(record.blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
