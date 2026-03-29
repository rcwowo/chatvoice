import * as React from "react"

import {
  TwitchChatClient,
  type TwitchChatMessage,
  type TwitchConnectionState,
} from "@/lib/twitch-chat"

const MESSAGE_LIMIT = 60

export function useTwitchChat() {
  const clientRef = React.useRef<TwitchChatClient | null>(null)
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
          break
        case "disconnected":
          setConnectionState((prev) => ({
            ...prev,
            connected: false,
            connecting: false,
            lastError: event.reason,
          }))
          break
        case "message":
          setMessages((current) =>
            [event.message, ...current].slice(0, MESSAGE_LIMIT)
          )
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
          break
      }
    })

    clientRef.current = client
    return client
  }, [appendLog])

  // Disconnect on unmount
  React.useEffect(() => {
    return () => {
      clientRef.current?.disconnect()
    }
  }, [])

  const startConnection = React.useCallback(
    (channel: string) => {
      setConnectionState({
        connected: false,
        connecting: true,
        channel: channel.trim().replace(/^#/, "").toLowerCase(),
        lastError: null,
      })
      getClient().connect(channel)
    },
    [getClient]
  )

  const stopConnection = React.useCallback(() => {
    clientRef.current?.disconnect()
    setConnectionState((prev) => ({
      ...prev,
      connected: false,
      connecting: false,
    }))
  }, [])

  return {
    connectionState,
    messages,
    logs,
    startConnection,
    stopConnection,
  }
}
