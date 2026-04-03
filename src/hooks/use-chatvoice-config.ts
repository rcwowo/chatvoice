import * as React from "react"

import {
  type AppConfig,
  createDefaultConfig,
  hasStoredConfig,
  importConfigBackup,
  loadConfig,
  saveConfig,
} from "@/lib/chatvoice-config"
import {
  bulkPutAssignments,
  migrateFromRecord,
} from "@/lib/assignments-db"

export function useChatvoiceConfig() {
  const [config, setConfig] = React.useState<AppConfig>(() =>
    createDefaultConfig()
  )
  const [ready, setReady] = React.useState(false)
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false)

  React.useEffect(() => {
    const isFirstRun = !hasStoredConfig()
    const loaded = loadConfig()

    // Migrate old assignments from localStorage → IndexedDB (one-time)
    const legacyAssignments = loaded.assignments
    const cleanConfig: AppConfig = { ...loaded }
    delete cleanConfig.assignments

    async function init() {
      if (legacyAssignments && Object.keys(legacyAssignments).length > 0) {
        const migrated = await migrateFromRecord(legacyAssignments)
        if (migrated) {
          // Remove assignments from localStorage since they now live in IDB
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
        return loadConfig()
      })
    },
    []
  )

  const restoreBackup = React.useCallback(
    async (payload: string) => {
      const result = importConfigBackup(payload)
      saveConfig(result.config)

      // Restore assignments into IndexedDB
      if (result.assignments.length > 0) {
        await bulkPutAssignments(result.assignments)
      }

      const loaded = loadConfig()
      const { assignments: _, ...cleanLoaded } = loaded
      setConfig(cleanLoaded as AppConfig)
      return result.config
    },
    []
  )

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
