/**
 * IndexedDB store for attachment blobs (dataUrls).
 *
 * Why not localStorage?
 *  localStorage has a ~5-10 MB limit. A few screenshots easily exceed
 *  that, causing silent data loss on the next page load.
 *  IndexedDB has a much larger quota (typically 50 %+ of free disk space)
 *  and is the right place for binary-sized data.
 *
 * The Redux / localStorage layer stores only the attachment *metadata*
 * (id, name, type, size) — never the dataUrl.  On startup, App.tsx
 * dispatches hydrateAttachments(), which reads every dataUrl from here
 * and patches it back into the Redux notes slice.
 */

const DB_NAME = 'agilens_attachments'
const STORE = 'blobs'
const VERSION = 1

// ─── DB connection (singleton promise) ────────────────────────────────────────

let _dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return _dbPromise
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Persist a dataUrl keyed by attachment id */
export async function saveAttachmentBlob(id: string, dataUrl: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(dataUrl, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Load a single dataUrl by id (null if not found) */
export async function loadAttachmentBlob(id: string): Promise<string | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve((req.result as string | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

/** Load all dataUrls — returns a map id→dataUrl */
export async function loadAllAttachmentBlobs(): Promise<Record<string, string>> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const result: Record<string, string> = {}
    const req = tx.objectStore(STORE).openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        result[cursor.key as string] = cursor.value as string
        cursor.continue()
      } else {
        resolve(result)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

/** Delete a dataUrl when the attachment is removed */
export async function deleteAttachmentBlob(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
