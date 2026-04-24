import * as React from "react"

import {
  createEmptyEmoteCatalog,
  fetchThirdPartyEmoteCatalog,
  hydrateMessageEmotes,
} from "@/lib/chat-emotes"
import {
  TwitchChatClient,
  type TwitchChatMessage,
  type TwitchConnectionState,
} from "@/lib/twitch-chat"

const MESSAGE_LIMIT = 60

type PendingConnect = {
  channel: string
  resolve: (channel: string) => void
  reject: (err: Error) => void
}

export function useTwitchChat() {
  const clientRef = React.useRef<TwitchChatClient | null>(null)
  const pendingConnectRef = React.useRef<PendingConnect | null>(null)
  const pendingRoomMessagesRef = React.useRef(new Map<string, TwitchChatMessage[]>())
  const emoteCatalogRef = React.useRef(createEmptyEmoteCatalog())
  const emoteCatalogRoomIdRef = React.useRef<string | null>(null)
  const emoteCatalogLoadingRoomIdRef = React.useRef<string | null>(null)
  const emoteCatalogGenerationRef = React.useRef(0)
  const [connectionState, setConnectionState] =
    React.useState<TwitchConnectionState>({
      connected: false,
      connecting: false,
      channel: null,
      lastError: null,
    })
  const [messages, setMessages] = React.useState<TwitchChatMessage[]>([])
  const [logs, setLogs] = React.useState<string[]>([])

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

  const appendMessages = React.useCallback((nextMessages: TwitchChatMessage[]) => {
    if (nextMessages.length === 0) {
      return
    }

    setMessages((current) => [...current, ...nextMessages].slice(-MESSAGE_LIMIT))
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
          hydrateMessageEmotes(
            message,
            useCatalog ? emoteCatalogRef.current : null
          )
        )
      )
    },
    [appendMessages]
  )

  const queuePendingRoomMessage = React.useCallback((message: TwitchChatMessage) => {
    const roomId = message.roomId
    if (!roomId) {
      appendMessages([hydrateMessageEmotes(message, null)])
      return
    }

    const pending = pendingRoomMessagesRef.current.get(roomId) ?? []
    pending.push(message)
    pendingRoomMessagesRef.current.set(roomId, pending)
  }, [appendMessages])

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
                ? hydrateMessageEmotes(entry, emoteCatalogRef.current)
                : entry
            )
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
    [appendLog, flushPendingRoomMessages]
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

          appendMessages([
            hydrateMessageEmotes(event.message, emoteCatalogRef.current),
          ])
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
          if (pendingConnectRef.current) {
            pendingConnectRef.current.reject(new Error(event.text))
            pendingConnectRef.current = null
          }
          break
      }
    })

    clientRef.current = client
    return client
  }, [appendLog, appendMessages, maybeLoadThirdPartyEmotes, queuePendingRoomMessage])

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

      const normalizedChannel = channel.trim().replace(/^#/, "").toLowerCase()
      setConnectionState({
        connected: false,
        connecting: true,
        channel: normalizedChannel,
        lastError: null,
      })

      return new Promise<string>((resolve, reject) => {
        pendingConnectRef.current = { channel: normalizedChannel, resolve, reject }
        getClient().connect(channel)
      })
    },
    [getClient, resetThirdPartyEmotes]
  )

  const stopConnection = React.useCallback(() => {
    clientRef.current?.disconnect()
    resetThirdPartyEmotes()
    setConnectionState((prev) => ({
      ...prev,
      connected: false,
      connecting: false,
    }))
  }, [resetThirdPartyEmotes])

  return {
    connectionState,
    messages,
    logs,
    startConnection,
    stopConnection,
  }
}
