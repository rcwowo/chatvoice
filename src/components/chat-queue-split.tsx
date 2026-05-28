import * as React from "react"
import { GripVertical, ListOrdered, MessagesSquareIcon } from "lucide-react"

import {
  loadChatLayoutPrefs,
  saveChatLayoutPrefs,
  type ChatLayoutPrefs,
} from "@/lib/chat-layout-prefs"
import { cn } from "@/lib/utils"

const COLLAPSED_BAR_WIDTH_PX = 40
const COLLAPSE_THRESHOLD_PX = 72
const RESIZE_HANDLE_WIDTH_PX = 12
const MIN_CHAT_WIDTH_PX = 300
const MIN_QUEUE_WIDTH_PX = 180
const MIN_CHAT_FRACTION = 0.35
const MAX_CHAT_FRACTION = 0.8
const SPLIT_MEDIA_QUERY = "(min-width: 640px)"

type ChatQueueSplitProps = {
  chat: React.ReactNode
  queue: React.ReactNode
}

function CollapsedRail({
  label,
  icon: Icon,
  onExpand,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onExpand: () => void
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="flex h-full w-10 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      aria-label={`Expand ${label.toLowerCase()}`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span
        className="text-[10px] font-medium tracking-[0.22em] uppercase [writing-mode:vertical-rl]"
        aria-hidden
      >
        {label}
      </span>
    </button>
  )
}

function ResizeHandle({
  onPointerDown,
  onPointerMove,
  onPointerUp,
  isDragging,
}: {
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
  isDragging: boolean
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat and queue panels"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "group relative z-10 flex w-3 shrink-0 cursor-col-resize touch-none items-center justify-center self-stretch",
        isDragging && "select-none"
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-border opacity-0 transition-opacity",
          "group-hover:opacity-100",
          isDragging && "opacity-100"
        )}
      />
      <GripVertical
        className={cn(
          "relative z-10 size-3 shrink-0 text-muted-foreground/20 transition-colors",
          "group-hover:text-muted-foreground/65",
          isDragging && "text-muted-foreground/80"
        )}
        aria-hidden
      />
    </div>
  )
}

function useSplitLayoutEnabled() {
  const [enabled, setEnabled] = React.useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(SPLIT_MEDIA_QUERY).matches
      : false
  )

  React.useEffect(() => {
    const media = window.matchMedia(SPLIT_MEDIA_QUERY)
    const onChange = () => setEnabled(media.matches)
    onChange()
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  return enabled
}

export function ChatQueueSplit({ chat, queue }: ChatQueueSplitProps) {
  const splitEnabled = useSplitLayoutEnabled()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [layout, setLayout] = React.useState(loadChatLayoutPrefs)
  const layoutRef = React.useRef(layout)
  const [isDragging, setIsDragging] = React.useState(false)

  const commitLayout = React.useCallback((next: ChatLayoutPrefs) => {
    layoutRef.current = next
    setLayout(next)
  }, [])

  const applyPointerPosition = React.useCallback(
    (clientX: number) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const availableWidth = rect.width - RESIZE_HANDLE_WIDTH_PX
      if (availableWidth <= 0) return

      const pointerOffset = clientX - rect.left - RESIZE_HANDLE_WIDTH_PX / 2
      const chatWidth = Math.max(0, Math.min(availableWidth, pointerOffset))

      if (chatWidth < COLLAPSE_THRESHOLD_PX) {
        commitLayout({
          chatFraction: layoutRef.current.chatFraction,
          chatCollapsed: true,
          queueCollapsed: false,
        })
        return
      }

      if (availableWidth - chatWidth < COLLAPSE_THRESHOLD_PX) {
        commitLayout({
          chatFraction: layoutRef.current.chatFraction,
          chatCollapsed: false,
          queueCollapsed: true,
        })
        return
      }

      const maxChatWidth = availableWidth - MIN_QUEUE_WIDTH_PX
      const clampedChatWidth = Math.min(
        maxChatWidth,
        Math.max(MIN_CHAT_WIDTH_PX, chatWidth)
      )
      const chatFraction = Math.min(
        MAX_CHAT_FRACTION,
        Math.max(MIN_CHAT_FRACTION, clampedChatWidth / availableWidth)
      )

      commitLayout({
        chatFraction,
        chatCollapsed: false,
        queueCollapsed: false,
      })
    },
    [commitLayout]
  )

  const endDrag = React.useCallback(() => {
    setIsDragging(false)
    document.body.style.removeProperty("user-select")
    document.body.style.removeProperty("cursor")
    saveChatLayoutPrefs(layoutRef.current)
  }, [])

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      setIsDragging(true)
      document.body.style.userSelect = "none"
      document.body.style.cursor = "col-resize"
      applyPointerPosition(event.clientX)
    },
    [applyPointerPosition]
  )

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return
      applyPointerPosition(event.clientX)
    },
    [applyPointerPosition, isDragging]
  )

  const handlePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      endDrag()
    },
    [endDrag, isDragging]
  )

  const expandChat = React.useCallback(() => {
    const next: ChatLayoutPrefs = {
      ...layoutRef.current,
      chatCollapsed: false,
      queueCollapsed: false,
    }
    commitLayout(next)
    saveChatLayoutPrefs(next)
  }, [commitLayout])

  const expandQueue = React.useCallback(() => {
    const next: ChatLayoutPrefs = {
      ...layoutRef.current,
      chatCollapsed: false,
      queueCollapsed: false,
    }
    commitLayout(next)
    saveChatLayoutPrefs(next)
  }, [commitLayout])

  if (!splitEnabled) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">{chat}</div>
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">{queue}</div>
      </div>
    )
  }

  const chatStyle =
    layout.chatCollapsed
      ? { flex: `0 0 ${COLLAPSED_BAR_WIDTH_PX}px` }
      : layout.queueCollapsed
        ? { flex: "1 1 0%" }
        : { flex: `${layout.chatFraction} 1 0%` }

  const queueStyle =
    layout.queueCollapsed
      ? { flex: `0 0 ${COLLAPSED_BAR_WIDTH_PX}px` }
      : layout.chatCollapsed
        ? { flex: "1 1 0%" }
        : { flex: `${1 - layout.chatFraction} 1 0%` }

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-1 flex-row items-stretch"
    >
      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-1 flex-col",
          layout.chatCollapsed && "shrink-0 flex-none"
        )}
        style={chatStyle}
      >
        {layout.chatCollapsed ? (
          <CollapsedRail
            label="Chat"
            icon={MessagesSquareIcon}
            onExpand={expandChat}
          />
        ) : (
          chat
        )}
      </div>

      <ResizeHandle
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        isDragging={isDragging}
      />

      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-1 flex-col",
          layout.queueCollapsed && "shrink-0 flex-none"
        )}
        style={queueStyle}
      >
        {layout.queueCollapsed ? (
          <CollapsedRail
            label="Queue"
            icon={ListOrdered}
            onExpand={expandQueue}
          />
        ) : (
          queue
        )}
      </div>
    </div>
  )
}
