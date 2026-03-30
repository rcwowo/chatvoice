import * as React from "react"
import {
  ListOrdered,
  MessagesSquareIcon,
  PauseIcon,
  PlayIcon,
  SkipForwardIcon,
  Trash2Icon,
} from "lucide-react"

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

  /* Auto-scroll: flex-col-reverse keeps scroll pinned to bottom natively.
     We only need the ref for the scroll container itself. */
  const chatContainerRef = React.useRef<HTMLDivElement>(null)
  const currentlyPlayingId = isPlayingQueue ? playbackQueue[0]?.id : null
  const playbackEnabled = config.playback.enabled

  const togglePlayback = React.useCallback(() => {
    updateConfig({
      ...config,
      playback: { ...config.playback, enabled: !config.playback.enabled },
    })
  }, [config, updateConfig])

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
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
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
              className="flex h-full flex-col-reverse overflow-y-auto overscroll-contain"
            >
              <div className="px-3 py-2">
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

                      {message.flags.isModerator ? (
                        <Badge
                          variant="outline"
                          className="my-px h-4 px-1 text-[10px] leading-none"
                        >
                          MOD
                        </Badge>
                      ) : null}
                      {message.flags.isSubscriber ? (
                        <Badge
                          variant="outline"
                          className="my-px h-4 px-1 text-[10px] leading-none"
                        >
                          SUB
                        </Badge>
                      ) : null}

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
                        <span className="text-foreground">{message.text}</span>
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
