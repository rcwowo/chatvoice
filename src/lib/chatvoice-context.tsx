import * as React from "react"

import { useChatvoiceConfig } from "@/hooks/use-chatvoice-config"
import { useChatvoiceServer } from "@/hooks/use-chatvoice-server"
import {
  type VoiceAssignment,
  type VoiceProfile,
  buildSpeechText,
  ensureVoiceAssignment,
  normalizeLookupValue,
  sanitizeMessageText,
  DEFAULT_PREVIEW_TEXT,
} from "@/lib/chatvoice-config"
import type { AppConfig } from "@/lib/chatvoice-config"
import type {
  ChatConnectionState,
  ChatMessageEvent,
  ServerVoice,
} from "@/lib/chatvoice-api"

// ---------------------------------------------------------------------------
// Playback queue
// ---------------------------------------------------------------------------

export type PlaybackQueueItem = {
  id: string
  assignment: VoiceAssignment
  profile: VoiceProfile
  text: string
  source: "chat" | "preview"
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export type PageId = "chat" | "voices" | "moderation" | "users" | "settings"

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export type ChatvoiceContextValue = {
  // Config
  config: AppConfig
  ready: boolean
  updateConfig: ReturnType<typeof useChatvoiceConfig>["updateConfig"]
  restoreBackup: ReturnType<typeof useChatvoiceConfig>["restoreBackup"]

  // Server
  voices: ServerVoice[]
  voicesLoading: boolean
  connectionState: ChatConnectionState | null
  eventsReady: boolean
  messages: ChatMessageEvent[]
  serverLogs: string[]
  startConnection: ReturnType<typeof useChatvoiceServer>["startConnection"]
  stopConnection: ReturnType<typeof useChatvoiceServer>["stopConnection"]
  requestSpeech: ReturnType<typeof useChatvoiceServer>["requestSpeech"]

  // Playback queue
  playbackQueue: PlaybackQueueItem[]
  setPlaybackQueue: React.Dispatch<React.SetStateAction<PlaybackQueueItem[]>>
  isPlayingQueue: boolean
  lastSpokenMessageId: string | null

  // Navigation
  activePage: PageId
  setActivePage: (page: PageId) => void

  // Status
  statusMessage: string | null
  setStatusMessage: (message: string | null) => void
}

const ChatvoiceContext = React.createContext<ChatvoiceContextValue | null>(null)

export function useChatvoice() {
  const context = React.useContext(ChatvoiceContext)
  if (!context) {
    throw new Error("useChatvoice must be used within a ChatvoiceProvider")
  }
  return context
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ChatvoiceProvider({ children }: { children: React.ReactNode }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const { config, ready, updateConfig, restoreBackup } = useChatvoiceConfig()
  const {
    voices,
    voicesLoading,
    connectionState,
    eventsReady,
    messages,
    serverLogs,
    startConnection,
    stopConnection,
    requestSpeech,
  } = useChatvoiceServer()

  const [activePage, setActivePage] = React.useState<PageId>("chat")
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [isPlayingQueue, setIsPlayingQueue] = React.useState(false)
  const [playbackQueue, setPlaybackQueue] = React.useState<PlaybackQueueItem[]>(
    []
  )
  const [lastSpokenMessageId, setLastSpokenMessageId] = React.useState<
    string | null
  >(null)

  const queueCapacity = Math.max(config.playback.maxQueueSize, 1)

  // -----------------------------------------------------------------------
  // Enqueue new chat messages as they arrive
  // -----------------------------------------------------------------------

  React.useEffect(() => {
    if (!ready) {
      return
    }

    const nextQueueItems: PlaybackQueueItem[] = []
    let nextConfig = config
    let configChanged = false

    for (const message of messages) {
      if (message.id === lastSpokenMessageId) {
        break
      }

      const decision = shouldSpeakMessage(message, config)
      if (!decision.allowed) {
        continue
      }

      const ensured = ensureVoiceAssignment(
        nextConfig,
        message.userName,
        message.displayName
      )

      nextConfig = ensured.config
      configChanged = configChanged || ensured.created

      if (!ensured.assignment) {
        continue
      }

      const profile = nextConfig.voiceProfiles.find(
        (voiceProfile) => voiceProfile.id === ensured.assignment?.voiceProfileId
      )

      if (!profile) {
        continue
      }

      nextQueueItems.push({
        id: message.id,
        assignment: ensured.assignment,
        profile,
        text: buildSpeechText(
          nextConfig.playback.textTemplate,
          decision.text,
          message.userName,
          message.displayName,
          message.channel
        ),
        source: "chat",
      })
    }

    if (configChanged) {
      updateConfig(nextConfig)
    }

    if (nextQueueItems.length === 0) {
      return
    }

    setPlaybackQueue((current) => {
      const knownIds = new Set(current.map((item) => item.id))
      const merged = [
        ...current,
        ...nextQueueItems.reverse().filter((item) => !knownIds.has(item.id)),
      ]

      return merged.slice(0, queueCapacity)
    })

    setLastSpokenMessageId(messages[0]?.id ?? lastSpokenMessageId)
  }, [
    config,
    messages,
    ready,
    lastSpokenMessageId,
    queueCapacity,
    updateConfig,
  ])

  // -----------------------------------------------------------------------
  // Play from queue
  // -----------------------------------------------------------------------

  React.useEffect(() => {
    if (isPlayingQueue) {
      return
    }

    const nextItem = playbackQueue[0]
    if (!nextItem || !config.playback.enabled) {
      return
    }

    let cancelled = false

    async function speakQueueItem() {
      setIsPlayingQueue(true)

      try {
        const audioBlob = await requestSpeech({
          text: nextItem.text,
          voice: nextItem.profile.voice,
          rate: nextItem.profile.rate,
          pitch: nextItem.profile.pitch,
          volume: nextItem.profile.volume,
        })

        if (cancelled) {
          return
        }

        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = audioRef.current ?? new Audio()
        audioRef.current = audio
        audio.src = audioUrl
        await audio.play()

        await new Promise<void>((resolve, reject) => {
          const handleEnded = () => {
            cleanup()
            resolve()
          }
          const handleError = () => {
            cleanup()
            reject(new Error("Audio playback failed"))
          }
          const cleanup = () => {
            audio.removeEventListener("ended", handleEnded)
            audio.removeEventListener("error", handleError)
            URL.revokeObjectURL(audioUrl)
          }

          audio.addEventListener("ended", handleEnded)
          audio.addEventListener("error", handleError)
        })
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(
            error instanceof Error
              ? error.message
              : "Failed to synthesize speech"
          )
        }
      } finally {
        if (!cancelled) {
          setPlaybackQueue((current) => current.slice(1))
          setIsPlayingQueue(false)
        }
      }
    }

    void speakQueueItem()

    return () => {
      cancelled = true
    }
  }, [config.playback.enabled, isPlayingQueue, playbackQueue, requestSpeech])

  // -----------------------------------------------------------------------
  // Context value
  // -----------------------------------------------------------------------

  const value = React.useMemo<ChatvoiceContextValue>(
    () => ({
      config,
      ready,
      updateConfig,
      restoreBackup,
      voices,
      voicesLoading,
      connectionState,
      eventsReady,
      messages,
      serverLogs,
      startConnection,
      stopConnection,
      requestSpeech,
      playbackQueue,
      setPlaybackQueue,
      isPlayingQueue,
      lastSpokenMessageId,
      activePage,
      setActivePage,
      statusMessage,
      setStatusMessage,
    }),
    [
      config,
      ready,
      updateConfig,
      restoreBackup,
      voices,
      voicesLoading,
      connectionState,
      eventsReady,
      messages,
      serverLogs,
      startConnection,
      stopConnection,
      requestSpeech,
      playbackQueue,
      isPlayingQueue,
      lastSpokenMessageId,
      activePage,
      statusMessage,
    ]
  )

  return (
    <ChatvoiceContext.Provider value={value}>
      {children}
    </ChatvoiceContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Shared helpers (used across pages)
// ---------------------------------------------------------------------------

export function shouldSpeakMessage(
  message: {
    userName: string
    text: string
    flags: {
      isBroadcaster: boolean
      isModerator: boolean
      isSubscriber: boolean
    }
  },
  config: AppConfig
): { allowed: boolean; text: string } {
  const sanitized = sanitizeMessageText(
    message.text,
    config.playback.stripLinks
  )
  const normalizedUser = normalizeLookupValue(message.userName)
  const blockedUsernames = new Set(
    config.playback.blockedUsers.map(normalizeLookupValue)
  )
  const blockedTerms = config.playback.blockedTerms.map((item) =>
    item.toLowerCase()
  )

  if (!config.playback.enabled) {
    return { allowed: false, text: sanitized }
  }

  if (config.playback.ignoreCommands && /^[!/]/.test(sanitized)) {
    return { allowed: false, text: sanitized }
  }

  if (config.playback.skipBots && normalizedUser.endsWith("bot")) {
    return { allowed: false, text: sanitized }
  }

  if (config.playback.skipBroadcaster && message.flags.isBroadcaster) {
    return { allowed: false, text: sanitized }
  }

  if (config.playback.skipModerators && message.flags.isModerator) {
    return { allowed: false, text: sanitized }
  }

  if (config.playback.skipSubscribers && message.flags.isSubscriber) {
    return { allowed: false, text: sanitized }
  }

  if (blockedUsernames.has(normalizedUser)) {
    return { allowed: false, text: sanitized }
  }

  if (
    blockedTerms.some((term) => term && sanitized.toLowerCase().includes(term))
  ) {
    return { allowed: false, text: sanitized }
  }

  if (sanitized.length < config.playback.minMessageLength) {
    return { allowed: false, text: sanitized }
  }

  if (sanitized.length > config.playback.maxMessageLength) {
    return { allowed: false, text: sanitized }
  }

  return { allowed: sanitized.length > 0, text: sanitized }
}

export function parseLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export { DEFAULT_PREVIEW_TEXT }
