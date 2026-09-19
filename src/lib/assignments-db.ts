import type { VoiceAssignment } from "@/lib/chatvoice-config"
import {
  ASSIGNMENTS_STORE,
  openChatvoiceDB,
  withChatvoiceStore,
} from "@/lib/chatvoice-db"

const STORE_NAME = ASSIGNMENTS_STORE

function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return withChatvoiceStore(STORE_NAME, mode, callback)
}

export function getAssignment(
  userName: string
): Promise<VoiceAssignment | undefined> {
  return withStore("readonly", (store) => store.get(userName))
}

export function putAssignment(
  assignment: VoiceAssignment
): Promise<IDBValidKey> {
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

export async function bulkPutAssignments(
  assignments: VoiceAssignment[]
): Promise<void> {
  const db = await openChatvoiceDB()
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

export async function getAssignmentPage(
  page: number,
  pageSize: number,
  excludeUserNames?: Set<string>,
  searchQuery?: string
): Promise<{ items: VoiceAssignment[]; total: number }> {
  const db = await openChatvoiceDB()

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
