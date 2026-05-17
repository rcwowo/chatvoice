import * as React from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { useChatvoice } from "@/lib/chatvoice-context"
import { normalizeChannelName } from "@/lib/chatvoice-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function isValidChannelName(value: string) {
  const normalized = normalizeChannelName(value)
  return /^[a-z0-9_]{1,25}$/.test(normalized)
}

function ConnectionStatusDot({
  connected,
  connecting,
}: {
  connected: boolean
  connecting: boolean
}) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        connected && "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.55)]",
        connecting && !connected && "bg-amber-400 animate-pulse",
        !connected && !connecting && "bg-muted-foreground/40"
      )}
      aria-hidden
    />
  )
}

const switcherButtonClassName =
  "border border-border bg-background dark:border-input dark:bg-input/30"

export function ChannelSwitcher() {
  const {
    config,
    updateConfig,
    connectionState,
    startConnection,
    stopConnection,
  } = useChatvoice()

  const [open, setOpen] = React.useState(false)
  const [newChannel, setNewChannel] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  const connected = connectionState.connected
  const connecting = connectionState.connecting
  const savedChannels = config.twitch.savedChannels
  const activeChannel =
    normalizeChannelName(config.twitch.channel ?? "") || null
  const isActiveChannelConnected =
    connected && connectionState.channel === activeChannel

  React.useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const persistChannels = React.useCallback(
    (channel: string, channels: string[]) => {
      const normalized = normalizeChannelName(channel)
      const nextChannels = [
        ...new Set(channels.map(normalizeChannelName).filter(Boolean)),
      ]

      updateConfig((current) => ({
        ...current,
        twitch: {
          ...current.twitch,
          channel: normalized,
          savedChannels: nextChannels,
        },
      }))

      return normalized
    },
    [updateConfig]
  )

  const connectWithToast = React.useCallback(
    (channel: string) => {
      toast.promise(startConnection(channel), {
        loading: `Connecting to #${channel}…`,
        success: (ch) => `Connected to #${ch}`,
        error: (err) =>
          err instanceof Error ? err.message : "Connection failed",
      })
    },
    [startConnection]
  )

  const selectChannel = React.useCallback(
    (rawChannel: string) => {
      const channel = normalizeChannelName(rawChannel)
      if (!channel || !isValidChannelName(channel)) {
        return
      }

      const nextChannels = savedChannels.includes(channel)
        ? savedChannels
        : [...savedChannels, channel]

      persistChannels(channel, nextChannels)
      setOpen(false)

      if (connected && connectionState.channel === channel) {
        return
      }

      connectWithToast(channel)
    },
    [
      connected,
      connectionState.channel,
      connectWithToast,
      persistChannels,
      savedChannels,
    ]
  )

  const toggleConnection = React.useCallback(() => {
    if (connecting) return

    if (connected) {
      stopConnection()
      toast.info("Disconnected from Twitch chat.")
      return
    }

    if (!activeChannel) {
      setOpen(true)
      return
    }

    connectWithToast(activeChannel)
  }, [
    activeChannel,
    connected,
    connectWithToast,
    connecting,
    stopConnection,
  ])

  const handleAddChannel = () => {
    const channel = normalizeChannelName(newChannel)
    if (!channel) return
    if (!isValidChannelName(channel)) {
      toast.error("Enter a valid Twitch channel name.")
      return
    }
    if (savedChannels.includes(channel)) {
      toast.error(`#${channel} is already in your channel list.`)
      return
    }

    selectChannel(channel)
    setNewChannel("")
  }

  const handleRemoveChannel = (
    event: React.MouseEvent,
    channel: string
  ) => {
    event.stopPropagation()
    const nextChannels = savedChannels.filter((item) => item !== channel)
    const wasActive = activeChannel === channel
    const wasConnectedToRemoved =
      connected && connectionState.channel === channel
    const fallback = wasActive ? (nextChannels[0] ?? "") : (activeChannel ?? "")

    updateConfig((current) => ({
      ...current,
      twitch: {
        ...current.twitch,
        channel: fallback,
        savedChannels: nextChannels,
      },
    }))

    if (wasConnectedToRemoved) {
      if (fallback) {
        connectWithToast(fallback)
      } else {
        stopConnection()
        toast.info(`Removed #${channel}. No channels left to connect to.`)
      }
      return
    }

    toast.success(`Removed #${channel} from your channel list.`)
  }

  const connectionLabel = connecting
    ? `Connecting to #${connectionState.channel ?? activeChannel ?? "channel"}`
    : isActiveChannelConnected
      ? `Connected to #${activeChannel}. Click to disconnect.`
      : activeChannel
        ? `Disconnected from #${activeChannel}. Click to connect.`
        : "No channel selected. Open the menu to add one."

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={cn(
          "flex h-8 overflow-hidden rounded-lg",
          switcherButtonClassName
        )}
      >
        <button
          type="button"
          onClick={toggleConnection}
          disabled={connecting}
          aria-label={connectionLabel}
          className="flex min-w-0 flex-1 items-center cursor-pointer gap-2 px-2.5 text-sm text-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-input/50"
        >
          <ConnectionStatusDot
            connected={isActiveChannelConnected}
            connecting={connecting}
          />
          <span className="truncate font-medium">
            {activeChannel ? `#${activeChannel}` : "Select channel"}
          </span>
        </button>
        <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Switch channel"
          className="flex size-7 h-full items-center cursor-pointer justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-input/50"
        >
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform duration-200 -ml-0.5",
              open && "rotate-180"
            )}
          />
        </button>
      </div>

      {open ? (
        <div
          role="listbox"
          aria-label="Saved channels"
          className="absolute top-full right-0 z-50 mt-1.5 w-72 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Channels
            </p>
          </div>

          <div className="max-h-56 overflow-y-auto p-1.5">
            {savedChannels.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                No saved channels yet. Add one below.
              </p>
            ) : (
              savedChannels.map((channel) => {
                const isSelected = channel === activeChannel

                return (
                  <div
                    key={channel}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => selectChannel(channel)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        selectChannel(channel)
                      }
                    }}
                    className={cn(
                      "group flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-primary/20 text-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="flex size-3.5 shrink-0 items-center justify-center">
                      {isSelected ? (
                        <CheckIcon className="size-3.5 text-primary stroke-4" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      #{channel}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove #${channel}`}
                      onClick={(event) => handleRemoveChannel(event, channel)}
                      className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <div className="border-t border-border p-2">
            <div className="flex gap-1.5">
              <Input
                value={newChannel}
                onChange={(event) => setNewChannel(event.target.value)}
                placeholder="Add channel"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    handleAddChannel()
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Add channel"
                disabled={!newChannel.trim()}
                onClick={handleAddChannel}
              >
                <PlusIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
