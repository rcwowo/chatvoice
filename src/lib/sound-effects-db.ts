import {
  SOUND_EFFECTS_STORE,
  openChatvoiceDB,
  withChatvoiceStore,
} from "@/lib/chatvoice-db"
import { blobToBase64, type SoundEffectAudioBackup } from "@/lib/audio-backup"

export type SoundEffectAudioRecord = {
  id: string
  blob: Blob
  fileName: string
  mimeType: string
  size: number
}

export function getSoundEffectAudio(
  id: string
): Promise<SoundEffectAudioRecord | undefined> {
  return withChatvoiceStore(SOUND_EFFECTS_STORE, "readonly", (store) =>
    store.get(id)
  )
}

export function putSoundEffectAudio(
  record: SoundEffectAudioRecord
): Promise<IDBValidKey> {
  return withChatvoiceStore(SOUND_EFFECTS_STORE, "readwrite", (store) =>
    store.put(record)
  )
}

export function deleteSoundEffectAudio(id: string): Promise<undefined> {
  return withChatvoiceStore(SOUND_EFFECTS_STORE, "readwrite", (store) =>
    store.delete(id)
  )
}

export function getAllSoundEffectAudio(): Promise<SoundEffectAudioRecord[]> {
  return withChatvoiceStore(SOUND_EFFECTS_STORE, "readonly", (store) =>
    store.getAll()
  )
}

export function clearSoundEffectAudio(): Promise<undefined> {
  return withChatvoiceStore(SOUND_EFFECTS_STORE, "readwrite", (store) =>
    store.clear()
  )
}

export async function bulkPutSoundEffectAudio(
  records: SoundEffectAudioRecord[]
): Promise<void> {
  const db = await openChatvoiceDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SOUND_EFFECTS_STORE, "readwrite")
    const store = tx.objectStore(SOUND_EFFECTS_STORE)

    store.clear()
    for (const record of records) {
      store.put(record)
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllSoundEffectAudioBackup(): Promise<
  SoundEffectAudioBackup[]
> {
  const records = await getAllSoundEffectAudio()

  return Promise.all(
    records.map(async (record) => ({
      id: record.id,
      fileName: record.fileName,
      mimeType: record.mimeType,
      data: await blobToBase64(record.blob),
    }))
  )
}
