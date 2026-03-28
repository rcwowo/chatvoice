import * as React from "react"
import {
  AudioLinesIcon,
  MessagesSquareIcon,
  RadioIcon,
  ShuffleIcon,
  UserRoundIcon,
  WandSparklesIcon,
} from "lucide-react"

import { useChatvoice } from "@/lib/chatvoice-context"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  EmptyState,
  MetricCard,
  StatusPill,
} from "@/components/dashboard-primitives"

export function ChatPage() {
  const {
    config,
    connectionState,
    eventsReady,
    messages,
    serverLogs,
    playbackQueue,
    isPlayingQueue,
  } = useChatvoice()

  const enabledVoiceCount = React.useMemo(
    () => config.voiceProfiles.filter((profile) => profile.enabled).length,
    [config.voiceProfiles]
  )

  const assignmentCount = Object.keys(config.assignments).length

  const queueCapacity = Math.max(config.playback.maxQueueSize, 1)
  const queueProgress = Math.min(
    (playbackQueue.length / queueCapacity) * 100,
    100
  )

  const currentlyPlayingId = isPlayingQueue ? playbackQueue[0]?.id : null

  return (
    <div className="space-y-6">
      {/* Status strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={RadioIcon}
          label="Chat link"
          value={connectionState?.connected ? "Live" : "Offline"}
          detail={
            connectionState?.channel
              ? `#${connectionState.channel}`
              : "No channel yet"
          }
        />
        <MetricCard
          icon={ShuffleIcon}
          label="Saved assignments"
          value={String(assignmentCount)}
          detail={`${enabledVoiceCount} enabled voices`}
        />
        <MetricCard
          icon={AudioLinesIcon}
          label="Speech queue"
          value={`${playbackQueue.length}/${queueCapacity}`}
          detail={isPlayingQueue ? "Playing now" : "Standing by"}
        />
        <div className="space-y-3 rounded-2xl border border-border/70 bg-background p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Queue capacity</span>
            <span>{playbackQueue.length} queued</span>
          </div>
          <Progress value={queueProgress} />
          <div className="grid grid-cols-2 gap-2">
            <StatusPill
              label="Event stream"
              active={eventsReady}
              inactiveLabel="Waiting"
            />
            <StatusPill
              label="Auth mode"
              active={!connectionState?.usingAnonymousConnection}
              activeLabel="Token"
              inactiveLabel="Anonymous"
            />
          </div>
        </div>
      </div>

      {/* Chat log + queue + server logs */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Chat messages */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent chat
          </h2>
          <ScrollArea className="h-[520px] rounded-xl border border-border">
            <div className="space-y-3 p-3">
              {messages.length === 0 ? (
                <EmptyState
                  icon={UserRoundIcon}
                  title="No chat traffic yet"
                  description="Once connected, messages from Twitch will appear here."
                />
              ) : (
                messages.map((message) => {
                  const isPlaying = message.id === currentlyPlayingId

                  return (
                    <div
                      key={message.id}
                      className={
                        isPlaying
                          ? "rounded-xl border-2 border-primary bg-primary/5 p-3"
                          : "rounded-xl border border-border bg-background p-3"
                      }
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span
                          className="font-medium"
                          style={
                            message.color ? { color: message.color } : undefined
                          }
                        >
                          {message.displayName}
                        </span>
                        {isPlaying ? (
                          <Badge variant="default">Speaking</Badge>
                        ) : null}
                        {message.flags.isModerator ? (
                          <Badge variant="outline">Mod</Badge>
                        ) : null}
                        {message.flags.isSubscriber ? (
                          <Badge variant="outline">Sub</Badge>
                        ) : null}
                        {message.flags.isFirst ? (
                          <Badge variant="outline">First chat</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {message.text}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Queue + server logs */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Playback queue
            </h2>
            <ScrollArea className="h-[240px] rounded-xl border border-border">
              <div className="space-y-2 p-3">
                {playbackQueue.length === 0 ? (
                  <EmptyState
                    icon={MessagesSquareIcon}
                    title="Queue is empty"
                    description="Connect to a channel or queue a preview message."
                  />
                ) : (
                  playbackQueue.map((item, index) => (
                    <div
                      key={item.id}
                      className={
                        index === 0 && isPlayingQueue
                          ? "rounded-xl border-2 border-primary bg-primary/5 p-3"
                          : "rounded-xl border border-border bg-background p-3"
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">
                          {item.assignment.displayName}
                        </div>
                        <Badge variant="outline">{item.profile.label}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {item.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Server logs
            </h2>
            <ScrollArea className="h-[240px] rounded-xl border border-border">
              <div className="space-y-2 p-3 text-sm text-muted-foreground">
                {serverLogs.length === 0 ? (
                  <EmptyState
                    icon={WandSparklesIcon}
                    title="No server logs yet"
                    description="Bridge events appear here after the local server starts talking back."
                  />
                ) : (
                  serverLogs.map((entry, index) => (
                    <div
                      key={`${entry}-${index}`}
                      className="rounded-lg bg-muted/40 px-3 py-2"
                    >
                      {entry}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
