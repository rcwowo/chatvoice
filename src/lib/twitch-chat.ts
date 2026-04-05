/**
 * Browser-native Twitch IRC client over WebSocket.
 *
 * Connects anonymously (read-only) to `wss://irc-ws.chat.twitch.tv:443`
 * using the `justinfan` convention. Requests `twitch.tv/tags` and
 * `twitch.tv/commands` capabilities so every PRIVMSG carries full TMI tags
 * (display-name, color, badges, etc.).
 *
 * Zero external dependencies - uses the native browser WebSocket API.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type TwitchBadge = {
  set: string
  version: string
}

export type TwitchEmote = {
  id: string
  start: number
  end: number
}

export type TwitchChatMessage = {
  id: string
  channel: string
  userName: string
  displayName: string
  text: string
  color: string | null
  receivedAt: string
  badges: TwitchBadge[]
  emotes: TwitchEmote[]
  flags: {
    isBroadcaster: boolean
    isModerator: boolean
    isSubscriber: boolean
    isVip: boolean
    isFirst: boolean
    isAction: boolean
  }
}

export type TwitchConnectionState = {
  connected: boolean
  connecting: boolean
  channel: string | null
  lastError: string | null
}

export type TwitchChatEvent =
  | { type: "connected" }
  | { type: "disconnected"; reason: string | null }
  | { type: "message"; message: TwitchChatMessage }
  | { type: "log"; text: string }
  | { type: "error"; text: string }

export type TwitchChatEventHandler = (event: TwitchChatEvent) => void

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TWITCH_WS_URL = "wss://irc-ws.chat.twitch.tv:443"
const ANONYMOUS_NICK = `justinfan${Math.floor(10000 + Math.random() * 90000)}`
const PING_TIMEOUT_MS = 320_000 // expect a PING within ~5 min
const RECONNECT_DELAY_MS = 3_000

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class TwitchChatClient {
  private ws: WebSocket | null = null
  private channel: string | null = null
  private handler: TwitchChatEventHandler
  private pingTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private intentionalClose = false

  constructor(handler: TwitchChatEventHandler) {
    this.handler = handler
  }

  /** Connect to a Twitch channel (anonymous read-only). */
  connect(channel: string) {
    this.disconnect()
    this.intentionalClose = false
    this.channel = normalizeChannel(channel)

    const ws = new WebSocket(TWITCH_WS_URL)
    this.ws = ws

    ws.addEventListener("open", () => {
      ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands")
      ws.send(`PASS oauth:anonymous`)
      ws.send(`NICK ${ANONYMOUS_NICK}`)
      ws.send(`JOIN #${this.channel}`)
      this.resetPingTimer()
    })

    ws.addEventListener("message", (event) => {
      const raw = event.data as string
      for (const line of raw.split("\r\n")) {
        if (line.length > 0) {
          this.handleLine(line)
        }
      }
    })

    ws.addEventListener("close", (event) => {
      this.clearTimers()
      if (!this.intentionalClose) {
        this.handler({
          type: "disconnected",
          reason: event.reason || "Connection lost",
        })
        this.scheduleReconnect()
      } else {
        this.handler({ type: "disconnected", reason: null })
      }
    })

    ws.addEventListener("error", () => {
      this.handler({ type: "error", text: "WebSocket error" })
    })
  }

  /** Cleanly disconnect. */
  disconnect() {
    this.intentionalClose = true
    this.clearTimers()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /** Whether there is an active WebSocket connection. */
  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // -----------------------------------------------------------------------
  // IRC line handling
  // -----------------------------------------------------------------------

  private handleLine(raw: string) {
    // PING keep-alive
    if (raw.startsWith("PING")) {
      this.ws?.send(raw.replace("PING", "PONG"))
      this.resetPingTimer()
      return
    }

    // Successful join / welcome
    if (raw.includes("001")) {
      this.handler({ type: "connected" })
      this.handler({ type: "log", text: `Joined #${this.channel}` })
      return
    }

    // PRIVMSG - chat message
    if (raw.includes("PRIVMSG")) {
      const message = parsePrivmsg(raw)
      if (message) {
        this.handler({ type: "message", message })
      }
      return
    }

    // NOTICE - e.g. "No such channel"
    if (raw.includes("NOTICE")) {
      const noticeText = raw.split(" :").pop() ?? raw
      this.handler({ type: "log", text: noticeText })
    }
  }

  // -----------------------------------------------------------------------
  // Timers
  // -----------------------------------------------------------------------

  private resetPingTimer() {
    if (this.pingTimer) clearTimeout(this.pingTimer)
    this.pingTimer = setTimeout(() => {
      this.handler({
        type: "error",
        text: "No PING from Twitch - reconnecting",
      })
      this.ws?.close()
    }, PING_TIMEOUT_MS)
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (!this.channel || this.intentionalClose) return

    this.handler({
      type: "log",
      text: `Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`,
    })
    const channel = this.channel
    this.reconnectTimer = setTimeout(() => {
      this.connect(channel)
    }, RECONNECT_DELAY_MS)
  }

  private clearTimers() {
    if (this.pingTimer) {
      clearTimeout(this.pingTimer)
      this.pingTimer = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

// ---------------------------------------------------------------------------
// IRC message parser
// ---------------------------------------------------------------------------

/**
 * Parse a raw Twitch IRC PRIVMSG line (with tags) into a TwitchChatMessage.
 *
 * Expected format:
 *   @badge-info=...;badges=...;color=#FF4500;display-name=Foo;... :foo!foo@foo.tmi.twitch.tv PRIVMSG #channel :Hello world
 */
function parsePrivmsg(raw: string): TwitchChatMessage | null {
  // Split tags from the rest
  if (!raw.startsWith("@")) return null

  const spaceAfterTags = raw.indexOf(" ")
  if (spaceAfterTags === -1) return null

  const tagsSection = raw.slice(1, spaceAfterTags)
  const rest = raw.slice(spaceAfterTags + 1)

  // Parse tags into a map
  const tags = new Map<string, string>()
  for (const pair of tagsSection.split(";")) {
    const eqIdx = pair.indexOf("=")
    if (eqIdx === -1) {
      tags.set(pair, "")
    } else {
      tags.set(pair.slice(0, eqIdx), pair.slice(eqIdx + 1))
    }
  }

  // Parse prefix to get userName
  // :foo!foo@foo.tmi.twitch.tv PRIVMSG #channel :message
  const prefixMatch = rest.match(/^:(\w+)!\S+ PRIVMSG #(\S+) :(.*)$/)
  if (!prefixMatch) return null

  const userName = prefixMatch[1]
  const channel = prefixMatch[2]
  let messageText = prefixMatch[3]

  // Detect /me (ACTION) messages
  const isAction =
    messageText.startsWith("\x01ACTION ") && messageText.endsWith("\x01")
  if (isAction) {
    messageText = messageText.slice(8, -1)
  }

  // Extract badge info
  const badges = tags.get("badges") ?? ""
  const parsedBadges = parseBadgesTag(badges)
  const parsedEmotes = parseEmotesTag(tags.get("emotes") ?? "")

  const displayName = tags.get("display-name") || userName
  const color = tags.get("color") || null
  const id = tags.get("id") || stableMessageId(channel, userName, messageText)

  // Timestamp: tmi-sent-ts is in milliseconds
  const tmiTs = tags.get("tmi-sent-ts")
  const receivedAt = tmiTs
    ? new Date(Number(tmiTs)).toISOString()
    : new Date().toISOString()

  return {
    id,
    channel,
    userName,
    displayName,
    text: messageText,
    color,
    receivedAt,
    badges: parsedBadges,
    emotes: parsedEmotes,
    flags: {
      isBroadcaster: badges.includes("broadcaster/"),
      isModerator: tags.get("mod") === "1",
      isSubscriber: tags.get("subscriber") === "1",
      isVip: tags.has("vip"),
      isFirst: tags.get("first-msg") === "1",
      isAction,
    },
  }
}

function parseBadgesTag(raw: string): TwitchBadge[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((b) => {
      const [set, version] = b.split("/")
      return { set, version: version ?? "1" }
    })
    .filter((b) => b.set)
}

function parseEmotesTag(raw: string): TwitchEmote[] {
  if (!raw) return []
  const emotes: TwitchEmote[] = []
  for (const group of raw.split("/")) {
    const [id, positions] = group.split(":")
    if (!id || !positions) continue
    for (const pos of positions.split(",")) {
      const [start, end] = pos.split("-")
      emotes.push({ id, start: parseInt(start, 10), end: parseInt(end, 10) })
    }
  }
  return emotes.sort((a, b) => a.start - b.start)
}

function normalizeChannel(channel: string) {
  return channel.trim().replace(/^#/, "").toLowerCase()
}

function stableMessageId(
  channel: string,
  userName: string,
  text: string
): string {
  // Simple hash for deduplication when Twitch doesn't provide an id tag
  return `${channel}:${userName}:${Date.now()}:${text.slice(0, 20)}`
}
