import * as React from "react"

import {
  type AppConfig,
  createDefaultConfig,
  importConfigBackup,
  loadConfig,
  saveConfig,
} from "@/lib/chatvoice-config"

export function useChatvoiceConfig() {
  const [config, setConfig] = React.useState<AppConfig>(() =>
    createDefaultConfig()
  )
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const nextConfig = loadConfig()
    setConfig(nextConfig)
    setReady(true)
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

  const restoreBackup = React.useCallback((payload: string) => {
    const nextConfig = importConfigBackup(payload)
    saveConfig(nextConfig)
    setConfig(loadConfig())
    return nextConfig
  }, [])

  return {
    config,
    ready,
    updateConfig,
    restoreBackup,
  }
}
