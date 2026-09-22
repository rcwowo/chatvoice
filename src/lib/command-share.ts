import { type CommandRole, type CommandsConfig } from "@/lib/chatvoice-config"

export const COMMAND_SHARE_ORDER = [
  "queue",
  "playback",
  "skip",
  "clear",
  "newVoice",
] as const

export type CommandShareId = (typeof COMMAND_SHARE_ORDER)[number]

export type SharedCommandState = {
  id: CommandShareId
  enabled: boolean
  minRole: CommandRole
}

export const COMMAND_CATALOG: Record<
  CommandShareId,
  { command: string; description: string }
> = {
  queue: {
    command: "!cv on / !cv off",
    description: "Enable or disable adding new chat messages to the queue.",
  },
  playback: {
    command: "!cv pause / !cv play",
    description: "Pause or resume the currently speaking message.",
  },
  skip: {
    command: "!cv skip",
    description: "Skip the message currently being spoken.",
  },
  clear: {
    command: "!cv clear",
    description: "Clear every message waiting in the queue.",
  },
  newVoice: {
    command: "!newvoice",
    description:
      "Reassign the chatter to a random voice if they already have one saved.",
  },
}

const ROLE_TO_DIGIT: Record<CommandRole, string> = {
  everyone: "1",
  subscriber: "2",
  vip: "3",
  moderator: "4",
  broadcaster: "5",
}

const DIGIT_TO_ROLE: Record<string, CommandRole> = {
  "1": "everyone",
  "2": "subscriber",
  "3": "vip",
  "4": "moderator",
  "5": "broadcaster",
}

const DEFAULT_MIN_ROLE: Record<CommandShareId, CommandRole> = {
  queue: "moderator",
  playback: "moderator",
  skip: "moderator",
  clear: "moderator",
  newVoice: "everyone",
}

const COMMANDS_SHARE_PARAM_PATTERN = /^[0-5]{5}$/

export type CommandsShareParamResult =
  | { kind: "absent" }
  | { kind: "invalid" }
  | { kind: "valid"; commands: SharedCommandState[] }

export function commandsFromConfig(
  commands: CommandsConfig
): SharedCommandState[] {
  return COMMAND_SHARE_ORDER.map((id) => ({
    id,
    enabled: commands[id].enabled,
    minRole: commands[id].minRole,
  }))
}

export function disabledSharedCommands(): SharedCommandState[] {
  return COMMAND_SHARE_ORDER.map((id) => ({
    id,
    enabled: false,
    minRole: DEFAULT_MIN_ROLE[id],
  }))
}

export function encodeCommandsShareParam(
  commands: CommandsConfig | SharedCommandState[]
): string {
  const states = Array.isArray(commands)
    ? commands
    : commandsFromConfig(commands)

  return COMMAND_SHARE_ORDER.map((id) => {
    const setting = states.find((state) => state.id === id)
    if (!setting?.enabled) {
      return "0"
    }

    return ROLE_TO_DIGIT[setting.minRole]
  }).join("")
}

export function parseCommandsShareParam(
  value: string | null
): CommandsShareParamResult {
  if (value === null || value.trim() === "") {
    return { kind: "absent" }
  }

  const encoded = value.trim()
  if (!COMMANDS_SHARE_PARAM_PATTERN.test(encoded)) {
    return { kind: "invalid" }
  }

  return {
    kind: "valid",
    commands: COMMAND_SHARE_ORDER.map((id, index) => {
      const digit = encoded[index]!
      const minRole = DIGIT_TO_ROLE[digit]

      if (!minRole) {
        return {
          id,
          enabled: false,
          minRole: DEFAULT_MIN_ROLE[id],
        }
      }

      return {
        id,
        enabled: true,
        minRole,
      }
    }),
  }
}

const ROLE_SORT_RANK: Record<CommandRole, number> = {
  everyone: 0,
  subscriber: 1,
  vip: 2,
  moderator: 3,
  broadcaster: 4,
}

export function sortSharedCommandsByRole(
  commands: SharedCommandState[]
): SharedCommandState[] {
  return [...commands].sort(
    (left, right) =>
      ROLE_SORT_RANK[left.minRole] - ROLE_SORT_RANK[right.minRole]
  )
}

export function groupSharedCommands(commands: SharedCommandState[]): {
  enabled: SharedCommandState[]
  disabled: SharedCommandState[]
  mixed: boolean
} {
  const enabled = sortSharedCommandsByRole(
    commands.filter((command) => command.enabled)
  )
  const disabled = commands.filter((command) => !command.enabled)

  return {
    enabled,
    disabled,
    mixed: enabled.length > 0 && disabled.length > 0,
  }
}

export const CHATVOICE_PUBLIC_ORIGIN = "https://chatvoice.rcw.lol"

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    return hostname === "localhost" || hostname === "127.0.0.1"
  } catch {
    return false
  }
}

export function getCommandsShareOrigin(
  locationOrigin: string = typeof window !== "undefined"
    ? window.location.origin
    : CHATVOICE_PUBLIC_ORIGIN
): string {
  if (!locationOrigin || isLocalOrigin(locationOrigin)) {
    return CHATVOICE_PUBLIC_ORIGIN
  }

  return locationOrigin
}

export function buildCommandsShareUrl(
  commands: CommandsConfig | SharedCommandState[],
  origin: string = getCommandsShareOrigin()
): string {
  const url = new URL("/commands", origin)
  url.searchParams.set("c", encodeCommandsShareParam(commands))
  return url.toString()
}

export function buildCommandsShareMessage(
  commands: CommandsConfig | SharedCommandState[],
  origin: string = getCommandsShareOrigin()
): string {
  return `Learn how to use the Chatvoice TTS commands for this channel: ${buildCommandsShareUrl(commands, origin)}`
}

export function sharedCommandRoleLabel(state: SharedCommandState): string {
  if (!state.enabled) {
    return "Disabled"
  }

  switch (state.minRole) {
    case "everyone":
      return "Everyone"
    case "subscriber":
      return "Subscribers"
    case "vip":
      return "VIPs"
    case "moderator":
      return "Moderators"
    case "broadcaster":
      return "Broadcaster only"
  }
}
