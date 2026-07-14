import * as React from "react"
import {
  Crown,
  Gift,
  ListOrdered,
  Megaphone,
  MessagesSquareIcon,
  PauseIcon,
  PlayIcon,
  SkipForwardIcon,
  Trash2Icon,
  Volume2,
} from "lucide-react"

import type { MessageTimestampFormat } from "@/lib/chatvoice-config"
import { findMessageUrls } from "@/lib/chatvoice-config"
import type {
  TwitchBadge,
  TwitchEmote,
  TwitchSystemMessage,
} from "@/lib/twitch-chat"
import type { MemberBadge } from "@/lib/member-badges"

import {
  formatMessageTimestamp,
  useChatvoice,
} from "@/lib/chatvoice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChatQueueSplit } from "@/components/chat-queue-split"
import { EmptyState } from "@/components/dashboard-primitives"

// ---------------------------------------------------------------------------
// Badge rendering
// ---------------------------------------------------------------------------

function HoverTooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

function ChatBadges({
  badges,
  memberBadge,
}: {
  badges: TwitchBadge[]
  memberBadge?: MemberBadge | null
}) {
  const resolvedBadges = badges.filter((badge) => badge.imageUrl)
  if (resolvedBadges.length === 0 && !memberBadge) return null

  return (
    <span className="mr-1 inline-flex items-center gap-0.5 align-middle">
      {resolvedBadges.map((badge, i) => (
        <HoverTooltip
          key={`${badge.set}-${badge.version}-${i}`}
          label={badge.title ?? badge.set}
        >
          <img
            src={badge.imageUrl}
            alt={badge.title ?? badge.set}
            className="inline-block size-[1.14em] align-middle"
            loading="lazy"
          />
        </HoverTooltip>
      ))}
      {memberBadge ? (
        <HoverTooltip label={memberBadge.name}>
          <img
            src={memberBadge.image}
            alt={memberBadge.name}
            className="inline-block size-[1.14em] rounded align-middle"
          />
        </HoverTooltip>
      ) : null}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Emote rendering
// ---------------------------------------------------------------------------

function renderTextWithLinks(text: string, keyPrefix: string) {
  const urls = findMessageUrls(text)

  if (urls.length === 0) {
    return [
      <span key={keyPrefix} className="text-foreground">
        {text}
      </span>,
    ]
  }

  const parts: React.ReactNode[] = []
  let lastIdx = 0

  for (const [index, match] of urls.entries()) {
    if (match.start > lastIdx) {
      parts.push(
        <span key={`${keyPrefix}-t-${lastIdx}`} className="text-foreground">
          {text.slice(lastIdx, match.start)}
        </span>
      )
    }

    parts.push(
      <a
        key={`${keyPrefix}-l-${index}-${match.start}`}
        href={match.url}
        target="_blank"
        rel="noreferrer noopener"
        className="text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:text-primary/80"
      >
        {match.url}
      </a>
    )

    lastIdx = match.end
  }

  if (lastIdx < text.length) {
    parts.push(
      <span key={`${keyPrefix}-t-${lastIdx}`} className="text-foreground">
        {text.slice(lastIdx)}
      </span>
    )
  }

  return parts
}

function MessageText({ text, emotes }: { text: string; emotes: TwitchEmote[] }) {
  if (emotes.length === 0) {
    return <>{renderTextWithLinks(text, "message")}</>
  }

  const parts: React.ReactNode[] = []
  let lastIdx = 0

  for (const emote of emotes) {
    if (emote.start > lastIdx) {
      parts.push(
        ...renderTextWithLinks(
          text.slice(lastIdx, emote.start),
          `t-${lastIdx}`
        )
      )
    }
    const emoteName = text.slice(emote.start, emote.end + 1)
    parts.push(
      <HoverTooltip
        key={`e-${emote.provider}-${emote.id}-${emote.start}`}
        label={emote.code}
      >
        <img
          src={emote.imageUrl}
          alt={emoteName}
          className="inline-block h-[1.43em] align-middle"
          loading="lazy"
        />
      </HoverTooltip>
    )
    lastIdx = emote.end + 1
  }

  if (lastIdx < text.length) {
    parts.push(...renderTextWithLinks(text.slice(lastIdx), `t-${lastIdx}`))
  }

  return <>{parts}</>
}

const SYSTEM_EVENT_META: Record<
  TwitchSystemMessage["event"],
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    barClassName: string
    accentClassName: string
  }
> = {
  subscription: {
    label: "Subscription",
    icon: Gift,
    barClassName: "bg-purple-500/10",
    accentClassName: "border-purple-500",
  },
  raid: {
    label: "Raid",
    icon: Crown,
    barClassName: "bg-rose-500/10",
    accentClassName: "border-rose-500",
  },
  announcement: {
    label: "Announcement",
    icon: Megaphone,
    barClassName: "bg-sky-500/10",
    accentClassName: "border-sky-500",
  },
  connection: {
    label: "Connection",
    icon: Gift,
    barClassName: "",
    accentClassName: "",
  },
  notice: {
    label: "Notice",
    icon: Gift,
    barClassName: "",
    accentClassName: "",
  },
  status: {
    label: "Status",
    icon: Gift,
    barClassName: "",
    accentClassName: "",
  },
}

function SystemMessageRow({
  message,
  timestampFormat,
}: {
  message: TwitchSystemMessage
  timestampFormat: MessageTimestampFormat
}) {
  const meta = SYSTEM_EVENT_META[message.event]
  const Icon = meta.icon
  const spotlight =
    message.event === "announcement" ||
    message.event === "subscription" ||
    message.event === "raid"
  const timestamp = formatMessageTimestamp(message.receivedAt, timestampFormat)
  const normalizedHeadline = message.headline.trim().toLowerCase()
  const normalizedLabel = meta.label.trim().toLowerCase()
  const showHeadline =
    Boolean(message.headline.trim()) && normalizedHeadline !== normalizedLabel

  if (!spotlight) {
    return (
      <div className="group flex gap-1.5 px-1 py-0.5 leading-snug hover:bg-muted/40">
        {timestamp ? (
          <span className="shrink-0 text-[0.786em] leading-snug text-muted-foreground/50 select-none">
            {timestamp}
          </span>
        ) : null}
        <span className="italic text-muted-foreground">
          {message.text}
        </span>
      </div>
    )
  }

  const accentStyle = message.accentColor
    ? {
        borderLeftColor: message.accentColor,
        backgroundColor: `${message.accentColor}1a`,
      }
    : undefined

  return (
    <div
      className={`group flex gap-1.5 border-l-[3px] px-1 py-1.5 leading-snug ${meta.barClassName} ${meta.accentClassName}`}
      style={accentStyle}
    >
      {timestamp ? (
        <span className="shrink-0 text-[0.786em] leading-snug text-muted-foreground/50 select-none">
          {timestamp}
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon className="size-[1em] shrink-0 text-foreground" />
          <span className="font-semibold text-foreground">
            {meta.label}
          </span>
        </div>

        {showHeadline ? (
          <p className="mt-0.5 text-foreground/85">{message.headline}</p>
        ) : null}

        {message.details ? (
          <p className="mt-0.5 text-foreground/85">
            <MessageText text={message.details} emotes={message.emotes} />
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function ChatPage() {
  const {
    config,
    updateConfig,
    timeline,
    playbackQueue,
    activePlaybackItemId,
    skipCurrent,
    clearQueue,
    memberBadgeByUserId,
  } = useChatvoice()

  /* Auto-scroll: keep chat pinned to the bottom when new messages arrive. */
  const chatContainerRef = React.useRef<HTMLDivElement>(null)
  const messageListRef = React.useRef<HTMLDivElement>(null)
  const isProgrammaticScrollRef = React.useRef(false)
  const [isScrollPaused, setIsScrollPaused] = React.useState(false)
  const currentlyPlayingId = activePlaybackItemId
  const playbackEnabled = config.playback.enabled
  const queueEnabled = config.playback.queueEnabled
  const timestampFormat = config.playback.messageTimestampFormat
  const chatScale = config.playback.chatScale

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
  }, [timeline, isScrollPaused, scrollToBottom])

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

  const setQueueEnabled = React.useCallback(
    (enabled: boolean) => {
      updateConfig((current) => ({
        ...current,
        playback: { ...current.playback, queueEnabled: enabled },
      }))
    },
    [updateConfig]
  )

  const queueEmptyDescription = !queueEnabled
    ? "Queueing is off. New messages won't be added."
    : playbackEnabled
      ? "New messages will be queued for speech."
      : "Speech is paused. Press play to resume."

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ChatQueueSplit
        chat={
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            <h2 className="shrink-0 px-4 pt-3 pb-2 text-sm font-medium text-muted-foreground">
              Live Chat
            </h2>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {timeline.length === 0 ? (
                <div className="flex h-full items-center justify-center px-4">
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
                  <div
                    ref={messageListRef}
                    className="mt-auto px-4 py-2"
                    style={{
                      fontSize: `calc(0.875rem * ${chatScale / 100})`,
                    }}
                  >
                    {timeline.map((entry) => {
                      if (entry.kind === "system") {
                        return (
                          <SystemMessageRow
                            key={entry.message.id}
                            message={entry.message}
                            timestampFormat={timestampFormat}
                          />
                        )
                      }

                      const message = entry.message
                      const isPlaying = message.id === currentlyPlayingId
                      const timestamp = formatMessageTimestamp(
                        message.receivedAt,
                        timestampFormat
                      )
                      return (
                        <div
                          key={message.id}
                          className={`group flex gap-1.5 px-1 py-0.5 leading-snug ${
                            isPlaying
                              ? "rounded bg-primary/10"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          {timestamp ? (
                            <span className="shrink-0 text-[0.786em] leading-snug text-muted-foreground/50 select-none">
                              {timestamp}
                            </span>
                          ) : null}

                          <span className="min-w-0 flex-1">
                            <ChatBadges
                              badges={message.badges}
                              memberBadge={
                                message.userId
                                  ? memberBadgeByUserId.get(message.userId)
                                  : null
                              }
                            />
                            <span
                              className="font-semibold"
                              style={
                                message.color
                                  ? { color: message.color }
                                  : undefined
                              }
                            >
                              {message.displayName}
                            </span>
                            <span className="text-muted-foreground">: </span>
                            <MessageText
                              text={message.text}
                              emotes={message.emotes}
                            />
                            {isPlaying ? (
                              <Badge
                                variant="default"
                                className="ml-1.5 inline-flex h-[1.14em] px-[0.286em] align-middle text-[0.714em] leading-none"
                              >
                                <Volume2 />
                              </Badge>
                            ) : null}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {timeline.length > 0 && isScrollPaused ? (
                <div className="pointer-events-none absolute right-0 bottom-3 left-0 z-10 flex justify-center px-4">
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
        }
        queue={
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3 pb-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Queue ({playbackQueue.length})
              </h2>
              <div
                role="group"
                aria-label="Queue messages"
                className="inline-flex items-center rounded-full border border-border bg-background p-0.5"
              >
                <button
                  type="button"
                  onClick={() => setQueueEnabled(true)}
                  aria-pressed={queueEnabled}
                  className={
                    queueEnabled
                      ? "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors"
                      : "rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  }
                >
                  On
                </button>
                <button
                  type="button"
                  onClick={() => setQueueEnabled(false)}
                  aria-pressed={!queueEnabled}
                  className={
                    !queueEnabled
                      ? "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors"
                      : "rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  }
                >
                  Off
                </button>
              </div>
            </div>

            {playbackQueue.length === 0 ? (
              <div className="flex min-h-0 flex-1 items-center justify-center px-4">
                <EmptyState
                  icon={ListOrdered}
                  title="Queue is empty"
                  description={queueEmptyDescription}
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-2">
                <div className="w-full max-w-full min-w-0 space-y-2">
                  {playbackQueue.map((item) => (
                    <div
                      key={item.id}
                      className={
                        item.id === activePlaybackItemId
                          ? "w-full max-w-full min-w-0 overflow-hidden rounded-lg border-2 border-primary bg-muted/60 p-3"
                          : "w-full max-w-full min-w-0 overflow-hidden rounded-lg bg-muted/40 p-3"
                      }
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <p
                          className="min-w-0 flex-1 truncate font-medium text-sm"
                          title={item.assignment.displayName}
                        >
                          {item.assignment.displayName}
                        </p>
                        <Badge
                          variant="outline"
                          className="h-4 max-w-[11rem] shrink-0 truncate px-1.5 text-[10px] leading-none"
                          title={item.profile.label}
                        >
                          {item.profile.label}
                        </Badge>
                      </div>
                      <p className="mt-1.5 break-words text-[11px] leading-snug text-muted-foreground/50">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        }
        playback={
          <TooltipProvider>
            <div
              className="flex shrink-0 items-center justify-center gap-5 px-4 py-4"
              role="toolbar"
              aria-label="Speech playback controls"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={clearQueue}
                    disabled={playbackQueue.length === 0}
                    aria-label="Clear queue"
                  >
                    <Trash2Icon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear queue</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon-lg"
                    className="size-12 rounded-full shadow-sm"
                    onClick={togglePlayback}
                    aria-label={
                      playbackEnabled ? "Pause speech" : "Resume speech"
                    }
                  >
                    {playbackEnabled ? (
                      <PauseIcon className="size-5" />
                    ) : (
                      <PlayIcon className="size-5" />
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
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={skipCurrent}
                    disabled={playbackQueue.length === 0}
                    aria-label="Skip current message"
                  >
                    <SkipForwardIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Skip current message</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        }
      />
    </div>
  )
}
