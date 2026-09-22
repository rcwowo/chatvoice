const DB_NAME = "chatvoice"
const DB_VERSION = 2

export const ASSIGNMENTS_STORE = "assignments"
export const SOUND_EFFECTS_STORE = "soundEffects"

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Opens the shared Chatvoice IndexedDB database. The upgrade handler is
 * idempotent: it only creates missing stores, so version bumps never drop data.
 */
export function openChatvoiceDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(ASSIGNMENTS_STORE)) {
        const store = db.createObjectStore(ASSIGNMENTS_STORE, {
          keyPath: "userName",
        })
        store.createIndex("lastSeenAt", "lastSeenAt", { unique: false })
        store.createIndex("voiceProfileId", "voiceProfileId", { unique: false })
      }

      if (!db.objectStoreNames.contains(SOUND_EFFECTS_STORE)) {
        db.createObjectStore(SOUND_EFFECTS_STORE, { keyPath: "id" })
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

export function withChatvoiceStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openChatvoiceDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        const request = callback(store)

        // Resolve only on transaction commit; request.onsuccess fires before
        // the write is durable and aborts would go unnoticed.
        tx.oncomplete = () => resolve(request.result)
        tx.onerror = () => reject(request.error ?? tx.error)
        tx.onabort = () =>
          reject(request.error ?? tx.error ?? new Error("Transaction aborted"))
      })
  )
}
