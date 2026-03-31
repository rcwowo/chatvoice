import * as React from "react"

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
        case "message":
          setMessages((current) =>
            [...current, event.message].slice(-MESSAGE_LIMIT)
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
          if (pendingConnectRef.current) {
            pendingConnectRef.current.reject(new Error(event.text))
            pendingConnectRef.current = null
          }
          break
      }
    })

    clientRef.current = client
    return client
  }, [appendLog]) // eslint-disable-line react-hooks/exhaustive-deps

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
