export type ServerVoice = {
  name: string
  shortName: string
  friendlyName: string
  locale: string
  gender: string
  personalities: string[]
  categories: string[]
}

export type ChatConnectionState = {
  connected: boolean
  connecting: boolean
  authenticated: boolean
  usingAnonymousConnection: boolean
  channel: string | null
  readOnly: boolean
  lastError: string | null
  lastEventAt: string | null
}

export type ChatMessageEvent = {
  id: string
  channel: string
  userName: string
  displayName: string
  text: string
  color: string | null
  receivedAt: string
  flags: {
    isBroadcaster: boolean
    isModerator: boolean
    isSubscriber: boolean
    isVip: boolean
    isFirst: boolean
    isAction: boolean
  }
}

export type ServerEvent =
  | { type: "status"; status: ChatConnectionState }
  | { type: "chat"; message: ChatMessageEvent }
  | { type: "error"; message: string; at: string }
  | { type: "log"; message: string; at: string }

export type ConnectChatInput = {
  channel: string
  clientId: string
  accessToken: string
  readOnly: boolean
}

export type SynthesizeSpeechInput = {
  text: string
  voice: string
  rate: number
  pitch: number
  volume: number
}

const API_BASE_URL =
  import.meta.env.VITE_CHATVOICE_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3031"

export async function listVoices(): Promise<ServerVoice[]> {
  const response = await fetch(`${API_BASE_URL}/api/voices`)
  return parseJsonResponse(response)
}

export async function fetchChatState(): Promise<ChatConnectionState> {
  const response = await fetch(`${API_BASE_URL}/api/chat/state`)
  return parseJsonResponse(response)
}

export async function connectChat(
  input: ConnectChatInput
): Promise<ChatConnectionState> {
  const response = await fetch(`${API_BASE_URL}/api/chat/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  return parseJsonResponse(response)
}

export async function disconnectChat(): Promise<ChatConnectionState> {
  const response = await fetch(`${API_BASE_URL}/api/chat/disconnect`, {
    method: "POST",
  })

  return parseJsonResponse(response)
}

export async function synthesizeSpeech(
  input: SynthesizeSpeechInput
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/tts/synthesize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response.blob()
}

export function openChatEventStream(
  onEvent: (event: ServerEvent) => void,
  onError: () => void
): EventSource {
  const eventSource = new EventSource(`${API_BASE_URL}/api/events`)

  eventSource.onmessage = (event) => {
    onEvent(JSON.parse(event.data) as ServerEvent)
  }

  eventSource.onerror = () => {
    onError()
  }

  return eventSource
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as T
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string }
    return payload.error ?? "Request failed"
  } catch {
    return response.statusText || "Request failed"
  }
}
