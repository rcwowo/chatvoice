import * as React from "react"
import { AudioLinesIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const CHATTERS = [
  {
    displayName: "Realviewer67",
    userName: "realviewer67",
    initials: "R",
    accent: "oklch(0.72 0.14 320)",
  },
  {
    displayName: "MikuDayo01",
    userName: "mikudayo01",
    initials: "MD",
    accent: "oklch(0.72 0.12 250)",
  },
  {
    displayName: "queen_nefer",
    userName: "queen_nefer",
    initials: "QN",
    accent: "oklch(0.75 0.12 180)",
  },
  {
    displayName: "SadTacos",
    userName: "sadtacos",
    initials: "ST",
    accent: "oklch(0.78 0.14 80)",
  },
] as const

const VOICES = [
  { name: "Aria", accent: "oklch(0.72 0.14 320)" },
  { name: "Brian", accent: "oklch(0.72 0.12 250)" },
  { name: "Jenny", accent: "oklch(0.75 0.12 180)" },
  { name: "Guy", accent: "oklch(0.78 0.14 80)" },
] as const

type Voice = (typeof VOICES)[number]
type Phase = "chatter" | "link" | "voice" | "hold" | "shuffle"

const SHUFFLE_MS = 780
const ROW_EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

function shuffleVoices(previous: readonly Voice[]): Voice[] {
  const items = [...VOICES]
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = items[i]!
    items[i] = items[j]!
    items[j] = current
  }

  const sameOrder = items.every(
    (voice, index) => voice.name === previous[index]?.name
  )
  if (sameOrder && items.length > 1) {
    const first = items[0]!
    items[0] = items[1]!
    items[1] = first
  }

  return items
}

function AssignmentArrow({
  accent,
  active,
  linked,
  shuffling,
  className,
}: {
  accent: string
  active: boolean
  linked: boolean
  shuffling: boolean
  className?: string
}) {
  const visible = !shuffling && (active || linked)
  const [solid, setSolid] = React.useState(false)
  const marching = !solid

  React.useEffect(() => {
    if (shuffling || (!active && !linked)) {
      setSolid(false)
      return
    }

    if (linked && !active) {
      setSolid(true)
      return
    }

    setSolid(false)
    const solidId = window.setTimeout(() => setSolid(true), 720)
    return () => window.clearTimeout(solidId)
  }, [active, linked, shuffling])

  return (
    <svg
      viewBox="0 0 80 24"
      fill="none"
      aria-hidden
      className={cn("h-6 w-14 sm:w-20 md:w-24", className)}
      style={{
        opacity: shuffling ? 0 : visible ? 1 : 0,
        transition: "opacity 0.45s ease",
      }}
    >
      <path
        className={cn(marching && "assignment-arrow-line")}
        d="M6 12h64"
        stroke={accent}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray={solid ? "22 0" : "12 10"}
        strokeDashoffset={marching ? undefined : 0}
        opacity={active ? 1 : linked ? 0.5 : 1}
        style={{
          transition: `stroke-dasharray 0.55s ${ROW_EASE}, opacity 0.4s ease`,
          ...(marching
            ? { animation: "assignment-flow 1.1s linear infinite" }
            : undefined),
        }}
      />
      <path
        d="M62 5l12 7-12 7"
        stroke={accent}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 1 : linked ? 0.5 : 1}
        style={{
          transition: "opacity 0.4s ease",
        }}
      />
    </svg>
  )
}

export function VoiceAssignmentDemo({ className }: { className?: string }) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [phase, setPhase] = React.useState<Phase>("chatter")
  const [linkedCount, setLinkedCount] = React.useState(0)
  const [voices, setVoices] = React.useState<Voice[]>(() => [...VOICES])
  const [shuffling, setShuffling] = React.useState(false)
  const reduceMotion = usePrefersReducedMotion()

  const voiceItemRefs = React.useRef(new Map<string, HTMLLIElement>())
  const pendingFlip = React.useRef<Map<string, number> | null>(null)
  const [flipOffsets, setFlipOffsets] = React.useState<Record<string, number>>(
    {}
  )
  const [flipAnimating, setFlipAnimating] = React.useState(false)

  React.useLayoutEffect(() => {
    const firstTops = pendingFlip.current
    if (!firstTops) return
    pendingFlip.current = null

    const nextOffsets: Record<string, number> = {}
    for (const [name, el] of voiceItemRefs.current) {
      const firstTop = firstTops.get(name)
      if (firstTop == null) continue
      nextOffsets[name] = firstTop - el.getBoundingClientRect().top
    }

    setFlipOffsets(nextOffsets)
    setFlipAnimating(false)

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlipAnimating(true)
        setFlipOffsets({})
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [voices])

  React.useEffect(() => {
    if (reduceMotion) {
      setLinkedCount(CHATTERS.length)
      setPhase("voice")
      setShuffling(false)
      return
    }

    let cancelled = false
    const timeouts: number[] = []

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timeouts.push(window.setTimeout(resolve, ms))
      })

    const runShuffle = async () => {
      setPhase("shuffle")
      setShuffling(true)
      setLinkedCount(0)
      setActiveIndex(-1)

      await wait(320)
      if (cancelled) return

      const firstTops = new Map<string, number>()
      for (const [name, el] of voiceItemRefs.current) {
        firstTops.set(name, el.getBoundingClientRect().top)
      }
      pendingFlip.current = firstTops

      setVoices((current) => shuffleVoices(current))

      await wait(SHUFFLE_MS + 80)
      if (cancelled) return

      setShuffling(false)
      setFlipAnimating(false)
      await wait(220)
    }

    const runCycle = async (index: number) => {
      if (cancelled) return

      setActiveIndex(index)
      setPhase("chatter")
      setLinkedCount(index)

      await wait(520)
      if (cancelled) return

      setPhase("link")
      setLinkedCount(index + 1)

      await wait(620)
      if (cancelled) return

      setPhase("voice")

      await wait(720)
      if (cancelled) return

      setPhase("hold")
      await wait(380)
      if (cancelled) return

      const next = (index + 1) % CHATTERS.length
      if (next === 0) {
        await runShuffle()
        if (cancelled) return
      }
      void runCycle(next)
    }

    timeouts.push(window.setTimeout(() => void runCycle(0), 700))

    return () => {
      cancelled = true
      for (const id of timeouts) window.clearTimeout(id)
    }
  }, [reduceMotion])

  return (
    <div
      className={cn(
        "grid w-full grid-cols-[1fr_auto_1fr] items-stretch gap-3 sm:gap-5 md:gap-8",
        className
      )}
      role="img"
      aria-label="Chatters being randomly assigned to different voice profiles"
    >
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-2xl shadow-black/50",
          "animate-in fade-in slide-in-from-left-2 duration-700 delay-700 fill-mode-both"
        )}
      >
        <div className="border-b border-white/5 px-4 py-3 sm:px-5">
          <p className="text-left text-xs font-medium tracking-wide text-white/40 uppercase">
            Chatters
          </p>
        </div>
        <ul className="divide-y divide-white/5" role="list">
          {CHATTERS.map((row, index) => {
            const active = !reduceMotion && activeIndex === index
            const linked = reduceMotion || index < linkedCount
            const emphasized =
              reduceMotion ||
              shuffling ||
              linked ||
              (active && phase !== "shuffle")

            return (
              <li
                key={row.userName}
                className={cn(
                  "flex h-14 items-center gap-3 px-4 text-left sm:h-16 sm:gap-3.5 sm:px-5",
                  "transition-[opacity,background-color] duration-500 ease-out",
                  active && phase === "chatter" && "bg-white/[0.04]",
                  emphasized ? "opacity-100" : "opacity-40"
                )}
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white transition-transform duration-500 ease-out"
                  style={{
                    background: `color-mix(in oklch, ${row.accent} ${active && phase === "chatter" ? 45 : 30}%, #1a1a1a)`,
                    boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${row.accent} ${active && phase === "chatter" ? 60 : 40}%, transparent)`,
                    transform:
                      active && phase === "chatter" ? "scale(1.06)" : "scale(1)",
                  }}
                >
                  {row.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white sm:text-base">
                    {row.displayName}
                  </p>
                  <p className="truncate text-xs text-white/40">@{row.userName}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-col pt-px" aria-hidden>
        <div className="border-b border-transparent px-4 py-3 sm:px-5">
          <p className="invisible text-xs font-medium tracking-wide uppercase">
            Chatters
          </p>
        </div>
        {CHATTERS.map((chatter, index) => {
          const voice = voices[index]!
          const active =
            !reduceMotion &&
            activeIndex === index &&
            (phase === "link" || phase === "voice" || phase === "hold")
          const linked = reduceMotion || index < linkedCount

          return (
            <div
              key={chatter.userName}
              className={cn(
                "flex h-14 items-center justify-center sm:h-16",
                index > 0 && "border-t border-transparent"
              )}
            >
              <AssignmentArrow
                accent={voice.accent}
                active={active}
                linked={linked}
                shuffling={shuffling}
              />
            </div>
          )
        })}
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-2xl shadow-black/50",
          "animate-in fade-in slide-in-from-right-2 duration-700 delay-700 fill-mode-both",
          shuffling && "ring-1 ring-white/10"
        )}
      >
        <div className="border-b border-white/5 px-4 py-3 sm:px-5">
          <p className="text-left text-xs font-medium tracking-wide text-white/40 uppercase">
            Voice profiles
          </p>
        </div>
        <ul className="relative divide-y divide-white/5" role="list">
          {voices.map((voice, index) => {
            const active =
              !reduceMotion &&
              activeIndex === index &&
              (phase === "voice" || phase === "hold")
            const linked = reduceMotion || index < linkedCount
            const emphasized =
              reduceMotion || shuffling || linked || active
            const offsetY = flipOffsets[voice.name] ?? 0

            return (
              <li
                key={voice.name}
                ref={(node) => {
                  if (node) voiceItemRefs.current.set(voice.name, node)
                  else voiceItemRefs.current.delete(voice.name)
                }}
                className={cn(
                  "relative flex h-14 items-center gap-3 px-4 text-left sm:h-16 sm:gap-3.5 sm:px-5",
                  "transition-[opacity,background-color,box-shadow] duration-500 ease-out",
                  active && "bg-white/[0.04]",
                  shuffling && "z-10 bg-[#0c0c0c]",
                  emphasized ? "opacity-100" : "opacity-40"
                )}
                style={{
                  transform: `translateY(${offsetY}px) scale(${shuffling && offsetY !== 0 ? 1.03 : shuffling ? 1.02 : 1})`,
                  transition: flipAnimating
                    ? `transform ${SHUFFLE_MS}ms ${ROW_EASE}, opacity 0.5s ease, background-color 0.5s ease`
                    : offsetY !== 0
                      ? "none"
                      : `opacity 0.5s ease, background-color 0.5s ease, transform 0.45s ${ROW_EASE}`,
                  zIndex: shuffling ? 10 + index : undefined,
                }}
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-500 ease-out"
                  style={{
                    background: `color-mix(in oklch, ${voice.accent} ${active || shuffling ? 28 : 16}%, #0c0c0c)`,
                    boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${voice.accent} ${active || shuffling ? 55 : 35}%, transparent)`,
                    transform: active ? "scale(1.06)" : "scale(1)",
                  }}
                >
                  <AudioLinesIcon
                    className="size-3.5 sm:size-4"
                    style={{ color: voice.accent }}
                  />
                </span>
                <p className="truncate text-sm font-medium text-white sm:text-base">
                  {voice.name}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return reduced
}
