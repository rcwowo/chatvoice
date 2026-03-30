import { z } from "zod"

export const CHATVOICE_STORAGE_KEY = "chatvoice::config"
export const CHATVOICE_SCHEMA_VERSION = 1
export const CHATVOICE_APP_VERSION = "0.0.1"
export const DEFAULT_PREVIEW_TEXT =
  "Hello chat. This is Chatvoice testing a saved voice profile."

const voiceProfileSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  voice: z.string().min(1),
  rate: z.number().min(-100).max(100),
  pitch: z.number().min(-100).max(100),
  volume: z.number().min(-100).max(100),
  enabled: z.boolean(),
})

const voiceAssignmentSchema = z.object({
  userName: z.string().min(1),
  displayName: z.string().min(1),
  voiceProfileId: z.string().min(1),
  createdAt: z.string().min(1),
  lastSeenAt: z.string().min(1),
})

const playbackSchema = z.object({
  enabled: z.boolean(),
  textTemplate: z.string().min(1),
  ignoreCommands: z.boolean(),
  skipBots: z.boolean(),
  skipBroadcaster: z.boolean(),
  skipModerators: z.boolean(),
  skipSubscribers: z.boolean(),
  stripLinks: z.boolean(),
  minMessageLength: z.number().int().min(0).max(500),
  maxMessageLength: z.number().int().min(1).max(500),
  maxQueueSize: z.number().int().min(1).max(50),
  blockedUsers: z.array(z.string()),
  blockedTerms: z.array(z.string()),
})

const twitchSchema = z.object({
  channel: z.string(),
  clientId: z.string(),
  accessToken: z.string(),
  readOnly: z.boolean(),
  autoConnect: z.boolean(),
})

const appConfigSchema = z.object({
  schemaVersion: z.literal(CHATVOICE_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  twitch: twitchSchema,
  playback: playbackSchema,
  voiceProfiles: z.array(voiceProfileSchema).min(1),
  assignments: z.record(z.string(), voiceAssignmentSchema),
})

const backupEnvelopeSchema = z.object({
  app: z.literal("chatvoice"),
  appVersion: z.string().min(1),
  exportedAt: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  data: z.unknown(),
})

export type VoiceProfile = z.infer<typeof voiceProfileSchema>
export type VoiceAssignment = z.infer<typeof voiceAssignmentSchema>
export type PlaybackConfig = z.infer<typeof playbackSchema>
export type TwitchConfig = z.infer<typeof twitchSchema>
export type AppConfig = z.infer<typeof appConfigSchema>

export type BackupEnvelope = z.infer<typeof backupEnvelopeSchema>

const DEFAULT_VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "voice-brian",
    label: "Brian",
    voice: "en-US-BrianNeural",
    rate: -5,
    pitch: -10,
    volume: 0,
    enabled: true,
  }
]

export function createDefaultConfig(): AppConfig {
  return {
    schemaVersion: CHATVOICE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    twitch: {
      channel: "",
      clientId: "",
      accessToken: "",
      readOnly: true,
      autoConnect: true,
    },
    playback: {
      enabled: true,
      textTemplate: "{displayName} says {message}",
      ignoreCommands: true,
      skipBots: true,
      skipBroadcaster: false,
      skipModerators: false,
      skipSubscribers: false,
      stripLinks: true,
      minMessageLength: 1,
      maxMessageLength: 220,
      maxQueueSize: 10,
      blockedUsers: [],
      blockedTerms: [],
    },
    voiceProfiles: DEFAULT_VOICE_PROFILES,
    assignments: {},
  }
}

export function loadConfig(): AppConfig {
  if (typeof window === "undefined") {
    return createDefaultConfig()
  }

  const raw = window.localStorage.getItem(CHATVOICE_STORAGE_KEY)
  if (!raw) {
    return createDefaultConfig()
  }

  try {
    return migrateConfig(JSON.parse(raw))
  } catch {
    return createDefaultConfig()
  }
}

export function saveConfig(config: AppConfig) {
  if (typeof window === "undefined") {
    return
  }

  const normalized = normalizeConfig({
    ...config,
    updatedAt: new Date().toISOString(),
  })
  window.localStorage.setItem(CHATVOICE_STORAGE_KEY, JSON.stringify(normalized))
}

export function exportConfigBackup(config: AppConfig): string {
  const envelope: BackupEnvelope = {
    app: "chatvoice",
    appVersion: CHATVOICE_APP_VERSION,
    exportedAt: new Date().toISOString(),
    schemaVersion: CHATVOICE_SCHEMA_VERSION,
    data: normalizeConfig(config),
  }

  return JSON.stringify(envelope, null, 2)
}

export function importConfigBackup(payload: string): AppConfig {
  const parsed = JSON.parse(payload)
  return migrateConfig(parsed)
}

export function migrateConfig(input: unknown): AppConfig {
  const envelopeResult = backupEnvelopeSchema.safeParse(input)
  if (envelopeResult.success) {
    return migrateConfig(envelopeResult.data.data)
  }

  const object = input as Record<string, unknown>

  if (
    object &&
    typeof object === "object" &&
    !Array.isArray(object) &&
    !("schemaVersion" in object)
  ) {
    const merged = {
      ...createDefaultConfig(),
      ...object,
      twitch: {
        ...createDefaultConfig().twitch,
        ...(typeof object.twitch === "object" && object.twitch
          ? object.twitch
          : {}),
      },
      playback: {
        ...createDefaultConfig().playback,
        ...(typeof object.playback === "object" && object.playback
          ? object.playback
          : {}),
      },
      schemaVersion: CHATVOICE_SCHEMA_VERSION,
    }

    return normalizeConfig(appConfigSchema.parse(merged))
  }

  return normalizeConfig(appConfigSchema.parse(input))
}

export function createVoiceProfile(seed: number, voice?: string): VoiceProfile {
  const index = seed + 1

  return {
    id:
      typeof crypto !== "undefined"
        ? crypto.randomUUID()
        : `voice-${Date.now()}-${seed}`,
    label: `Voice ${index}`,
    voice:
      voice ??
      DEFAULT_VOICE_PROFILES[seed % DEFAULT_VOICE_PROFILES.length].voice,
    rate: 0,
    pitch: 0,
    volume: 0,
    enabled: true,
  }
}

export function ensureVoiceAssignment(
  config: AppConfig,
  userName: string,
  displayName: string
): { config: AppConfig; assignment: VoiceAssignment | null; created: boolean } {
  const normalizedUserName = normalizeLookupValue(userName)
  const now = new Date().toISOString()
  const existing = config.assignments[normalizedUserName]
  const availableVoiceProfileId = pickRandomVoiceProfileId(config.voiceProfiles)

  if (!availableVoiceProfileId) {
    return { config, assignment: null, created: false }
  }

  if (
    existing &&
    hasVoiceProfile(config.voiceProfiles, existing.voiceProfileId)
  ) {
    const updatedAssignment: VoiceAssignment = {
      ...existing,
      displayName: displayName || existing.displayName,
      lastSeenAt: now,
    }

    return {
      config: {
        ...config,
        assignments: {
          ...config.assignments,
          [normalizedUserName]: updatedAssignment,
        },
      },
      assignment: updatedAssignment,
      created: false,
    }
  }

  const assignment: VoiceAssignment = {
    userName: normalizedUserName,
    displayName: displayName || userName,
    voiceProfileId: existing?.voiceProfileId ?? availableVoiceProfileId,
    createdAt: existing?.createdAt ?? now,
    lastSeenAt: now,
  }

  return {
    config: {
      ...config,
      assignments: {
        ...config.assignments,
        [normalizedUserName]: assignment,
      },
    },
    assignment,
    created: true,
  }
}

export function pickRandomVoiceProfileId(
  voiceProfiles: VoiceProfile[]
): string | null {
  const enabledVoiceProfiles = voiceProfiles.filter(
    (profile) => profile.enabled
  )
  const source =
    enabledVoiceProfiles.length > 0 ? enabledVoiceProfiles : voiceProfiles

  if (source.length === 0) {
    return null
  }

  return source[Math.floor(Math.random() * source.length)]?.id ?? null
}

export function buildSpeechText(
  template: string,
  message: string,
  userName: string,
  displayName: string,
  channel: string
): string {
  return template
    .replaceAll("{message}", message)
    .replaceAll("{user}", userName)
    .replaceAll("{displayName}", displayName)
    .replaceAll("{channel}", channel)
}

export function sanitizeMessageText(text: string, stripLinks: boolean): string {
  const withoutLinks = stripLinks
    ? text.replaceAll(/https?:\/\/\S+/g, "")
    : text
  const withoutControlCharacters = Array.from(withoutLinks, (character) => {
    const codePoint = character.codePointAt(0) ?? 0

    if ((codePoint >= 0 && codePoint <= 31) || codePoint === 127) {
      return " "
    }

    return character
  }).join("")

  return withoutControlCharacters.replaceAll(/\s+/g, " ").trim()
}

export function normalizeLookupValue(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeConfig(config: AppConfig): AppConfig {
  const nextVoiceProfiles =
    config.voiceProfiles.length > 0
      ? config.voiceProfiles
      : DEFAULT_VOICE_PROFILES
  const fallbackVoiceProfileId = pickRandomVoiceProfileId(nextVoiceProfiles)
  const nextAssignments = Object.fromEntries(
    Object.entries(config.assignments).map(([key, assignment]) => {
      const normalizedKey = normalizeLookupValue(key)

      return [
        normalizedKey,
        {
          ...assignment,
          userName: normalizeLookupValue(assignment.userName || normalizedKey),
          displayName:
            assignment.displayName || assignment.userName || normalizedKey,
          voiceProfileId:
            hasVoiceProfile(nextVoiceProfiles, assignment.voiceProfileId) &&
            assignment.voiceProfileId
              ? assignment.voiceProfileId
              : (fallbackVoiceProfileId ?? nextVoiceProfiles[0]!.id),
        },
      ]
    })
  )

  return {
    ...config,
    updatedAt: config.updatedAt || new Date().toISOString(),
    voiceProfiles: nextVoiceProfiles,
    assignments: nextAssignments,
  }
}

function hasVoiceProfile(
  voiceProfiles: VoiceProfile[],
  voiceProfileId: string
): boolean {
  return voiceProfiles.some((profile) => profile.id === voiceProfileId)
}
