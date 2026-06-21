import * as React from "react"
import {
  BadgeCheck,
  Crown,
  Gem,
  Gift,
  ListOrdered,
  Megaphone,
  MessagesSquareIcon,
  Palette,
  PauseIcon,
  PlayIcon,
  SkipForwardIcon,
  Star,
  Swords,
  Trash2Icon,
  Video,
  Volume2,
  Wrench,
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
// Badge rendering (role badges only)
// ---------------------------------------------------------------------------

const ROLE_BADGES: Record<
  string,
  { label: string; bg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "staff": { label: "Staff", bg: "#000000", icon: Wrench },
  "partner": { label: "Partner", bg: "#a96dff", icon: BadgeCheck },
  "premium": { label: "Prime", bg: "#0096d6", icon: Crown },
  "broadcaster": { label: "Broadcaster", bg: "#E91916", icon: Video },
  "moderator": { label: "Moderator", bg: "#00AD03", icon: Swords },
  "vip": { label: "VIP", bg: "#A10886", icon: Gem },
  "founder": { label: "Founder", bg: "#b638ef", icon: Crown },
  "artist-badge": { label: "Artist", bg: "#1e69ff", icon: Palette },
  "subscriber": { label: "Subscriber", bg: "#8204B5", icon: Star },
}

function BadgeTooltip({
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
  const knownBadges = badges.filter((badge) => ROLE_BADGES[badge.set])
  if (knownBadges.length === 0 && !memberBadge) return null

  return (
    <span className="mr-1 inline-flex items-center gap-0.5 align-middle">
      {knownBadges.map((badge, i) => {
        const role = ROLE_BADGES[badge.set]!
        const Icon = role.icon
        return (
          <BadgeTooltip key={`${badge.set}-${i}`} label={role.label}>
            <span
              className="inline-flex size-4 items-center justify-center rounded align-middle"
              style={{ backgroundColor: role.bg }}
            >
              <Icon className="size-3 text-white" />
            </span>
          </BadgeTooltip>
        )
      })}
      {memberBadge ? (
        <BadgeTooltip label={memberBadge.name}>
          <img
            src={memberBadge.image}
            alt={memberBadge.name}
            className="inline-block size-4 rounded align-middle"
          />
        </BadgeTooltip>
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
    parts.push(...renderTextWithLinks(text.slice(lastIdx), `t-${lastIdx}`))
  }

  return <>{parts}</>
}

const SYSTEM_EVENT_META: Record<
  TwitchSystemMessage["event"],
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    chipClassName: string
    cardClassName: string
    iconWrapClassName: string
    headlineClassName: string
    detailsClassName: string
  }
> = {
  subscription: {
    label: "Subscription",
    icon: Gift,
    chipClassName:
      "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300",
    cardClassName:
      "border-amber-500/25 bg-linear-to-r from-amber-500/12 via-amber-500/6 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
    iconWrapClassName:
      "bg-amber-500 text-white shadow-[0_10px_25px_-15px_rgba(245,158,11,0.85)]",
    headlineClassName: "text-foreground",
    detailsClassName: "text-foreground/75",
  },
  raid: {
    label: "Raid",
    icon: Crown,
    chipClassName:
      "border-rose-500/30 bg-rose-500/12 text-rose-700 dark:text-rose-300",
    cardClassName:
      "border-rose-500/25 bg-linear-to-r from-rose-500/12 via-rose-500/6 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
    iconWrapClassName:
      "bg-rose-500 text-white shadow-[0_10px_25px_-15px_rgba(244,63,94,0.85)]",
    headlineClassName: "text-foreground",
    detailsClassName: "text-foreground/78",
  },
  announcement: {
    label: "Announcement",
    icon: Megaphone,
    chipClassName:
      "border-sky-500/30 bg-sky-500/12 text-sky-700 dark:text-sky-300",
    cardClassName:
      "border-sky-500/25 bg-linear-to-r from-sky-500/12 via-sky-500/6 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
    iconWrapClassName:
      "bg-sky-500 text-white shadow-[0_10px_25px_-15px_rgba(14,165,233,0.85)]",
    headlineClassName: "text-foreground",
    detailsClassName: "text-foreground/85",
  },
  connection: {
    label: "Connection",
    icon: Gift,
    chipClassName: "",
    cardClassName: "",
    iconWrapClassName: "",
    headlineClassName: "text-muted-foreground",
    detailsClassName: "text-muted-foreground",
  },
  notice: {
    label: "Notice",
    icon: Gift,
    chipClassName: "",
    cardClassName: "",
    iconWrapClassName: "",
    headlineClassName: "text-muted-foreground",
    detailsClassName: "text-muted-foreground",
  },
  status: {
    label: "Status",
    icon: Gift,
    chipClassName: "",
    cardClassName: "",
    iconWrapClassName: "",
    headlineClassName: "text-muted-foreground",
    detailsClassName: "text-muted-foreground",
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
  const showHeadline = Boolean(message.headline.trim()) && normalizedHeadline !== normalizedLabel

  if (!spotlight) {
    return (
      <div className="group flex gap-1.5 px-1 py-0.5 leading-snug hover:bg-muted/40">
        {timestamp ? (
          <span className="shrink-0 text-[11px] leading-snug text-muted-foreground/50 select-none">
            {timestamp}
          </span>
        ) : null}
        <span className="text-sm italic text-muted-foreground">
          {message.text}
        </span>
      </div>
    )
  }

  const cardStyle = message.accentColor
    ? {
        borderColor: `${message.accentColor}55`,
        backgroundImage: `linear-gradient(120deg, ${message.accentColor}22, transparent 72%)`,
      }
    : undefined

  return (
    <div className="group flex gap-1.5 px-1 py-1 leading-snug">
      {timestamp ? (
        <span className="shrink-0 pt-1 text-[11px] leading-snug text-muted-foreground/50 select-none">
          {timestamp}
        </span>
      ) : null}

      <div
        className={`min-w-0 flex-1 rounded-xl border px-3 py-2 ${meta.cardClassName}`}
        style={cardStyle}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full ${meta.iconWrapClassName}`}
          >
            <Icon className="size-3.5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] uppercase ${meta.chipClassName}`}
              >
                {meta.label}
              </span>
            </div>

            {showHeadline ? (
              <p className={`mt-1 text-sm font-medium ${meta.headlineClassName}`}>
                {message.headline}
              </p>
            ) : null}

            {message.details ? (
              <p
                className={`text-sm leading-relaxed ${meta.detailsClassName} ${
                  showHeadline ? "mt-1" : "mt-0.5"
                }`}
              >
                {message.details}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChatPage() {
  const {
    config,
    updateConfig,
    connectionState,
    timeline,
    playbackQueue,
    isPlayingQueue,
    skipCurrent,
    clearQueue,
    memberBadgeByUserId,
  } = useChatvoice()

  /* Auto-scroll: keep chat pinned to the bottom when new messages arrive. */
  const chatContainerRef = React.useRef<HTMLDivElement>(null)
  const messageListRef = React.useRef<HTMLDivElement>(null)
  const isProgrammaticScrollRef = React.useRef(false)
  const [isScrollPaused, setIsScrollPaused] = React.useState(false)
  const currentlyPlayingId = isPlayingQueue ? playbackQueue[0]?.id : null
  const playbackEnabled = config.playback.enabled
  const timestampFormat = config.playback.messageTimestampFormat

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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
    <ChatQueueSplit
      chat={
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        <h2 className="mb-1 h-5 shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Chat
          {connectionState.connected && connectionState.channel ? (
            <span className="ml-1.5 font-normal text-muted-foreground/70 normal-case">
              #{connectionState.channel}
            </span>
          ) : null}
        </h2>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
          {timeline.length === 0 ? (
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
                        <span className="shrink-0 text-[11px] leading-snug text-muted-foreground/50 select-none">
                          {timestamp}
                        </span>
                      ) : null}

                      <span className="min-w-0 flex-1 text-sm">
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
      }
      queue={
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        <h2 className="mb-1 h-5 shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Queue
          {playbackQueue.length > 0 ? (
            <span className="ml-1 font-normal text-muted-foreground/70 normal-case">
              ({playbackQueue.length})
            </span>
          ) : null}
        </h2>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3">
              <div className="w-full max-w-full min-w-0 space-y-2">
                {playbackQueue.map((item, index) => (
                  <div
                    key={item.id}
                    className={
                      index === 0 && isPlayingQueue
                        ? "@container/queue-item w-full max-w-full min-w-0 overflow-hidden rounded-xl border-2 border-primary bg-primary/5 p-3"
                        : "@container/queue-item w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-border bg-background p-3"
                    }
                  >
                    <div className="flex min-w-0 flex-col gap-1.5 @min-[14rem]/queue-item:flex-row @min-[14rem]/queue-item:items-center @min-[14rem]/queue-item:gap-2">
                      <p
                        className="min-w-0 truncate font-medium text-sm @min-[14rem]/queue-item:flex-1"
                        title={item.assignment.displayName}
                      >
                        {item.assignment.displayName}
                      </p>
                      <Badge
                        variant="outline"
                        className="w-fit max-w-full shrink-0 self-start truncate @min-[14rem]/queue-item:max-w-[11rem]"
                        title={item.profile.label}
                      >
                        {item.profile.label}
                      </Badge>
                    </div>
                    <p className="mt-2 break-words text-sm text-muted-foreground @min-[14rem]/queue-item:mt-1.5">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

          <TooltipProvider>
            <div
              className="flex shrink-0 items-center justify-center gap-5"
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
        </div>
      </div>
      }
    />
    </div>
  )
}
