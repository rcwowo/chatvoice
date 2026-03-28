import * as React from "react"

import {
  type ChatConnectionState,
  type ChatMessageEvent,
  type ServerEvent,
  type ServerVoice,
  connectChat,
  disconnectChat,
  fetchChatState,
  listVoices,
  openChatEventStream,
  synthesizeSpeech,
  type ConnectChatInput,
} from "@/lib/chatvoice-api"

const MESSAGE_LIMIT = 60

export function useChatvoiceServer() {
  const [voices, setVoices] = React.useState<ServerVoice[]>([])
  const [voicesLoading, setVoicesLoading] = React.useState(true)
  const [connectionState, setConnectionState] =
    React.useState<ChatConnectionState | null>(null)
  const [eventsReady, setEventsReady] = React.useState(false)
  const [messages, setMessages] = React.useState<ChatMessageEvent[]>([])
  const [serverLogs, setServerLogs] = React.useState<string[]>([])

  React.useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const [nextVoices, nextState] = await Promise.all([
          listVoices(),
          fetchChatState(),
        ])

        if (cancelled) {
          return
        }

        setVoices(nextVoices)
        setConnectionState(nextState)
      } catch (error) {
        if (!cancelled) {
          appendLog(
            setServerLogs,
            error instanceof Error
              ? error.message
              : "Failed to reach Chatvoice server"
          )
        }
      } finally {
        if (!cancelled) {
          setVoicesLoading(false)
        }
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    const eventSource = openChatEventStream(
      (event) => {
        setEventsReady(true)
        handleServerEvent(event, setConnectionState, setMessages, setServerLogs)
      },
      () => {
        appendLog(
          setServerLogs,
          "Chat event stream disconnected; retrying automatically."
        )
      }
    )

    return () => {
      eventSource.close()
    }
  }, [])

  const refreshConnectionState = React.useCallback(async () => {
    const nextState = await fetchChatState()
    setConnectionState(nextState)
    return nextState
  }, [])

  const startConnection = React.useCallback(async (input: ConnectChatInput) => {
    const nextState = await connectChat(input)
    setConnectionState(nextState)
    return nextState
  }, [])

  const stopConnection = React.useCallback(async () => {
    const nextState = await disconnectChat()
    setConnectionState(nextState)
    return nextState
  }, [])

  const requestSpeech = React.useCallback(
    async (input: {
      text: string
      voice: string
      rate: number
      pitch: number
      volume: number
    }) => {
      return synthesizeSpeech(input)
    },
    []
  )

  return {
    voices,
    voicesLoading,
    connectionState,
    eventsReady,
    messages,
    serverLogs,
    refreshConnectionState,
    startConnection,
    stopConnection,
    requestSpeech,
  }
}

function handleServerEvent(
  event: ServerEvent,
  setConnectionState: React.Dispatch<
    React.SetStateAction<ChatConnectionState | null>
  >,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageEvent[]>>,
  setServerLogs: React.Dispatch<React.SetStateAction<string[]>>
) {
  switch (event.type) {
    case "status":
      setConnectionState(event.status)
      return
    case "chat":
      setMessages((current) =>
        [event.message, ...current].slice(0, MESSAGE_LIMIT)
      )
      return
    case "error":
      appendLog(setServerLogs, event.message)
      return
    case "log":
      appendLog(setServerLogs, event.message)
      return
  }
}

function appendLog(
  setServerLogs: React.Dispatch<React.SetStateAction<string[]>>,
  message: string
) {
  setServerLogs((current) => [message, ...current].slice(0, 20))
}
