import {
  type AppConfig,
  type CommandRole,
  type CommandSetting,
  type VoiceProfile,
  normalizeLookupValue,
  pickRandomVoiceProfileId,
} from "@/lib/chatvoice-config"
import { getAssignment, putAssignment } from "@/lib/assignments-db"

export type ChatCommandId =
  | "queue"
  | "playback"
  | "skip"
  | "clear"
  | "newVoice"

export type ParsedChatCommand =
  | { id: "queue"; action: "on" | "off" }
  | { id: "playback"; action: "pause" | "play" }
  | { id: "skip" }
  | { id: "clear" }
  | { id: "newVoice" }

export type ChatCommandActions = {
  setQueueEnabled: (enabled: boolean) => void
  setPlaybackEnabled: (enabled: boolean) => void
  skipCurrent: () => void
  clearQueue: () => void
  voiceProfiles: VoiceProfile[]
}

const ROLE_RANK: Record<CommandRole, number> = {
  broadcaster: 4,
  moderator: 3,
  vip: 2,
  subscriber: 1,
  everyone: 0,
}

/**
 * Parse a chat message into a Chatvoice command, or null if it is not one.
 * Known command syntax is recognized even when the command is disabled, so
 * these messages are never spoken as TTS.
 */
export function parseChatCommand(text: string): ParsedChatCommand | null {
  const parts = text.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return null
  }

  const head = parts[0]!.toLowerCase()

  if (head === "!newvoice") {
    return { id: "newVoice" }
  }

  if (head !== "!cv" || parts.length < 2) {
    return null
  }

  const action = parts[1]!.toLowerCase()

  switch (action) {
    case "on":
      return { id: "queue", action: "on" }
    case "off":
      return { id: "queue", action: "off" }
    case "pause":
      return { id: "playback", action: "pause" }
    case "play":
      return { id: "playback", action: "play" }
    case "skip":
      return { id: "skip" }
    case "clear":
      return { id: "clear" }
    default:
      return null
  }
}

export function getCommandSetting(
  commands: AppConfig["commands"],
  id: ChatCommandId
): CommandSetting {
  return commands[id]
}

export function canRunChatCommand(
  setting: CommandSetting,
  flags: {
    isBroadcaster: boolean
    isModerator: boolean
    isVip: boolean
    isSubscriber: boolean
  },
  userName: string,
  whitelist: string[]
): boolean {
  if (!setting.enabled) {
    return false
  }

  const normalizedUser = normalizeLookupValue(userName)
  if (
    whitelist.some((entry) => normalizeLookupValue(entry) === normalizedUser)
  ) {
    return true
  }

  return userRoleRank(flags) >= ROLE_RANK[setting.minRole]
}

function userRoleRank(flags: {
  isBroadcaster: boolean
  isModerator: boolean
  isVip: boolean
  isSubscriber: boolean
}): number {
  if (flags.isBroadcaster) return ROLE_RANK.broadcaster
  if (flags.isModerator) return ROLE_RANK.moderator
  if (flags.isVip) return ROLE_RANK.vip
  if (flags.isSubscriber) return ROLE_RANK.subscriber
  return ROLE_RANK.everyone
}

/**
 * Attempt to handle a chat message as a command.
 * Returns true when the message matched Chatvoice command syntax (whether or
 * not it was authorized / executed), so callers can skip TTS enqueue.
 */
export async function tryHandleChatCommand(
  message: {
    text: string
    userName: string
    displayName: string
    flags: {
      isBroadcaster: boolean
      isModerator: boolean
      isVip: boolean
      isSubscriber: boolean
    }
  },
  config: AppConfig,
  actions: ChatCommandActions
): Promise<boolean> {
  const parsed = parseChatCommand(message.text)
  if (!parsed) {
    return false
  }

  const setting = getCommandSetting(config.commands, parsed.id)
  if (
    !canRunChatCommand(
      setting,
      message.flags,
      message.userName,
      config.commands.whitelist
    )
  ) {
    return true
  }

  await executeChatCommand(parsed, message, actions)
  return true
}

async function executeChatCommand(
  command: ParsedChatCommand,
  message: { userName: string; displayName: string },
  actions: ChatCommandActions
): Promise<void> {
  switch (command.id) {
    case "queue":
      actions.setQueueEnabled(command.action === "on")
      return
    case "playback":
      actions.setPlaybackEnabled(command.action === "play")
      return
    case "skip":
      actions.skipCurrent()
      return
    case "clear":
      actions.clearQueue()
      return
    case "newVoice":
      await reassignRandomVoice(
        message.userName,
        message.displayName,
        actions.voiceProfiles
      )
      return
  }
}

async function reassignRandomVoice(
  userName: string,
  displayName: string,
  voiceProfiles: VoiceProfile[]
): Promise<void> {
  const existing = await getAssignment(normalizeLookupValue(userName))
  if (!existing) {
    return
  }

  const enabled = voiceProfiles.filter((profile) => profile.enabled)
  const poolSource = enabled.length > 0 ? enabled : voiceProfiles
  const alternatives = poolSource.filter(
    (profile) => profile.id !== existing.voiceProfileId
  )
  const pool = alternatives.length > 0 ? alternatives : poolSource
  // Prefer a different profile when possible; fall back to any enabled voice.
  const voiceProfileId =
    pool.length > 0
      ? (pool[Math.floor(Math.random() * pool.length)]?.id ?? null)
      : pickRandomVoiceProfileId(voiceProfiles)
  if (!voiceProfileId) {
    return
  }

  await putAssignment({
    ...existing,
    displayName: displayName || existing.displayName,
    voiceProfileId,
    lastSeenAt: new Date().toISOString(),
  })
}
