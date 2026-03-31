import * as React from "react"
import { toast } from "sonner"

import { useChatvoiceConfig } from "@/hooks/use-chatvoice-config"
import { useTwitchChat } from "@/hooks/use-twitch-chat"
import {
  type BrowserVoice,
  useBrowserVoices,
  findSynthVoice,
  configRateToSpeechRate,
  configPitchToSpeechPitch,
  configVolumeToSpeechVolume,
} from "@/hooks/use-browser-voices"
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
  TwitchChatMessage,
  TwitchConnectionState,
} from "@/lib/twitch-chat"

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

  // Browser voices
  voices: BrowserVoice[]
  voicesLoading: boolean

  // Chat
  connectionState: TwitchConnectionState
  messages: TwitchChatMessage[]
  logs: string[]
  startConnection: (channel: string) => Promise<string>
  stopConnection: () => void

  // Playback queue
  playbackQueue: PlaybackQueueItem[]
  setPlaybackQueue: React.Dispatch<React.SetStateAction<PlaybackQueueItem[]>>
  isPlayingQueue: boolean
  lastSpokenMessageId: string | null
  skipCurrent: () => void
  clearQueue: () => void

  // Navigation
  activePage: PageId
  setActivePage: (page: PageId) => void
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
  const { config, ready, updateConfig, restoreBackup } = useChatvoiceConfig()
  const { connectionState, messages, logs, startConnection, stopConnection } =
    useTwitchChat()
  const { voices, loading: voicesLoading } = useBrowserVoices()

  const [activePage, setActivePage] = React.useState<PageId>("chat")
  const [isPlayingQueue, setIsPlayingQueue] = React.useState(false)
  const [playbackQueue, setPlaybackQueue] = React.useState<PlaybackQueueItem[]>(
    []
  )
  const [lastSpokenMessageId, setLastSpokenMessageId] = React.useState<
    string | null
  >(null)

  const queueCapacity = Math.max(config.playback.maxQueueSize, 1)

  // Refs so the speech consumer can read current state without re-triggering
  const playbackQueueRef = React.useRef(playbackQueue)
  const playbackEnabledRef = React.useRef(config.playback.enabled)

  React.useEffect(() => {
    playbackQueueRef.current = playbackQueue
  }, [playbackQueue])

  React.useEffect(() => {
    playbackEnabledRef.current = config.playback.enabled
  }, [config.playback.enabled])

  // -----------------------------------------------------------------------
  // Autoconnect to previously saved channel on startup
  // -----------------------------------------------------------------------

  const autoConnectedRef = React.useRef(false)

  React.useEffect(() => {
    if (!ready || autoConnectedRef.current) return
    autoConnectedRef.current = true

    const channel = config.twitch.channel.trim()
    if (channel && config.twitch.autoConnect && !connectionState.connected && !connectionState.connecting) {
      toast.promise(startConnection(channel), {
        loading: `Connecting to #${channel}…`,
        success: (ch) => `Connected to #${ch}`,
        error: (err) =>
          err instanceof Error ? err.message : "Connection failed",
      })
    }
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

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

    // Messages are in chronological order (oldest first, newest last).
    // Find new messages that come after the last one we processed.
    let startIdx = 0
    if (lastSpokenMessageId) {
      const idx = messages.findIndex((m) => m.id === lastSpokenMessageId)
      startIdx = idx === -1 ? messages.length : idx + 1
    }

    for (let i = startIdx; i < messages.length; i++) {
      const message = messages[i]

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
        ...nextQueueItems.filter((item) => !knownIds.has(item.id)),
      ]

      return merged.slice(0, queueCapacity)
    })

    setLastSpokenMessageId(messages[messages.length - 1]?.id ?? lastSpokenMessageId)
  }, [
    config,
    messages,
    ready,
    lastSpokenMessageId,
    queueCapacity,
    updateConfig,
  ])

  // -----------------------------------------------------------------------
  // Speech consumer — plays items one at a time
  //
  // Key design: the consumer only re-triggers when `isPlayingQueue` changes
  // to `false` or when `playbackQueue.length` changes. We do NOT put the
  // full queue array in the dep list, only its length, so that internal
  // queue reordering doesn't restart the effect and cancel the current
  // utterance mid-speech.
  // -----------------------------------------------------------------------

  const queueLength = playbackQueue.length

  React.useEffect(() => {
    if (isPlayingQueue || queueLength === 0 || !playbackEnabledRef.current) {
      return
    }

    const item = playbackQueueRef.current[0]
    if (!item) return

    const synth = window.speechSynthesis
    if (!synth) {
      toast.error("SpeechSynthesis is not available in this browser.")
      setPlaybackQueue((current) => current.slice(1))
      return
    }

    setIsPlayingQueue(true)

    const utterance = new SpeechSynthesisUtterance(item.text)

    const synthVoice = findSynthVoice(item.profile.voice)
    if (synthVoice) {
      utterance.voice = synthVoice
    }

    utterance.rate = configRateToSpeechRate(item.profile.rate)
    utterance.pitch = configPitchToSpeechPitch(item.profile.pitch)
    utterance.volume = configVolumeToSpeechVolume(item.profile.volume)

    utterance.onend = () => {
      setPlaybackQueue((current) => current.slice(1))
      setIsPlayingQueue(false)
    }

    utterance.onerror = (event) => {
      // "canceled" (Safari) and "interrupted" (Chrome/Edge) are fired when
      // speechSynthesis.cancel() is called from skipCurrent / clearQueue.
      // Those callers already handle queue removal, so bail out here to
      // avoid removing an extra item (double-skip bug).
      if (event.error === "canceled" || event.error === "interrupted") {
        return
      }
      toast.error(`Speech failed: ${event.error}`)
      setPlaybackQueue((current) => current.slice(1))
      setIsPlayingQueue(false)
    }

    synth.speak(utterance)
  }, [isPlayingQueue, queueLength])

  // -----------------------------------------------------------------------
  // Queue controls
  // -----------------------------------------------------------------------

  const skipCurrent = React.useCallback(() => {
    window.speechSynthesis?.cancel()
    setPlaybackQueue((current) => current.slice(1))
    setIsPlayingQueue(false)
  }, [])

  const clearQueue = React.useCallback(() => {
    window.speechSynthesis?.cancel()
    setPlaybackQueue([])
    setIsPlayingQueue(false)
  }, [])

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
      messages,
      logs,
      startConnection,
      stopConnection,
      playbackQueue,
      setPlaybackQueue,
      isPlayingQueue,
      lastSpokenMessageId,
      skipCurrent,
      clearQueue,
      activePage,
      setActivePage,
    }),
    [
      config,
      ready,
      updateConfig,
      restoreBackup,
      voices,
      voicesLoading,
      connectionState,
      messages,
      logs,
      startConnection,
      stopConnection,
      playbackQueue,
      isPlayingQueue,
      lastSpokenMessageId,
      skipCurrent,
      clearQueue,
      activePage,
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
