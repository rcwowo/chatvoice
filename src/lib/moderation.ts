import type { WordReplacement } from "@/lib/chatvoice-config"

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const patternCache = new WeakMap<WordReplacement, RegExp | null>()

/**
 * Builds a case-insensitive pattern that matches a whole word or phrase.
 * Boundaries are only asserted on sides that start/end with a word character,
 * so terms like "f*ck!" still match without swallowing neighbouring letters.
 */
export function getWordReplacementPattern(
  replacement: WordReplacement
): RegExp | null {
  const cached = patternCache.get(replacement)
  if (cached !== undefined) {
    return cached
  }

  const pattern = buildWordReplacementPattern(replacement.from)
  patternCache.set(replacement, pattern)
  return pattern
}

export function buildWordReplacementPattern(term: string): RegExp | null {
  const trimmed = term.trim()
  if (!trimmed) {
    return null
  }

  const prefix = /^\w/.test(trimmed) ? "(?<!\\w)" : ""
  const suffix = /\w$/.test(trimmed) ? "(?!\\w)" : ""

  return new RegExp(`${prefix}${escapeRegExp(trimmed)}${suffix}`, "gi")
}

/**
 * Applies every enabled replacement in order. An empty replacement removes the
 * match, and any leftover whitespace or stranded punctuation is tidied up.
 */
export function applyWordReplacements(
  text: string,
  replacements: WordReplacement[]
): string {
  let result = text
  let removed = false

  for (const replacement of replacements) {
    if (!replacement.enabled) {
      continue
    }

    const pattern = getWordReplacementPattern(replacement)
    if (!pattern) {
      continue
    }

    result = result.replace(pattern, () => {
      if (!replacement.to) {
        removed = true
      }
      return replacement.to
    })
  }

  if (!removed) {
    return result
  }

  return result
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim()
}

export function createWordReplacement(): WordReplacement {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `replacement-${Date.now()}`,
    from: "",
    to: "",
    enabled: true,
  }
}
