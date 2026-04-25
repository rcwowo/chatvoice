import * as React from "react"
import {
  Gem,
  ListOrdered,
  MessagesSquareIcon,
  PauseIcon,
  PlayIcon,
  SkipForwardIcon,
  Star,
  Swords,
  Trash2Icon,
  Video,
} from "lucide-react"

import type { TwitchBadge, TwitchEmote } from "@/lib/twitch-chat"

import { useChatvoice } from "@/lib/chatvoice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { EmptyState } from "@/components/dashboard-primitives"

/** Format a receivedAt ISO string into a short HH:MM time. */
function shortTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

// ---------------------------------------------------------------------------
// Badge rendering (role badges only)
// ---------------------------------------------------------------------------

const ROLE_BADGES: Record<
  string,
  { label: string; bg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  broadcaster: { label: "Broadcaster", bg: "#E91916", icon: Video },
  moderator: { label: "Moderator", bg: "#00AD03", icon: Swords },
  vip: { label: "VIP", bg: "#A10886", icon: Gem },
  subscriber: { label: "Subscriber", bg: "#8204B5", icon: Star },
}

function ChatBadges({ badges }: { badges: TwitchBadge[] }) {
  if (badges.length === 0) return null
  return (
    <>
      {badges.map((badge, i) => {
        const role = ROLE_BADGES[badge.set]
        if (!role) return null
        const Icon = role.icon
        return (
          <span
            key={`${badge.set}-${i}`}
            className="inline-flex size-4 shrink-0 items-center justify-center rounded"
            style={{ backgroundColor: role.bg }}
            title={role.label}
          >
            <Icon className="size-3 text-white" />
          </span>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// Emote rendering
// ---------------------------------------------------------------------------

function MessageText({ text, emotes }: { text: string; emotes: TwitchEmote[] }) {
  if (emotes.length === 0) {
    return <span className="text-foreground">{text}</span>
  }

  const parts: React.ReactNode[] = []
  let lastIdx = 0

  for (const emote of emotes) {
    if (emote.start > lastIdx) {
      parts.push(
        <span key={`t-${lastIdx}`} className="text-foreground">
          {text.slice(lastIdx, emote.start)}
        </span>
      )
    }
    const emoteName = text.slice(emote.start, emote.end + 1)
    parts.push(
      <img
        key={`e-${emote.provider}-${emote.id}-${emote.start}`}
        src={emote.imageUrl}
        alt={emoteName}
        title={`${emoteName} (${emote.provider.toUpperCase()})`}
        className="inline-block h-5 align-middle"
        loading="lazy"
      />
    )
    lastIdx = emote.end + 1
  }

  if (lastIdx < text.length) {
    parts.push(
      <span key={`t-${lastIdx}`} className="text-foreground">
        {text.slice(lastIdx)}
      </span>
    )
  }

  return <>{parts}</>
}

export function ChatPage() {
  const {
    config,
    updateConfig,
    connectionState,
    messages,
    playbackQueue,
    isPlayingQueue,
    skipCurrent,
    clearQueue,
  } = useChatvoice()

  /* Auto-scroll: keep chat pinned to the bottom when new messages arrive. */
  const chatContainerRef = React.useRef<HTMLDivElement>(null)
  const messageListRef = React.useRef<HTMLDivElement>(null)
  const isProgrammaticScrollRef = React.useRef(false)
  const [isScrollPaused, setIsScrollPaused] = React.useState(false)
  const currentlyPlayingId = isPlayingQueue ? playbackQueue[0]?.id : null
  const playbackEnabled = config.playback.enabled

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "auto") => {
    const el = chatContainerRef.current
    if (!el) return

    isProgrammaticScrollRef.current = true
    el.scrollTo({ top: el.scrollHeight, behavior })
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false
    })
  }, [])

  const handleChatScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (isProgrammaticScrollRef.current) return

      const el = event.currentTarget
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      const isNearBottom = distanceFromBottom <= 24

      setIsScrollPaused(!isNearBottom)
    },
    []
  )

  React.useLayoutEffect(() => {
    if (isScrollPaused) return
    scrollToBottom("auto")
  }, [messages, isScrollPaused, scrollToBottom])

  React.useEffect(() => {
    const container = chatContainerRef.current
    const messageList = messageListRef.current
    if (!container || !messageList || isScrollPaused || typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(() => {
      scrollToBottom("auto")
    })
    observer.observe(messageList)

    return () => {
      observer.disconnect()
    }
  }, [isScrollPaused, scrollToBottom])

  const togglePlayback = React.useCallback(() => {
    updateConfig((current) => ({
      ...current,
      playback: { ...current.playback, enabled: !current.playback.enabled },
    }))
  }, [updateConfig])

  return (
    <div className="sm:flex h-full min-h-0 gap-4">
      {/* -- Chat log -- */}
      <div className="flex min-h-0 min-w-0 md:flex-4 flex-col">
        <h2 className="mb-1 h-5 shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Chat
          {connectionState.connected && connectionState.channel ? (
            <span className="ml-1.5 font-normal text-muted-foreground/70 normal-case">
              #{connectionState.channel}
            </span>
          ) : null}
        </h2>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={MessagesSquareIcon}
                title="No messages yet"
                description="Once connected, chat messages will appear here."
              />
            </div>
          ) : (
            <div
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              className="flex h-full flex-col overflow-y-auto overscroll-contain"
            >
              <div ref={messageListRef} className="mt-auto px-3 py-2">
                {messages.map((message) => {
                  const isPlaying = message.id === currentlyPlayingId
                  return (
                    <div
                      key={message.id}
                      className={`group flex gap-1.5 px-1 py-0.5 leading-snug ${
                        isPlaying
                          ? "rounded bg-primary/10"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <span className="shrink-0 text-[11px] leading-snug text-muted-foreground/50 select-none">
                        {shortTime(message.receivedAt)}
                      </span>

                      <ChatBadges badges={message.badges} />

                      <span className="inline text-sm">
                        <span
                          className="font-semibold"
                          style={
                            message.color ? { color: message.color } : undefined
                          }
                        >
                          {message.displayName}
                        </span>
                        <span className="text-muted-foreground">: </span>
                        <MessageText text={message.text} emotes={message.emotes} />
                        {isPlaying ? (
                          <Badge
                            variant="default"
                            className="ml-1.5 inline-flex h-4 px-1 align-middle text-[10px] leading-none"
                          >
                            TTS
                          </Badge>
                        ) : null}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {messages.length > 0 && isScrollPaused ? (
            <div className="pointer-events-none absolute right-0 bottom-3 left-0 z-10 flex justify-center px-3">
              <Button
                type="button"
                size="sm"
                className="pointer-events-auto shadow-md"
                onClick={() => {
                  setIsScrollPaused(false)
                  scrollToBottom("smooth")
                }}
              >
                Scrolling Paused
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Queue panel */}
      <div className="flex min-h-0 flex-2 flex-col">
        <div className="mb-1 flex h-5 shrink-0 items-center gap-1">
          <h2 className="flex-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Queue
            {playbackQueue.length > 0 ? (
              <span className="ml-1 font-normal text-muted-foreground/70 normal-case">
                ({playbackQueue.length})
              </span>
            ) : null}
          </h2>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={togglePlayback}
                  aria-label={
                    playbackEnabled ? "Pause speech" : "Resume speech"
                  }
                >
                  {playbackEnabled ? (
                    <PauseIcon className="size-3.5" />
                  ) : (
                    <PlayIcon className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {playbackEnabled ? "Pause speech" : "Resume speech"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={skipCurrent}
                  disabled={playbackQueue.length === 0}
                  aria-label="Skip current"
                >
                  <SkipForwardIcon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Skip current</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={clearQueue}
                  disabled={playbackQueue.length === 0}
                  aria-label="Clear queue"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear queue</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {playbackQueue.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border">
            <EmptyState
              icon={ListOrdered}
              title="Queue is empty"
              description={
                playbackEnabled
                  ? "New messages will be queued for speech."
                  : "Speech is paused. Press play to resume."
              }
            />
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1 rounded-xl border border-border">
            <div className="space-y-2 p-3">
              {playbackQueue.map((item, index) => (
                <div
                  key={item.id}
                  className={
                    index === 0 && isPlayingQueue
                      ? "rounded-xl border-2 border-primary bg-primary/5 p-3"
                      : "rounded-xl border border-border bg-background p-3"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">
                      {item.assignment.displayName}
                    </div>
                    <Badge variant="outline">{item.profile.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
