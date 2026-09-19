import * as React from "react"

import {
  type AppConfig,
  createDefaultConfig,
  hasStoredConfig,
  importConfigBackup,
  loadConfig,
  saveConfig,
} from "@/lib/chatvoice-config"
import { bulkPutAssignments, migrateFromRecord } from "@/lib/assignments-db"
import { base64ToBlob } from "@/lib/audio-backup"
import { bulkPutSoundEffectAudio } from "@/lib/sound-effects-db"

export function useChatvoiceConfig() {
  const [config, setConfig] = React.useState<AppConfig>(() =>
    createDefaultConfig()
  )
  const [ready, setReady] = React.useState(false)
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false)

  React.useEffect(() => {
    const isFirstRun = !hasStoredConfig()
    const loaded = loadConfig()

    const legacyAssignments = loaded.assignments
    const cleanConfig: AppConfig = { ...loaded }
    delete cleanConfig.assignments

    async function init() {
      if (legacyAssignments && Object.keys(legacyAssignments).length > 0) {
        const migrated = await migrateFromRecord(legacyAssignments)
        if (migrated) {
          saveConfig(cleanConfig)
        }
      }
      setConfig(cleanConfig)
      setNeedsOnboarding(isFirstRun)
      setReady(true)
    }

    init()
  }, [])

  const updateConfig = React.useCallback(
    (updater: AppConfig | ((current: AppConfig) => AppConfig)) => {
      setConfig((current) => {
        const nextConfig =
          typeof updater === "function"
            ? (updater as (value: AppConfig) => AppConfig)(current)
            : updater

        saveConfig(nextConfig)
        return nextConfig
      })
    },
    []
  )

  const restoreBackup = React.useCallback(async (payload: string) => {
    const result = importConfigBackup(payload)
    saveConfig(result.config)

    // Only replace a store when the backup contains that section; otherwise
    // leave existing IndexedDB data untouched.
    if (result.hasAssignments) {
      await bulkPutAssignments(result.assignments)
    }

    if (result.hasSoundEffects) {
      await bulkPutSoundEffectAudio(
        result.soundEffectAudio.map((entry) => {
          const blob = base64ToBlob(entry.data, entry.mimeType)
          return {
            id: entry.id,
            blob,
            fileName: entry.fileName,
            mimeType: entry.mimeType,
            size: blob.size,
          }
        })
      )
    }

    const loaded = loadConfig()
    const { assignments: _, ...cleanLoaded } = loaded
    setConfig(cleanLoaded as AppConfig)
    return result.config
  }, [])

  const completeOnboarding = React.useCallback(() => {
    setNeedsOnboarding(false)
  }, [])

  return {
    config,
    ready,
    needsOnboarding,
    completeOnboarding,
    updateConfig,
    restoreBackup,
  }
}
