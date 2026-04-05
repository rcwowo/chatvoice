import * as React from "react"

/**
 * Thin wrapper around the browser `SpeechSynthesis` API for listing available
 * voices.
 *
 * `getVoices()` is async in most browsers - voices are populated after a
 * `voiceschanged` event. This hook handles that lifecycle and returns a
 * stable, sorted array of `SpeechSynthesisVoice` objects.
 */

export type BrowserVoice = {
  /** The internal voice name used as a key (matches `SpeechSynthesisVoice.name`). */
  name: string
  /** Human-readable label (same as `name` - browser voices don't separate these). */
  label: string
  /** BCP-47 language tag, e.g. "en-US". */
  lang: string
  /** Whether the voice is provided locally (true) or from a remote service. */
  localService: boolean
}

export function useBrowserVoices() {
  const [voices, setVoices] = React.useState<BrowserVoice[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const synth = window.speechSynthesis
    if (!synth) {
      setLoading(false)
      return
    }

    function update() {
      const raw = synth.getVoices()
      const mapped = raw
        .map<BrowserVoice>((voice) => ({
          name: voice.name,
          label: voice.name,
          lang: voice.lang,
          localService: voice.localService,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))

      setVoices(mapped)
      setLoading(false)
    }

    // Some browsers populate voices synchronously
    update()

    // Most browsers fire voiceschanged asynchronously
    synth.addEventListener("voiceschanged", update)

    return () => {
      synth.removeEventListener("voiceschanged", update)
    }
  }, [])

  return { voices, loading }
}

/**
 * Look up the native `SpeechSynthesisVoice` by name.
 * Returns `null` if not found (e.g. stale config referencing removed voice).
 */
export function findSynthVoice(name: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? []
  return voices.find((voice) => voice.name === name) ?? null
}

/**
 * Convert a config rate (-100..100) to `SpeechSynthesisUtterance.rate`
 * (0.1..10, default 1).
 *
 * Mapping: 0 → 1, +100 → 3, -100 → 0.1
 */
export function configRateToSpeechRate(value: number): number {
  if (value >= 0) {
    return 1 + (value / 100) * 2 // 0→1, 100→3
  }
  return Math.max(0.1, 1 + (value / 100) * 0.9) // -100→0.1, 0→1
}

/**
 * Convert a config pitch (-100..100) to `SpeechSynthesisUtterance.pitch`
 * (0..2, default 1).
 *
 * Linear mapping: -100 → 0, 0 → 1, +100 → 2.
 */
export function configPitchToSpeechPitch(value: number): number {
  return Math.max(0, Math.min(2, 1 + value / 100))
}

/**
 * Convert a config volume (-100..100) to `SpeechSynthesisUtterance.volume`
 * (0..1, default 1).
 *
 * Linear mapping: -100 → 0, 0 → 1, +100 → 1.
 */
export function configVolumeToSpeechVolume(value: number): number {
  if (value >= 0) return 1
  return Math.max(0, (100 + value) / 100) // -100→0, 0→1
}
