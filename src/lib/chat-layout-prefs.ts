import { z } from "zod"

export const CHAT_LAYOUT_STORAGE_KEY = "chatvoice::chat-layout"

const chatLayoutPrefsSchema = z.object({
  chatFraction: z.number().min(0.32).max(0.85),
  chatCollapsed: z.boolean(),
  queueCollapsed: z.boolean(),
})

export type ChatLayoutPrefs = z.infer<typeof chatLayoutPrefsSchema>

export const DEFAULT_CHAT_LAYOUT: ChatLayoutPrefs = {
  chatFraction: 2 / 3,
  chatCollapsed: false,
  queueCollapsed: false,
}

export function loadChatLayoutPrefs(): ChatLayoutPrefs {
  if (typeof window === "undefined") {
    return DEFAULT_CHAT_LAYOUT
  }

  try {
    const raw = window.localStorage.getItem(CHAT_LAYOUT_STORAGE_KEY)
    if (!raw) return DEFAULT_CHAT_LAYOUT

    const parsed = chatLayoutPrefsSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return DEFAULT_CHAT_LAYOUT

    const { chatCollapsed, queueCollapsed } = parsed.data
    if (chatCollapsed && queueCollapsed) {
      return { ...parsed.data, queueCollapsed: false }
    }

    return parsed.data
  } catch {
    return DEFAULT_CHAT_LAYOUT
  }
}

export function saveChatLayoutPrefs(prefs: ChatLayoutPrefs) {
  if (typeof window === "undefined") return

  const normalized = chatLayoutPrefsSchema.parse({
    ...prefs,
    queueCollapsed: prefs.chatCollapsed && prefs.queueCollapsed ? false : prefs.queueCollapsed,
  })

  window.localStorage.setItem(
    CHAT_LAYOUT_STORAGE_KEY,
    JSON.stringify(normalized)
  )
}
