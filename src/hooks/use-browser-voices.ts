import * as React from "react"

// getVoices() is async in most browsers: voices populate after a
// voiceschanged event, so we read both immediately and on the event.

export type BrowserVoice = {
  name: string
  label: string
  lang: string
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

export function findSynthVoice(name: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? []
  return voices.find((voice) => voice.name === name) ?? null
}

export function configRateToSpeechRate(value: number): number {
  if (value >= 0) {
    return 1 + (value / 100) * 2 // 0→1, 100→3
  }
  return Math.max(0.1, 1 + (value / 100) * 0.9) // -100→0.1, 0→1
}

export function configPitchToSpeechPitch(value: number): number {
  return Math.max(0, Math.min(2, 1 + value / 100))
}

export function configVolumeToSpeechVolume(value: number): number {
  if (value >= 0) return 1
  return Math.max(0, (100 + value) / 100) // -100→0, 0→1
}
