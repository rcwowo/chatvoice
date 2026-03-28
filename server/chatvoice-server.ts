import { Buffer } from "node:buffer"
import { createHash } from "node:crypto"

import express from "express"
import { StaticAuthProvider } from "@twurple/auth"
import { ChatClient, type ChatMessage } from "@twurple/chat"
import { getVoices, tts } from "edge-tts"
import { z } from "zod"

type ChatConnectionState = {
  connected: boolean
  connecting: boolean
  authenticated: boolean
  usingAnonymousConnection: boolean
  channel: string | null
  readOnly: boolean
  lastError: string | null
  lastEventAt: string | null
}

type ServerVoice = {
  name: string
  shortName: string
  friendlyName: string
  locale: string
  gender: string
  personalities: string[]
  categories: string[]
}

type ServerEvent =
  | { type: "status"; status: ChatConnectionState }
  | { type: "chat"; message: ChatMessageEvent }
  | { type: "error"; message: string; at: string }
  | { type: "log"; message: string; at: string }

type ChatMessageEvent = {
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

const connectSchema = z.object({
  channel: z.string().trim().min(1),
  clientId: z.string().trim(),
  accessToken: z.string().trim(),
  readOnly: z.boolean(),
})

const synthesizeSchema = z.object({
  text: z.string().trim().min(1).max(1200),
  voice: z.string().trim().min(1),
  rate: z.number().min(-100).max(100),
  pitch: z.number().min(-100).max(100),
  volume: z.number().min(-100).max(100),
})

const app = express()
const port = Number(process.env.CHATVOICE_PORT ?? 3031)

app.use(express.json({ limit: "1mb" }))
app.use((_, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*")
  response.setHeader("Access-Control-Allow-Headers", "Content-Type")
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")

  if (_.method === "OPTIONS") {
    response.sendStatus(204)
    return
  }

  next()
})

let chatClient: ChatClient | null = null
let currentState: ChatConnectionState = {
  connected: false,
  connecting: false,
  authenticated: false,
  usingAnonymousConnection: true,
  channel: null,
  readOnly: true,
  lastError: null,
  lastEventAt: null,
}

const clients = new Set<express.Response>()
const voiceCachePromise = getVoices().then((voices) =>
  voices.map<ServerVoice>((voice) => ({
    name: voice.Name,
    shortName: voice.ShortName,
    friendlyName: voice.FriendlyName,
    locale: voice.Locale,
    gender: voice.Gender,
    personalities: voice.VoiceTag.VoicePersonalities,
    categories: voice.VoiceTag.ContentCategories,
  }))
)

app.get("/api/voices", async (_request, response) => {
  try {
    response.json(await voiceCachePromise)
  } catch (error) {
    handleRouteError(response, error)
  }
})

app.get("/api/chat/state", (_request, response) => {
  response.json(currentState)
})

app.post("/api/chat/connect", async (request, response) => {
  try {
    const payload = connectSchema.parse(request.body)
    await connectToChat(payload)
    response.json(currentState)
  } catch (error) {
    handleRouteError(response, error)
  }
})

app.post("/api/chat/disconnect", (_request, response) => {
  disconnectChatClient()
  response.json(currentState)
})

app.post("/api/tts/synthesize", async (request, response) => {
  try {
    const payload = synthesizeSchema.parse(request.body)
    const audio = await tts(payload.text, {
      voice: payload.voice,
      rate: formatPercent(payload.rate),
      pitch: formatPitch(payload.pitch),
      volume: formatPercent(payload.volume),
    })

    response.setHeader("Content-Type", "audio/mpeg")
    response.setHeader("Cache-Control", "no-store")
    response.send(Buffer.from(audio))
  } catch (error) {
    handleRouteError(response, error)
  }
})

app.get("/api/events", (request, response) => {
  response.setHeader("Content-Type", "text/event-stream")
  response.setHeader("Cache-Control", "no-cache, no-transform")
  response.setHeader("Connection", "keep-alive")
  response.flushHeaders()
  response.write(
    `data: ${JSON.stringify({ type: "status", status: currentState })}\n\n`
  )

  clients.add(response)

  const keepAlive = setInterval(() => {
    response.write(": keep-alive\n\n")
  }, 15000)

  request.on("close", () => {
    clearInterval(keepAlive)
    clients.delete(response)
  })
})

app.listen(port, () => {
  publishLog(`Chatvoice server listening on http://localhost:${port}`)
})

async function connectToChat(input: z.infer<typeof connectSchema>) {
  disconnectChatClient()

  const channel = normalizeChannel(input.channel)
  const hasCredentials =
    input.clientId.length > 0 && input.accessToken.length > 0

  currentState = {
    ...currentState,
    channel,
    readOnly: input.readOnly,
    usingAnonymousConnection: !hasCredentials,
    connecting: true,
    connected: false,
    authenticated: false,
    lastError: null,
    lastEventAt: new Date().toISOString(),
  }
  publishStatus()

  const client = new ChatClient({
    authProvider: hasCredentials
      ? new StaticAuthProvider(input.clientId, input.accessToken)
      : undefined,
    readOnly: input.readOnly,
    channels: [channel],
    webSocket: true,
    requestMembershipEvents: false,
  })

  chatClient = client

  client.onConnect(() => {
    currentState = {
      ...currentState,
      connected: true,
      connecting: false,
      lastEventAt: new Date().toISOString(),
    }
    publishStatus()
    publishLog(`Connected to #${channel}`)
  })

  client.onAuthenticationSuccess(() => {
    currentState = {
      ...currentState,
      authenticated: true,
      lastError: null,
      lastEventAt: new Date().toISOString(),
    }
    publishStatus()
  })

  client.onAuthenticationFailure((message) => {
    currentState = {
      ...currentState,
      authenticated: false,
      connecting: false,
      connected: false,
      lastError: message,
      lastEventAt: new Date().toISOString(),
    }
    publishStatus()
    publishError(message)
  })

  client.onTokenFetchFailure((error) => {
    const message = error.message || "Failed to fetch Twitch token"
    currentState = {
      ...currentState,
      authenticated: false,
      connecting: false,
      connected: false,
      lastError: message,
      lastEventAt: new Date().toISOString(),
    }
    publishStatus()
    publishError(message)
  })

  client.onDisconnect((_manual, reason) => {
    currentState = {
      ...currentState,
      connected: false,
      connecting: false,
      authenticated: false,
      lastError: reason?.message ?? currentState.lastError,
      lastEventAt: new Date().toISOString(),
    }
    publishStatus()

    if (reason?.message) {
      publishError(reason.message)
    }
  })

  client.onJoinFailure((_failedChannel, reason) => {
    currentState = {
      ...currentState,
      connected: false,
      connecting: false,
      lastError: reason,
      lastEventAt: new Date().toISOString(),
    }
    publishStatus()
    publishError(reason)
  })

  client.onMessage((messageChannel, userName, text, msg) => {
    publishEvent({
      type: "chat",
      message: createChatMessageEvent(
        messageChannel,
        userName,
        text,
        msg,
        false
      ),
    })
  })

  client.onAction((messageChannel, userName, text, msg) => {
    publishEvent({
      type: "chat",
      message: createChatMessageEvent(
        messageChannel,
        userName,
        text,
        msg,
        true
      ),
    })
  })

  client.connect()
}

function disconnectChatClient() {
  if (chatClient) {
    chatClient.quit()
    chatClient = null
  }

  currentState = {
    ...currentState,
    connected: false,
    connecting: false,
    authenticated: false,
    channel: currentState.channel,
    lastEventAt: new Date().toISOString(),
  }
  publishStatus()
}

function createChatMessageEvent(
  channel: string,
  userName: string,
  text: string,
  msg: ChatMessage,
  isAction: boolean
): ChatMessageEvent {
  return {
    id: msg.id || stableMessageId(channel, userName, text),
    channel: channel.replace(/^#/, ""),
    userName,
    displayName: msg.userInfo.displayName || userName,
    text,
    color: msg.userInfo.color ?? null,
    receivedAt: msg.date.toISOString(),
    flags: {
      isBroadcaster: msg.userInfo.isBroadcaster,
      isModerator: msg.userInfo.isMod,
      isSubscriber: msg.userInfo.isSubscriber,
      isVip: msg.userInfo.isVip,
      isFirst: msg.isFirst,
      isAction,
    },
  }
}

function stableMessageId(channel: string, userName: string, text: string) {
  return createHash("sha1")
    .update(`${channel}:${userName}:${text}:${Date.now()}`)
    .digest("hex")
}

function normalizeChannel(channel: string) {
  return channel.trim().replace(/^#/, "").toLowerCase()
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${Math.round(value)}%`
}

function formatPitch(value: number) {
  return `${value >= 0 ? "+" : ""}${Math.round(value)}Hz`
}

function publishStatus() {
  publishEvent({ type: "status", status: currentState })
}

function publishLog(message: string) {
  publishEvent({
    type: "log",
    message,
    at: new Date().toISOString(),
  })
}

function publishError(message: string) {
  publishEvent({
    type: "error",
    message,
    at: new Date().toISOString(),
  })
}

function publishEvent(event: ServerEvent) {
  for (const client of clients) {
    client.write(`data: ${JSON.stringify(event)}\n\n`)
  }
}

function handleRouteError(response: express.Response, error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "An unexpected server error occurred"
  publishError(message)
  response.status(400).json({ error: message })
}
