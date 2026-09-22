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
  ensureVoiceAssignment,
  normalizeLookupValue,
  normalizeTwitchConfig,
  parseChannelSearchParam,
  sanitizeMessageText,
} from "@/lib/chatvoice-config"
import type { AppConfig } from "@/lib/chatvoice-config"
import {
  buildMessageSegments,
  type MessageSoundSegment,
} from "@/lib/sound-effects"
import { applyWordReplacements } from "@/lib/moderation"
import { getSoundEffectAudio } from "@/lib/sound-effects-db"
import {
  canRunChatCommand,
  tryHandleChatCommand,
  parseChatCommand,
} from "@/lib/chat-commands"
import type { MemberBadge } from "@/lib/member-badges"
import type {
  TwitchChatMessage,
  TwitchConnectionState,
  TwitchEmote,
} from "@/lib/twitch-chat"

export type PlaybackQueueItem = {
  id: string
  assignment: VoiceAssignment
  profile: VoiceProfile
  /** Ordered speech / sound effect parts used during playback. */
  segments: MessageSoundSegment[]
  /** Human-readable queue preview with sound tokens shown as `[name]`. */
  text: string
  source: "chat" | "preview"
}

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

export function ChatvoiceProvider({ children }: { children: React.ReactNode }) {
  const {
    config,
    ready,
    needsOnboarding,
    completeOnboarding,
    updateConfig,
    restoreBackup,
  } = useChatvoiceConfig()
  const {
    connectionState,
    messages,
    timeline,
    logs,
    startConnection: startChatConnection,
    stopConnection: stopChatConnection,
  } = useTwitchChat(config.playback.maxDisplayedMessages)
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
  const segmentIndexRef = React.useRef(0)
  const activeAudioRef = React.useRef<HTMLAudioElement | null>(null)
  const activeAudioUrlRef = React.useRef<string | null>(null)
  /** Incremented to invalidate an in-flight sound effect (skip/clear/pause). */
  const soundRequestRef = React.useRef(0)
  /** Serializes enqueue batches; a batch must never cancel in-flight work. */
  const enqueueChainRef = React.useRef<Promise<void>>(Promise.resolve())

  const stopActiveAudio = React.useCallback(() => {
    const audio = activeAudioRef.current
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
      activeAudioRef.current = null
    }

    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current)
      activeAudioUrlRef.current = null
    }
  }, [])

  const cancelActiveSound = React.useCallback(() => {
    soundRequestRef.current += 1
    stopActiveAudio()
  }, [stopActiveAudio])

  React.useEffect(() => {
    return () => {
      soundRequestRef.current += 1
      stopActiveAudio()
    }
  }, [stopActiveAudio])

  const resetPlaybackProgress = React.useCallback(() => {
    segmentIndexRef.current = 0
    speakOffsetRef.current = 0
    utteranceCharIndexRef.current = 0
  }, [])

  const playSoundEffect = React.useCallback(
    async (soundId: string, volume: number, requestId: number) => {
      const record = await getSoundEffectAudio(soundId)
      // Abort if playback was skipped/cleared while loading.
      if (soundRequestRef.current !== requestId) {
        return
      }
      if (!record) {
        throw new Error("Sound effect audio not found")
      }

      const url = URL.createObjectURL(record.blob)
      activeAudioUrlRef.current = url

      const audio = new Audio(url)
      audio.volume = Math.min(1, Math.max(0, volume))
      activeAudioRef.current = audio

      try {
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve()
          audio.onerror = () => reject(new Error("Sound effect failed to play"))
          audio.play().catch(reject)
        })
      } finally {
        stopActiveAudio()
      }
    },
    [stopActiveAudio]
  )

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
    cancelActiveSound()
    synth.cancel()
    setIsPlayingQueue(false)
  }, [config.playback.enabled, cancelActiveSound])

  React.useEffect(() => {
    if (messages.length !== 0 || lastSpokenMessageIdRef.current === null) {
      return
    }

    lastSpokenMessageIdRef.current = null
    setLastSpokenMessageId(null)
  }, [messages.length])

  const autoConnectedRef = React.useRef(false)

  const skipCurrent = React.useCallback(() => {
    softPausingRef.current = false
    cancelActiveSound()
    resetPlaybackProgress()
    setActivePlaybackItemId(null)
    window.speechSynthesis?.cancel()
    setPlaybackQueue((current) => current.slice(1))
    setIsPlayingQueue(false)
  }, [cancelActiveSound, resetPlaybackProgress])

  const clearQueue = React.useCallback(() => {
    softPausingRef.current = false
    cancelActiveSound()
    resetPlaybackProgress()
    setActivePlaybackItemId(null)
    window.speechSynthesis?.cancel()
    setPlaybackQueue([])
    setIsPlayingQueue(false)
  }, [cancelActiveSound, resetPlaybackProgress])

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

  React.useEffect(() => {
    if (!ready) {
      return
    }

    // Messages are chronological (oldest first); find new ones after the
    // last processed id.
    let startIdx = 0
    if (lastSpokenMessageIdRef.current) {
      const idx = messages.findIndex(
        (m) => m.id === lastSpokenMessageIdRef.current
      )
      startIdx = idx === -1 ? messages.length : idx + 1
    }

    const pendingMessages = messages.slice(startIdx)
    if (pendingMessages.length === 0) {
      return
    }

    // Mark all as "seen" immediately via ref so we don't re-process,
    // without causing a re-render that would restart the async work below.
    const newLastId =
      messages[messages.length - 1]?.id ?? lastSpokenMessageIdRef.current
    lastSpokenMessageIdRef.current = newLastId
    setLastSpokenMessageId(newLastId)

    const isBigChat = config.playback.queueMode === "big-chat"

    async function processMessages(batch: TwitchChatMessage[]) {
      // Evaluate commands for every message so !cv actions still run in
      // big-chat mode even when older pending messages are not spoken.
      for (const message of batch) {
        await tryHandleChatCommand(message, config, chatCommandActions)
      }

      const messagesToProcess = isBigChat ? batch.slice(-1) : batch

      const nextQueueItems: PlaybackQueueItem[] = []

      for (const message of messagesToProcess) {
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

        const built = buildMessageSegments({
          template: config.playback.textTemplate,
          message: decision.text,
          userName: message.userName,
          displayName: message.displayName,
          channel: message.channel,
          sounds: config.soundEffects,
          canUseSound: (sound) =>
            canRunChatCommand(
              sound,
              message.flags,
              message.userName,
              config.commands.whitelist
            ),
          replacements: config.playback.wordReplacements,
        })

        nextQueueItems.push({
          id: message.id,
          assignment: ensured.assignment,
          profile,
          segments: built.segments,
          text: built.text,
          source: "chat",
        })
      }

      if (nextQueueItems.length === 0) {
        return
      }

      setPlaybackQueue((current) => {
        const knownIds = new Set(current.map((item) => item.id))
        const newItems = nextQueueItems.filter((item) => !knownIds.has(item.id))

        if (isBigChat) {
          const newest = newItems[newItems.length - 1]
          if (!newest) return current
          if (current.length === 0) return [newest]
          return [current[0]!, newest]
        }

        const merged = [...current, ...newItems]
        return merged.slice(0, queueCapacity)
      })
    }

    // Batches must never be cancelled mid-flight: the seen-ref has already
    // advanced past them, so discarding in-flight work would silently drop
    // those messages from speech. Chain batches instead so they run
    // sequentially; dedup-by-id in setPlaybackQueue absorbs any overlap.
    enqueueChainRef.current = enqueueChainRef.current
      .then(() => processMessages(pendingMessages))
      .catch(() => {})
  }, [config, messages, ready, queueCapacity, chatCommandActions])

  const queueLength = playbackQueue.length

  React.useEffect(() => {
    if (isPlayingQueue || queueLength === 0 || !playbackEnabledRef.current) {
      return
    }

    const item = playbackQueueRef.current[0]
    if (!item) return

    const segments = item.segments
    let segmentIndex = segmentIndexRef.current

    // Skip speech segments that are already fully spoken at the resume point.
    while (segmentIndex < segments.length) {
      const candidate = segments[segmentIndex]
      if (
        candidate?.kind === "speech" &&
        !candidate.text.slice(speakOffsetRef.current).trim()
      ) {
        speakOffsetRef.current = 0
        segmentIndex += 1
        continue
      }
      break
    }

    if (segmentIndex >= segments.length) {
      resetPlaybackProgress()
      setActivePlaybackItemId(null)
      setPlaybackQueue((current) => current.slice(1))
      setIsPlayingQueue(false)
      return
    }

    segmentIndexRef.current = segmentIndex
    const segment = segments[segmentIndex]!

    if (segment.kind === "sound") {
      const sound = config.soundEffects.find(
        (entry) => entry.id === segment.soundId
      )
      setIsPlayingQueue(true)
      setActivePlaybackItemId(item.id)

      // NOTE: no cleanup is returned here. This effect re-runs when the
      // `isPlayingQueue` update above flips to true, and a cleanup would fire
      // immediately and cancel the sound we just started. Skip/clear/pause
      // call `cancelActiveSound` explicitly instead.
      const requestId = ++soundRequestRef.current
      void playSoundEffect(segment.soundId, sound?.volume ?? 1, requestId)
        .catch(() => {
          // Missing or blocked audio should never stall the queue.
        })
        .then(() => {
          if (soundRequestRef.current !== requestId) return
          segmentIndexRef.current += 1
          speakOffsetRef.current = 0
          setIsPlayingQueue(false)
        })

      return
    }

    const synth = window.speechSynthesis
    if (!synth) {
      toast.error("SpeechSynthesis is not available in this browser.")
      resetPlaybackProgress()
      setActivePlaybackItemId(null)
      setPlaybackQueue((current) => current.slice(1))
      return
    }

    const remainingText = segment.text.slice(speakOffsetRef.current)
    if (!remainingText.trim()) {
      segmentIndexRef.current += 1
      speakOffsetRef.current = 0
      setIsPlayingQueue(false)
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

      segmentIndexRef.current += 1
      speakOffsetRef.current = 0
      utteranceCharIndexRef.current = 0
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
      segmentIndexRef.current += 1
      speakOffsetRef.current = 0
      utteranceCharIndexRef.current = 0
      setIsPlayingQueue(false)
    }

    synth.speak(utterance)
    // Include `enabled` so re-enabling playback kicks the consumer when the
    // queue already has items and nothing is currently speaking.
  }, [
    isPlayingQueue,
    queueLength,
    config.playback.enabled,
    config.soundEffects,
    playSoundEffect,
    resetPlaybackProgress,
    stopActiveAudio,
  ])

  const clearChatPlaybackQueue = React.useCallback(() => {
    const currentItem = playbackQueueRef.current[0]

    if (currentItem?.source === "chat") {
      softPausingRef.current = false
      cancelActiveSound()
      resetPlaybackProgress()
      setActivePlaybackItemId(null)
      window.speechSynthesis?.cancel()
      setIsPlayingQueue(false)
    }

    setPlaybackQueue((current) =>
      current.filter((item) => item.source !== "chat")
    )
  }, [cancelActiveSound, resetPlaybackProgress])

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

const blockedLookupCache = new WeakMap<
  AppConfig,
  { blockedUsernames: Set<string>; blockedTerms: string[] }
>()

function getBlockedLookups(config: AppConfig) {
  let cached = blockedLookupCache.get(config)
  if (!cached) {
    cached = {
      blockedUsernames: new Set(
        config.playback.blockedUsers.map(normalizeLookupValue)
      ),
      blockedTerms: config.playback.blockedTerms.map((item) =>
        item.toLowerCase()
      ),
    }
    blockedLookupCache.set(config, cached)
  }
  return cached
}

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
  // Length limits apply to what will actually be spoken, so a message that is
  // entirely removed by replacements is never queued as silence.
  const speakable = applyWordReplacements(
    sanitized,
    config.playback.wordReplacements
  )
  const normalizedUser = normalizeLookupValue(message.userName)
  const { blockedUsernames, blockedTerms } = getBlockedLookups(config)

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

  if (speakable.length < config.playback.minMessageLength) {
    return { allowed: false, text: sanitized }
  }

  if (speakable.length > config.playback.maxMessageLength) {
    return { allowed: false, text: sanitized }
  }

  return { allowed: speakable.length > 0, text: sanitized }
}

export function parseLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const timestampFormatters: Record<
  Exclude<MessageTimestampFormat, "none">,
  Intl.DateTimeFormat
> = {
  "24-hour": new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }),
  "12-hour": new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }),
  "12-hour-meridiem": new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }),
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

  if (format === "12-hour") {
    return timestampFormatters["12-hour-meridiem"]
      .formatToParts(date)
      .filter((part) => part.type !== "dayPeriod")
      .map((part) => part.value)
      .join("")
      .trim()
  }

  return timestampFormatters[format].format(date)
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

export function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return dateTimeFormatter.format(date)
}
