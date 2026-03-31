import type { VoiceAssignment } from "@/lib/chatvoice-config"

const DB_NAME = "chatvoice"
const DB_VERSION = 1
const STORE_NAME = "assignments"

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "userName" })
        store.createIndex("lastSeenAt", "lastSeenAt", { unique: false })
        store.createIndex("voiceProfileId", "voiceProfileId", {
          unique: false,
        })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })

  return dbPromise
}

function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        const request = callback(store)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAssignment(
  userName: string
): Promise<VoiceAssignment | undefined> {
  return withStore("readonly", (store) => store.get(userName))
}

export function putAssignment(assignment: VoiceAssignment): Promise<IDBValidKey> {
  return withStore("readwrite", (store) => store.put(assignment))
}

export function deleteAssignment(userName: string): Promise<undefined> {
  return withStore("readwrite", (store) => store.delete(userName))
}

export function getAllAssignments(): Promise<VoiceAssignment[]> {
  return withStore("readonly", (store) => store.getAll())
}

export function countAssignments(): Promise<number> {
  return withStore("readonly", (store) => store.count())
}

export function clearAssignments(): Promise<undefined> {
  return withStore("readwrite", (store) => store.clear())
}

/**
 * Bulk-import assignments (used by backup restore and migration).
 * Clears existing data first, then inserts all provided assignments.
 */
export async function bulkPutAssignments(
  assignments: VoiceAssignment[]
): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)

    store.clear()
    for (const assignment of assignments) {
      store.put(assignment)
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Returns a page of assignments sorted by lastSeenAt descending.
 * Uses a cursor on the lastSeenAt index walking in "prev" direction
 * for efficient pagination without loading everything into memory.
 */
export async function getAssignmentPage(
  page: number,
  pageSize: number,
  excludeUserNames?: Set<string>,
  searchQuery?: string
): Promise<{ items: VoiceAssignment[]; total: number }> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const index = store.index("lastSeenAt")

    const items: VoiceAssignment[] = []
    const skip = page * pageSize
    let skipped = 0
    let total = 0
    const lowerQuery = searchQuery?.toLowerCase()

    const request = index.openCursor(null, "prev")

    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        resolve({ items, total })
        return
      }

      const assignment = cursor.value as VoiceAssignment

      // Apply filters
      const excluded = excludeUserNames?.has(assignment.userName)
      const matchesSearch =
        !lowerQuery ||
        assignment.userName.includes(lowerQuery) ||
        assignment.displayName.toLowerCase().includes(lowerQuery)

      if (!excluded && matchesSearch) {
        total++
        if (skipped < skip) {
          skipped++
        } else if (items.length < pageSize) {
          items.push(assignment)
        }
      }

      cursor.continue()
    }

    request.onerror = () => reject(request.error)
  })
}

/**
 * Migrate assignments from a Record (old localStorage format) into IndexedDB.
 * Only runs if the store is empty (first migration).
 */
export async function migrateFromRecord(
  assignments: Record<string, VoiceAssignment>
): Promise<boolean> {
  const count = await countAssignments()
  if (count > 0) return false

  const entries = Object.values(assignments)
  if (entries.length === 0) return false

  await bulkPutAssignments(entries)
  return true
}
