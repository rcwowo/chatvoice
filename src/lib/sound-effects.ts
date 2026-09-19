import {
  buildSpeechText,
  normalizeLookupValue,
  type SoundEffect,
  type WordReplacement,
} from "@/lib/chatvoice-config"
import { applyWordReplacements } from "@/lib/moderation"

// Tokens use the form `(name)`; unknown parentheses are left untouched.

export const SOUND_EFFECT_TOKEN_PATTERN = /\(([A-Za-z0-9_-]+)\)/g

/** Private-use markers keep sound positions intact through text templating. */
const MARKER_START = "\uE000"
const MARKER_END = "\uE001"

export function buildSoundEffectList(sounds: SoundEffect[]): string {
  return sounds.map((sound) => `(${sound.name})`).join(" ")
}

export type MessageSoundSegment =
  | { kind: "speech"; text: string }
  | { kind: "sound"; soundId: string; name: string }

export type BuiltMessageSegments = {
  segments: MessageSoundSegment[]
  text: string
  hasSound: boolean
}

/**
 * Known-but-unauthorized sound names are consumed silently (never spoken),
 * and the template is applied to the full text before splitting so prefixes
 * like "{displayName} says" are only spoken once.
 */
export function buildMessageSegments(options: {
  template: string
  message: string
  userName: string
  displayName: string
  channel: string
  sounds: SoundEffect[]
  canUseSound: (sound: SoundEffect) => boolean
  replacements?: WordReplacement[]
}): BuiltMessageSegments {
  const { template, message, userName, displayName, channel } = options
  const soundByName = new Map<string, SoundEffect>()
  const soundById = new Map<string, SoundEffect>()

  for (const sound of options.sounds) {
    soundByName.set(normalizeLookupValue(sound.name), sound)
    soundById.set(sound.id, sound)
  }

  const withMarkers = message.replace(
    SOUND_EFFECT_TOKEN_PATTERN,
    (match, rawName: string) => {
      const sound = soundByName.get(normalizeLookupValue(rawName))
      if (!sound) {
        return match
      }

      return options.canUseSound(sound)
        ? `${MARKER_START}${sound.id}${MARKER_END}`
        : ""
    }
  )

  const templated = buildSpeechText(
    template,
    withMarkers,
    userName,
    displayName,
    channel
  )

  const segments: MessageSoundSegment[] = []
  let hasSound = false

  const pushSpeech = (value: string) => {
    // Sound tokens have already become private-use markers, so replacements
    // can never clobber a sound effect name.
    const moderated = applyWordReplacements(value, options.replacements ?? [])
    const collapsed = moderated.replace(/\s+/g, " ").trim()
    if (collapsed) {
      segments.push({ kind: "speech", text: collapsed })
    }
  }

  const markerPattern = new RegExp(
    `${MARKER_START}([^${MARKER_END}]*)${MARKER_END}`,
    "g"
  )
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = markerPattern.exec(templated)) !== null) {
    pushSpeech(templated.slice(cursor, match.index))

    const sound = soundById.get(match[1] ?? "")
    if (sound) {
      segments.push({ kind: "sound", soundId: sound.id, name: sound.name })
      hasSound = true
    }

    cursor = match.index + match[0].length
  }

  pushSpeech(templated.slice(cursor))

  const text = segments
    .map((segment) =>
      segment.kind === "speech" ? segment.text : `[${segment.name}]`
    )
    .join(" ")
    .trim()

  return { segments, text, hasSound }
}
