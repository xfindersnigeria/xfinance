// Tiny IndexedDB key/value store for work-in-progress drafts. IndexedDB (not
// localStorage) so a multi-thousand-row import doesn't hit the ~5MB quota.
// Every call swallows storage errors: a draft is a convenience, never a blocker.

const DB_NAME = "xfinance-drafts";
const STORE = "drafts";
const VERSION = 1;
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface DraftRecord<T> {
  data: T;
  savedAt: number;
  /** Bump when the shape of `data` changes — older drafts are discarded. */
  version: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no idb"));
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<R>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<R>,
): Promise<R | undefined> {
  try {
    const db = await openDb();
    return await new Promise<R | undefined>((resolve) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}

export async function loadDraft<T>(
  key: string,
  version: number,
): Promise<DraftRecord<T> | null> {
  const rec = await run<DraftRecord<T>>("readonly", (s) => s.get(key));
  if (!rec || rec.version !== version || Date.now() - rec.savedAt > DRAFT_TTL_MS) {
    if (rec) void deleteDraft(key);
    return null;
  }
  return rec;
}

export async function saveDraft<T>(key: string, data: T, version: number) {
  await run("readwrite", (s) => s.put({ data, savedAt: Date.now(), version }, key));
}

export async function deleteDraft(key: string) {
  await run("readwrite", (s) => s.delete(key));
}
