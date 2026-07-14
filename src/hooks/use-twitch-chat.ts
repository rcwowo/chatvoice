import * as React from "react"

import {
  createEmptyBadgeCatalog,
  fetchTwitchBadgeCatalog,
  hydrateMessageBadges,
  type TwitchBadgeCatalog,
} from "@/lib/chat-badges"
import {
  createEmptyEmoteCatalog,
  fetchThirdPartyEmoteCatalog,
  hydrateMessageEmotes,
  hydrateSystemMessageEmotes,
  type ThirdPartyEmoteCatalog,
} from "@/lib/chat-emotes"
import {
  TwitchChatClient,
  type TwitchChatMessage,
  type TwitchConnectionState,
  type TwitchSystemMessage,
} from "@/lib/twitch-chat"

const DEFAULT_MESSAGE_LIMIT = 60

export type TwitchTimelineItem =
  | { kind: "chat"; message: TwitchChatMessage }
  | { kind: "system"; message: TwitchSystemMessage }

type PendingConnect = {
  channel: string
  resolve: (channel: string) => void
  reject: (err: Error) => void
}

export function useTwitchChat(messageLimit: number = DEFAULT_MESSAGE_LIMIT) {
  const clientRef = React.useRef<TwitchChatClient | null>(null)
  const pendingConnectRef = React.useRef<PendingConnect | null>(null)
  const pendingRoomMessagesRef = React.useRef(new Map<string, TwitchChatMessage[]>())
  const emoteCatalogRef = React.useRef(createEmptyEmoteCatalog())
  const emoteCatalogRoomIdRef = React.useRef<string | null>(null)
  const emoteCatalogLoadingRoomIdRef = React.useRef<string | null>(null)
  const emoteCatalogGenerationRef = React.useRef(0)
  const badgeCatalogRef = React.useRef(createEmptyBadgeCatalog())
  const badgeCatalogChannelRef = React.useRef<string | null>(null)
  const badgeCatalogLoadingChannelRef = React.useRef<string | null>(null)
  const badgeCatalogGenerationRef = React.useRef(0)
  const activeChannelRef = React.useRef<string | null>(null)
  const hasAnnouncedConnectedRef = React.useRef(false)
  const messageLimitRef = React.useRef(messageLimit)
  messageLimitRef.current = messageLimit
  const [connectionState, setConnectionState] =
    React.useState<TwitchConnectionState>({
      connected: false,
      connecting: false,
      channel: null,
      lastError: null,
    })
  const [messages, setMessages] = React.useState<TwitchChatMessage[]>([])
  const [timeline, setTimeline] = React.useState<TwitchTimelineItem[]>([])
  const [logs, setLogs] = React.useState<string[]>([])

  React.useEffect(() => {
    setMessages((current) =>
      current.length > messageLimit ? current.slice(-messageLimit) : current
    )
    setTimeline((current) =>
      current.length > messageLimit ? current.slice(-messageLimit) : current
    )
  }, [messageLimit])

  // Stable log appender
  const appendLog = React.useCallback((text: string) => {
    setLogs((current) => [text, ...current].slice(0, 20))
  }, [])

  const resetThirdPartyEmotes = React.useCallback(() => {
    pendingRoomMessagesRef.current.clear()
    emoteCatalogRef.current = createEmptyEmoteCatalog()
    emoteCatalogRoomIdRef.current = null
    emoteCatalogLoadingRoomIdRef.current = null
    emoteCatalogGenerationRef.current += 1
  }, [])

  const resetTwitchBadges = React.useCallback(() => {
    badgeCatalogRef.current = createEmptyBadgeCatalog()
    badgeCatalogChannelRef.current = null
    badgeCatalogLoadingChannelRef.current = null
    badgeCatalogGenerationRef.current += 1
  }, [])

  const hydrateChatMessage = React.useCallback(
    (
      message: TwitchChatMessage,
      emoteCatalog: ThirdPartyEmoteCatalog | null = emoteCatalogRef.current,
      badgeCatalog: TwitchBadgeCatalog | null = badgeCatalogRef.current
    ): TwitchChatMessage =>
      hydrateMessageBadges(
        hydrateMessageEmotes(message, emoteCatalog),
        badgeCatalog
      ),
    []
  )

  const appendMessages = React.useCallback((nextMessages: TwitchChatMessage[]) => {
    if (nextMessages.length === 0) {
      return
    }

    const limit = messageLimitRef.current
    setMessages((current) => [...current, ...nextMessages].slice(-limit))
    setTimeline((current) => [
      ...current,
      ...nextMessages.map((message) => ({ kind: "chat" as const, message })),
    ].slice(-limit))
  }, [])

  const appendSystemMessage = React.useCallback((message: TwitchSystemMessage) => {
    const hydrated = hydrateSystemMessageEmotes(
      message,
      message.roomId && emoteCatalogRoomIdRef.current === message.roomId
        ? emoteCatalogRef.current
        : null
    )
    const limit = messageLimitRef.current
    setTimeline((current) => [
      ...current,
      { kind: "system" as const, message: hydrated },
    ].slice(-limit))
  }, [])

  const resetChatState = React.useCallback(() => {
    setMessages([])
    setTimeline([])
    setLogs([])
  }, [])

  const flushPendingRoomMessages = React.useCallback(
    (roomId: string, useCatalog: boolean) => {
      const pending = pendingRoomMessagesRef.current.get(roomId)
      if (!pending || pending.length === 0) {
        return
      }

      pendingRoomMessagesRef.current.delete(roomId)
      appendMessages(
        pending.map((message) =>
          hydrateChatMessage(
            message,
            useCatalog ? emoteCatalogRef.current : null,
            badgeCatalogRef.current
          )
        )
      )
    },
    [appendMessages, hydrateChatMessage]
  )

  const queuePendingRoomMessage = React.useCallback((message: TwitchChatMessage) => {
    const roomId = message.roomId
    if (!roomId) {
      appendMessages([hydrateChatMessage(message, null, badgeCatalogRef.current)])
      return
    }

    const pending = pendingRoomMessagesRef.current.get(roomId) ?? []
    pending.push(message)
    pendingRoomMessagesRef.current.set(roomId, pending)
  }, [appendMessages, hydrateChatMessage])

  const maybeLoadTwitchBadges = React.useCallback(
    (channel: string | null) => {
      const login = channel?.trim().replace(/^#/, "").toLowerCase() ?? ""
      if (
        !login ||
        badgeCatalogChannelRef.current === login ||
        badgeCatalogLoadingChannelRef.current === login
      ) {
        return
      }

      badgeCatalogLoadingChannelRef.current = login
      const generation = badgeCatalogGenerationRef.current

      void fetchTwitchBadgeCatalog(login)
        .then((catalog) => {
          if (generation !== badgeCatalogGenerationRef.current) {
            return
          }

          badgeCatalogRef.current = catalog
          badgeCatalogChannelRef.current = login
          badgeCatalogLoadingChannelRef.current = null

          setMessages((current) =>
            current.map((entry) =>
              entry.channel.toLowerCase() === login
                ? hydrateMessageBadges(entry, catalog)
                : entry
            )
          )
          setTimeline((current) =>
            current.map((entry) => {
              if (entry.kind !== "chat") {
                return entry
              }

              return entry.message.channel.toLowerCase() === login
                ? {
                    ...entry,
                    message: hydrateMessageBadges(entry.message, catalog),
                  }
                : entry
            })
          )

          appendLog(`Loaded ${catalog.size} Twitch badges for #${login}`)
        })
        .catch(() => {
          if (generation !== badgeCatalogGenerationRef.current) {
            return
          }

          badgeCatalogRef.current = createEmptyBadgeCatalog()
          badgeCatalogChannelRef.current = login
          badgeCatalogLoadingChannelRef.current = null
          appendLog("Twitch badges could not be loaded.")
        })
    },
    [appendLog]
  )

  const maybeLoadThirdPartyEmotes = React.useCallback(
    (roomId: string | null) => {
      if (
        !roomId ||
        emoteCatalogRoomIdRef.current === roomId ||
        emoteCatalogLoadingRoomIdRef.current === roomId
      ) {
        return
      }

      emoteCatalogLoadingRoomIdRef.current = roomId
      const generation = emoteCatalogGenerationRef.current

      void fetchThirdPartyEmoteCatalog(roomId)
        .then((catalog) => {
          if (generation !== emoteCatalogGenerationRef.current) {
            return
          }

          emoteCatalogRef.current = catalog
          emoteCatalogRoomIdRef.current = roomId
          emoteCatalogLoadingRoomIdRef.current = null

          setMessages((current) =>
            current.map((entry) =>
              entry.roomId === roomId
                ? hydrateChatMessage(entry, emoteCatalogRef.current)
                : entry
            )
          )
          setTimeline((current) =>
            current.map((entry) => {
              if (entry.kind === "chat") {
                return entry.message.roomId === roomId
                  ? {
                      ...entry,
                      message: hydrateChatMessage(
                        entry.message,
                        emoteCatalogRef.current
                      ),
                    }
                  : entry
              }

              return entry.message.roomId === roomId
                ? {
                    ...entry,
                    message: hydrateSystemMessageEmotes(
                      entry.message,
                      emoteCatalogRef.current
                    ),
                  }
                : entry
            })
          )
          flushPendingRoomMessages(roomId, true)

          appendLog(`Loaded ${catalog.size} third-party emotes for room ${roomId}`)
        })
        .catch(() => {
          if (generation !== emoteCatalogGenerationRef.current) {
            return
          }

          emoteCatalogRef.current = createEmptyEmoteCatalog()
          emoteCatalogRoomIdRef.current = roomId
          emoteCatalogLoadingRoomIdRef.current = null
          flushPendingRoomMessages(roomId, false)
          appendLog("Third-party emotes could not be loaded.")
        })
    },
    [appendLog, flushPendingRoomMessages, hydrateChatMessage]
  )

  // Lazily create the client with a stable handler
  const getClient = React.useCallback(() => {
    if (clientRef.current) return clientRef.current

    const client = new TwitchChatClient((event) => {
      switch (event.type) {
        case "connected":
          setConnectionState((prev) => ({
            ...prev,
            connected: true,
            connecting: false,
            lastError: null,
          }))
          if (!hasAnnouncedConnectedRef.current) {
            appendSystemMessage({
              id: `system:connected:${Date.now()}`,
              channel: activeChannelRef.current,
              roomId: null,
              text: activeChannelRef.current
                ? `Connected to #${activeChannelRef.current}`
                : "Connected to Twitch chat",
              headline: activeChannelRef.current
                ? `Connected to #${activeChannelRef.current}`
                : "Connected to Twitch chat",
              details: null,
              emotes: [],
              receivedAt: new Date().toISOString(),
              event: "connection",
              level: "success",
              accentColor: null,
            })
            hasAnnouncedConnectedRef.current = true
          }
          if (pendingConnectRef.current) {
            pendingConnectRef.current.resolve(pendingConnectRef.current.channel)
            pendingConnectRef.current = null
          }
          break
        case "disconnected":
          setConnectionState((prev) => ({
            ...prev,
            connected: false,
            connecting: false,
            lastError: event.reason,
          }))
          appendSystemMessage({
            id: `system:disconnected:${Date.now()}`,
            channel: activeChannelRef.current,
            roomId: null,
            text: event.reason ? `Disconnected: ${event.reason}` : "Disconnected",
            headline: event.reason ? "Disconnected" : "Disconnected",
            details: event.reason,
            emotes: [],
            receivedAt: new Date().toISOString(),
            event: "connection",
            level: event.reason ? "warning" : "info",
            accentColor: null,
          })
          if (pendingConnectRef.current) {
            pendingConnectRef.current.reject(
              new Error(event.reason ?? "Disconnected")
            )
            pendingConnectRef.current = null
          }
          break
        case "room-state":
          maybeLoadThirdPartyEmotes(event.state.roomId)
          break
        case "message":
          if (
            event.message.roomId &&
            emoteCatalogRoomIdRef.current !== event.message.roomId
          ) {
            maybeLoadThirdPartyEmotes(event.message.roomId)
            queuePendingRoomMessage(event.message)
            break
          }

          appendMessages([hydrateChatMessage(event.message)])
          break
        case "system":
          appendSystemMessage(event.message)
          break
        case "log":
          appendLog(event.text)
          break
        case "error":
          appendLog(event.text)
          setConnectionState((prev) => ({
            ...prev,
            lastError: event.text,
          }))
          appendSystemMessage({
            id: `system:error:${Date.now()}`,
            channel: activeChannelRef.current,
            roomId: null,
            text: event.text,
            headline: "Connection issue",
            details: event.text,
            emotes: [],
            receivedAt: new Date().toISOString(),
            event: "status",
            level: "error",
            accentColor: null,
          })
          if (pendingConnectRef.current) {
            pendingConnectRef.current.reject(new Error(event.text))
            pendingConnectRef.current = null
          }
          break
      }
    })

    clientRef.current = client
    return client
  }, [
    appendLog,
    appendMessages,
    appendSystemMessage,
    hydrateChatMessage,
    maybeLoadThirdPartyEmotes,
    queuePendingRoomMessage,
  ])

  // Disconnect on unmount
  React.useEffect(() => {
    return () => {
      clientRef.current?.disconnect()
    }
  }, [])

  const startConnection = React.useCallback(
    (channel: string): Promise<string> => {
      // Reject any previously pending connect
      if (pendingConnectRef.current) {
        pendingConnectRef.current.reject(new Error("New connection started"))
        pendingConnectRef.current = null
      }

      resetThirdPartyEmotes()
      resetTwitchBadges()
      resetChatState()

      const normalizedChannel = channel.trim().replace(/^#/, "").toLowerCase()
      hasAnnouncedConnectedRef.current = false
      activeChannelRef.current = normalizedChannel
      setConnectionState({
        connected: false,
        connecting: true,
        channel: normalizedChannel,
        lastError: null,
      })
      maybeLoadTwitchBadges(normalizedChannel)

      return new Promise<string>((resolve, reject) => {
        pendingConnectRef.current = { channel: normalizedChannel, resolve, reject }
        getClient().connect(channel)
      })
    },
    [
      getClient,
      maybeLoadTwitchBadges,
      resetChatState,
      resetThirdPartyEmotes,
      resetTwitchBadges,
    ]
  )

  const stopConnection = React.useCallback(() => {
    clientRef.current?.disconnect()
    hasAnnouncedConnectedRef.current = false
    activeChannelRef.current = null
    resetThirdPartyEmotes()
    resetTwitchBadges()
    setConnectionState((prev) => ({
      ...prev,
      connected: false,
      connecting: false,
    }))
  }, [resetThirdPartyEmotes, resetTwitchBadges])

  return {
    connectionState,
    messages,
    timeline,
    logs,
    startConnection,
    stopConnection,
  }
}
