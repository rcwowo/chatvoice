import * as React from "react"
import { toast } from "sonner"

import { useChatvoiceConfig } from "@/hooks/use-chatvoice-config"
import { useMemberBadges } from "@/hooks/use-member-badges"
import { useTwitchChat, type TwitchTimelineItem } from "@/hooks/use-twitch-chat"
import {
  type BrowserVoice,
  useBrowserVoices,
  findSynthVoice,
  configRateToSpeechRate,
  configPitchToSpeechPitch,
  configVolumeToSpeechVolume,
} from "@/hooks/use-browser-voices"
import {
  type MessageTimestampFormat,
  type VoiceAssignment,
  type VoiceProfile,
  buildSpeechText,
  ensureVoiceAssignment,
  normalizeLookupValue,
  normalizeTwitchConfig,
  parseChannelSearchParam,
  sanitizeMessageText,
} from "@/lib/chatvoice-config"
import type { AppConfig } from "@/lib/chatvoice-config"
import { tryHandleChatCommand, parseChatCommand } from "@/lib/chat-commands"
import type { MemberBadge } from "@/lib/member-badges"
import type {
  TwitchChatMessage,
  TwitchConnectionState,
  TwitchEmote,
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
// Config context – changes only on user edits (stable during chat activity)
// ---------------------------------------------------------------------------

export type ChatvoiceConfigContextValue = {
  config: AppConfig
  ready: boolean
  needsOnboarding: boolean
  completeOnboarding: () => void
  updateConfig: ReturnType<typeof useChatvoiceConfig>["updateConfig"]
  restoreBackup: ReturnType<typeof useChatvoiceConfig>["restoreBackup"]
  voices: BrowserVoice[]
  voicesLoading: boolean
  memberBadgeByUserId: Map<string, MemberBadge>
  memberBadgesReady: boolean
}

// ---------------------------------------------------------------------------
// Chat context – changes on every message / playback update
// ---------------------------------------------------------------------------

export type ChatvoiceChatContextValue = {
  connectionState: TwitchConnectionState
  messages: TwitchChatMessage[]
  timeline: TwitchTimelineItem[]
  logs: string[]
  startConnection: (channel: string) => Promise<string>
  stopConnection: () => void
  playbackQueue: PlaybackQueueItem[]
  setPlaybackQueue: React.Dispatch<React.SetStateAction<PlaybackQueueItem[]>>
  isPlayingQueue: boolean
  activePlaybackItemId: string | null
  lastSpokenMessageId: string | null
  skipCurrent: () => void
  clearQueue: () => void
}

export type ChatvoiceContextValue = ChatvoiceConfigContextValue &
  ChatvoiceChatContextValue

const ChatvoiceConfigContext =
  React.createContext<ChatvoiceConfigContextValue | null>(null)
const ChatvoiceChatContext =
  React.createContext<ChatvoiceChatContextValue | null>(null)

/**
 * Use only config / voices / settings state.
 * Components using this hook will NOT re-render when chat messages or
 * playback state change, which keeps open dropdowns stable.
 */
export function useChatvoiceSettings() {
  const context = React.useContext(ChatvoiceConfigContext)
  if (!context) {
    throw new Error(
      "useChatvoiceSettings must be used within a ChatvoiceProvider"
    )
  }
  return context
}

/**
 * Full context - config + chat + playback. Re-renders on every change.
 */
export function useChatvoice() {
  const config = React.useContext(ChatvoiceConfigContext)
  const chat = React.useContext(ChatvoiceChatContext)
  if (!config || !chat) {
    throw new Error("useChatvoice must be used within a ChatvoiceProvider")
  }
  return { ...config, ...chat }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ChatvoiceProvider({ children }: { children: React.ReactNode }) {
  const { config, ready, needsOnboarding, completeOnboarding, updateConfig, restoreBackup } = useChatvoiceConfig()
  const {
    connectionState,
    messages,
    timeline,
    logs,
    startConnection: startChatConnection,
    stopConnection: stopChatConnection,
  } =
    useTwitchChat(config.playback.maxDisplayedMessages)
  const { voices, loading: voicesLoading } = useBrowserVoices()
  const { badgeByUserId: memberBadgeByUserId, ready: memberBadgesReady } =
    useMemberBadges()

  const [isPlayingQueue, setIsPlayingQueue] = React.useState(false)
  const [playbackQueue, setPlaybackQueue] = React.useState<PlaybackQueueItem[]>(
    []
  )
  const [lastSpokenMessageId, setLastSpokenMessageId] = React.useState<
    string | null
  >(null)
  /** Head-of-queue item currently speaking or soft-paused mid-utterance. */
  const [activePlaybackItemId, setActivePlaybackItemId] = React.useState<
    string | null
  >(null)

  const queueCapacity = Math.max(config.playback.maxQueueSize, 1)

  // Refs so the speech consumer can read current state without re-triggering
  const playbackQueueRef = React.useRef(playbackQueue)
  const playbackEnabledRef = React.useRef(config.playback.enabled)
  const lastSpokenMessageIdRef = React.useRef(lastSpokenMessageId)
  const isPlayingQueueRef = React.useRef(isPlayingQueue)
  /** Char offset into the current item's full text (soft-pause resume point). */
  const speakOffsetRef = React.useRef(0)
  /** Progress within the active utterance text (from boundary events). */
  const utteranceCharIndexRef = React.useRef(0)
  /** True while cancel() is used to soft-pause rather than skip/clear. */
  const softPausingRef = React.useRef(false)

  React.useEffect(() => {
    playbackQueueRef.current = playbackQueue
  }, [playbackQueue])

  React.useEffect(() => {
    playbackEnabledRef.current = config.playback.enabled
  }, [config.playback.enabled])

  React.useEffect(() => {
    isPlayingQueueRef.current = isPlayingQueue
  }, [isPlayingQueue])

  // Soft-pause: remote/online voices (Edge neural, Chrome cloud, etc.) often
  // break natively on pause()/resume() with no error. Cancel and resume from
  // the last boundary instead.
  React.useEffect(() => {
    if (config.playback.enabled) {
      return
    }

    const synth = window.speechSynthesis
    if (!synth || !isPlayingQueueRef.current) {
      return
    }

    softPausingRef.current = true
    speakOffsetRef.current += utteranceCharIndexRef.current
    utteranceCharIndexRef.current = 0
    synth.cancel()
    setIsPlayingQueue(false)
  }, [config.playback.enabled])

  React.useEffect(() => {
    if (messages.length !== 0 || lastSpokenMessageIdRef.current === null) {
      return
    }

    lastSpokenMessageIdRef.current = null
    setLastSpokenMessageId(null)
  }, [messages.length])

  // -----------------------------------------------------------------------
  // Autoconnect on startup (?channel= deep link or saved config)
  // -----------------------------------------------------------------------

  const autoConnectedRef = React.useRef(false)

  // -----------------------------------------------------------------------
  // Queue controls
  // -----------------------------------------------------------------------

  const skipCurrent = React.useCallback(() => {
    softPausingRef.current = false
    speakOffsetRef.current = 0
    utteranceCharIndexRef.current = 0
    setActivePlaybackItemId(null)
    window.speechSynthesis?.cancel()
    setPlaybackQueue((current) => current.slice(1))
    setIsPlayingQueue(false)
  }, [])

  const clearQueue = React.useCallback(() => {
    softPausingRef.current = false
    speakOffsetRef.current = 0
    utteranceCharIndexRef.current = 0
    setActivePlaybackItemId(null)
    window.speechSynthesis?.cancel()
    setPlaybackQueue([])
    setIsPlayingQueue(false)
  }, [])

  const setQueueEnabled = React.useCallback(
    (enabled: boolean) => {
      updateConfig((current) => ({
        ...current,
        playback: { ...current.playback, queueEnabled: enabled },
      }))
    },
    [updateConfig]
  )

  const setPlaybackEnabled = React.useCallback(
    (enabled: boolean) => {
      updateConfig((current) => ({
        ...current,
        playback: { ...current.playback, enabled },
      }))
    },
    [updateConfig]
  )

  const chatCommandActions = React.useMemo(
    () => ({
      setQueueEnabled,
      setPlaybackEnabled,
      skipCurrent,
      clearQueue,
      voiceProfiles: config.voiceProfiles,
    }),
    [
      setQueueEnabled,
      setPlaybackEnabled,
      skipCurrent,
      clearQueue,
      config.voiceProfiles,
    ]
  )

  // -----------------------------------------------------------------------
  // Enqueue new chat messages as they arrive
  // -----------------------------------------------------------------------

  React.useEffect(() => {
    if (!ready) {
      return
    }

    // Messages are in chronological order (oldest first, newest last).
    // Find new messages that come after the last one we processed.
    let startIdx = 0
    if (lastSpokenMessageIdRef.current) {
      const idx = messages.findIndex((m) => m.id === lastSpokenMessageIdRef.current)
      startIdx = idx === -1 ? messages.length : idx + 1
    }

    const pendingMessages = messages.slice(startIdx)
    if (pendingMessages.length === 0) {
      return
    }

    // Mark all as "seen" immediately via ref so we don't re-process,
    // without causing a re-render that would cancel the async work below.
    const newLastId = messages[messages.length - 1]?.id ?? lastSpokenMessageIdRef.current
    lastSpokenMessageIdRef.current = newLastId
    setLastSpokenMessageId(newLastId)

    const isBigChat = config.playback.queueMode === "big-chat"
    let cancelled = false

    async function processMessages() {
      // Evaluate commands for every new message so !cv actions still run in
      // big-chat mode even when older pending messages are not spoken.
      for (const message of pendingMessages) {
        if (cancelled) break
        await tryHandleChatCommand(message, config, chatCommandActions)
      }

      // In big-chat mode, only process the newest pending message so we
      // don't waste work on messages we'll never speak.
      const messagesToProcess = isBigChat
        ? pendingMessages.slice(-1)
        : pendingMessages

      const nextQueueItems: PlaybackQueueItem[] = []

      for (const message of messagesToProcess) {
        if (cancelled) break

        // Known Chatvoice command syntax is never spoken.
        if (parseChatCommand(message.text)) {
          continue
        }

        const decision = shouldSpeakMessage(message, config)
        if (!decision.allowed) {
          continue
        }

        const ensured = await ensureVoiceAssignment(
          config,
          message.userName,
          message.displayName
        )

        if (!ensured.assignment) {
          continue
        }

        const profile = config.voiceProfiles.find(
          (voiceProfile) =>
            voiceProfile.id === ensured.assignment?.voiceProfileId
        )

        if (!profile) {
          continue
        }

        nextQueueItems.push({
          id: message.id,
          assignment: ensured.assignment,
          profile,
          text: buildSpeechText(
            config.playback.textTemplate,
            decision.text,
            message.userName,
            message.displayName,
            message.channel
          ),
          source: "chat",
        })
      }

      if (cancelled || nextQueueItems.length === 0) {
        return
      }

      setPlaybackQueue((current) => {
        const knownIds = new Set(current.map((item) => item.id))
        const newItems = nextQueueItems.filter((item) => !knownIds.has(item.id))

        if (isBigChat) {
          // Big-chat mode: keep the currently-playing item (index 0) and
          // replace any pending items with the single newest message.
          const newest = newItems[newItems.length - 1]
          if (!newest) return current
          if (current.length === 0) return [newest]
          return [current[0]!, newest]
        }

        // Small-chat mode: merge all new items and cap at queue size.
        const merged = [...current, ...newItems]
        return merged.slice(0, queueCapacity)
      })
    }

    processMessages()

    return () => {
      cancelled = true
    }
  }, [
    config,
    messages,
    ready,
    queueCapacity,
    chatCommandActions,
  ])

  // -----------------------------------------------------------------------
  // Speech consumer - plays items one at a time
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
      speakOffsetRef.current = 0
      utteranceCharIndexRef.current = 0
      setActivePlaybackItemId(null)
      return
    }

    const remainingText = item.text.slice(speakOffsetRef.current)
    if (!remainingText.trim()) {
      speakOffsetRef.current = 0
      utteranceCharIndexRef.current = 0
      setActivePlaybackItemId(null)
      setPlaybackQueue((current) => current.slice(1))
      return
    }

    softPausingRef.current = false
    utteranceCharIndexRef.current = 0
    setIsPlayingQueue(true)
    setActivePlaybackItemId(item.id)

    const utterance = new SpeechSynthesisUtterance(remainingText)

    const synthVoice = findSynthVoice(item.profile.voice)
    if (synthVoice) {
      utterance.voice = synthVoice
    }

    utterance.rate = configRateToSpeechRate(item.profile.rate)
    utterance.pitch = configPitchToSpeechPitch(item.profile.pitch)
    utterance.volume = configVolumeToSpeechVolume(item.profile.volume)

    utterance.onboundary = (event) => {
      if (typeof event.charIndex === "number" && event.charIndex >= 0) {
        utteranceCharIndexRef.current = event.charIndex
      }
    }

    utterance.onend = () => {
      if (softPausingRef.current) {
        softPausingRef.current = false
        return
      }

      speakOffsetRef.current = 0
      utteranceCharIndexRef.current = 0
      setActivePlaybackItemId(null)
      setPlaybackQueue((current) => current.slice(1))
      setIsPlayingQueue(false)
    }

    utterance.onerror = (event) => {
      // Soft-pause, skip, and clear all call cancel(). Soft-pause keeps the
      // queue item; skip/clear already removed it and reset state.
      if (event.error === "canceled" || event.error === "interrupted") {
        if (softPausingRef.current) {
          softPausingRef.current = false
        }
        return
      }
      toast.error(`Speech failed: ${event.error}`)
      speakOffsetRef.current = 0
      utteranceCharIndexRef.current = 0
      setActivePlaybackItemId(null)
      setPlaybackQueue((current) => current.slice(1))
      setIsPlayingQueue(false)
    }

    synth.speak(utterance)
    // Include `enabled` so re-enabling playback kicks the consumer when the
    // queue already has items and nothing is currently speaking.
  }, [isPlayingQueue, queueLength, config.playback.enabled])

  // -----------------------------------------------------------------------
  // Connection helpers
  // -----------------------------------------------------------------------

  const clearChatPlaybackQueue = React.useCallback(() => {
    const currentItem = playbackQueueRef.current[0]

    if (currentItem?.source === "chat") {
      softPausingRef.current = false
      speakOffsetRef.current = 0
      utteranceCharIndexRef.current = 0
      setActivePlaybackItemId(null)
      window.speechSynthesis?.cancel()
      setIsPlayingQueue(false)
    }

    setPlaybackQueue((current) =>
      current.filter((item) => item.source !== "chat")
    )
  }, [])

  const startConnection = React.useCallback(
    async (channel: string) => {
      clearChatPlaybackQueue()
      return startChatConnection(channel)
    },
    [clearChatPlaybackQueue, startChatConnection]
  )

  const stopConnection = React.useCallback(() => {
    clearChatPlaybackQueue()
    stopChatConnection()
  }, [clearChatPlaybackQueue, stopChatConnection])

  React.useEffect(() => {
    if (!ready || needsOnboarding || autoConnectedRef.current) return
    autoConnectedRef.current = true

    const urlParam = parseChannelSearchParam()
    if (urlParam.kind === "invalid") {
      toast.error("Invalid channel in URL. Use ?channel=your_twitch_name")
    }

    const urlChannel = urlParam.kind === "valid" ? urlParam.channel : null
    if (urlChannel) {
      updateConfig((current) => ({
        ...current,
        twitch: normalizeTwitchConfig({
          ...current.twitch,
          channel: urlChannel,
        }),
      }))
    }

    const configChannel = config.twitch.channel.trim()
    const channel = urlChannel ?? configChannel
    const shouldConnect =
      Boolean(channel) &&
      (urlChannel !== null || config.twitch.autoConnect) &&
      !connectionState.connected &&
      !connectionState.connecting

    if (shouldConnect && channel) {
      toast.promise(startConnection(channel), {
        loading: `Connecting to #${channel}…`,
        success: (ch) => `Connected to #${ch}`,
        error: (err) =>
          err instanceof Error ? err.message : "Connection failed",
      })
    }
  }, [ready, needsOnboarding]) // eslint-disable-line react-hooks/exhaustive-deps

  // -----------------------------------------------------------------------
  // Context value
  // -----------------------------------------------------------------------

  const configValue = React.useMemo<ChatvoiceConfigContextValue>(
    () => ({
      config,
      ready,
      needsOnboarding,
      completeOnboarding,
      updateConfig,
      restoreBackup,
      voices,
      voicesLoading,
      memberBadgeByUserId,
      memberBadgesReady,
    }),
    [
      config,
      ready,
      needsOnboarding,
      completeOnboarding,
      updateConfig,
      restoreBackup,
      voices,
      voicesLoading,
      memberBadgeByUserId,
      memberBadgesReady,
    ]
  )

  const chatValue = React.useMemo<ChatvoiceChatContextValue>(
    () => ({
      connectionState,
      messages,
      timeline,
      logs,
      startConnection,
      stopConnection,
      playbackQueue,
      setPlaybackQueue,
      isPlayingQueue,
      activePlaybackItemId,
      lastSpokenMessageId,
      skipCurrent,
      clearQueue,
    }),
    [
      connectionState,
      messages,
      timeline,
      logs,
      startConnection,
      stopConnection,
      playbackQueue,
      isPlayingQueue,
      activePlaybackItemId,
      lastSpokenMessageId,
      skipCurrent,
      clearQueue,
    ]
  )

  return (
    <ChatvoiceConfigContext.Provider value={configValue}>
      <ChatvoiceChatContext.Provider value={chatValue}>
        {children}
      </ChatvoiceChatContext.Provider>
    </ChatvoiceConfigContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Shared helpers (used across pages)
// ---------------------------------------------------------------------------

export function shouldSpeakMessage(
  message: {
    userName: string
    text: string
    emotes?: TwitchEmote[]
    flags: {
      isBroadcaster: boolean
      isModerator: boolean
      isSubscriber: boolean
    }
  },
  config: AppConfig
): { allowed: boolean; text: string } {
  const sanitized = sanitizeMessageText(message.text, {
    stripLinks: config.playback.stripLinks,
    stripMentions: config.playback.stripMentions,
    stripEmotes: config.playback.stripEmotes,
    emotes: message.emotes,
  })
  const normalizedUser = normalizeLookupValue(message.userName)
  const blockedUsernames = new Set(
    config.playback.blockedUsers.map(normalizeLookupValue)
  )
  const blockedTerms = config.playback.blockedTerms.map((item) =>
    item.toLowerCase()
  )

  if (!config.playback.queueEnabled) {
    return { allowed: false, text: sanitized }
  }

  if (config.playback.ignoreCommands && /^[!?]/.test(sanitized)) {
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

export function formatMessageTimestamp(
  value: string,
  format: MessageTimestampFormat
) {
  if (format === "none") {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  if (format === "24-hour") {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date)
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  if (format === "12-hour-meridiem") {
    return formatter.format(date)
  }

  return formatter
    .formatToParts(date)
    .filter((part) => part.type !== "dayPeriod")
    .map((part) => part.value)
    .join("")
    .trim()
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
