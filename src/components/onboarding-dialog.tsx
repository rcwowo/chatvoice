import * as React from "react"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CloudUploadIcon,
  SparklesIcon,
  SettingsIcon,
  TriangleAlertIcon,
  User,
  Users,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import type { QueueMode } from "@/lib/chatvoice-config"
import iconSrc from "/icon.png"
import logoSrc from "/logo.png"
import { useChatvoiceSettings } from "@/lib/chatvoice-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OnboardingStep = "welcome" | "voices" | "mode" | "channel"

const TRACKED_STEPS: OnboardingStep[] = ["voices", "mode", "channel"]

// ---------------------------------------------------------------------------
// Onboarding Dialog
// ---------------------------------------------------------------------------

export function OnboardingDialog({
  open,
  onComplete,
}: {
  open: boolean
  onComplete: () => void
}) {
  const { updateConfig, restoreBackup, voices, voicesLoading } = useChatvoiceSettings()

  const [step, setStep] = React.useState<OnboardingStep>("welcome")

  // Mode selection
  const [selectedMode, setSelectedMode] = React.useState<QueueMode | null>(null)

  // Channel & voice selection
  const [channel, setChannel] = React.useState("")
  const [selectedVoice, setSelectedVoice] = React.useState("")

  // Backup import
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const hasVoices = voices.length > 0

  // Set a sensible default voice once voices load
  React.useEffect(() => {
    if (voices.length > 0 && !selectedVoice) {
      const english = voices.find((v) => v.lang.startsWith("en"))
      setSelectedVoice(english?.name ?? voices[0]!.name)
    }
  }, [voices, selectedVoice])

  const handleImportBackup = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const payload = await file.text()
      await restoreBackup(payload)
      toast.success("Backup restored. Welcome back!")
      onComplete()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Backup restore failed"
      )
    } finally {
      event.target.value = ""
    }
  }

  const handleModeSelect = (mode: QueueMode) => {
    setSelectedMode(mode)
    setStep("channel")
  }

  const handleFinish = () => {
    updateConfig((current) => {
      const isSmallChat = selectedMode === "small-chat"
      return {
        ...current,
        twitch: {
          ...current.twitch,
          channel: channel.trim().replace(/^#/, "").toLowerCase(),
        },
        playback: {
          ...current.playback,
          queueMode: selectedMode ?? "small-chat",
          autoAssignVoices: isSmallChat,
        },
        voiceProfiles: current.voiceProfiles.map((profile, index) =>
          index === 0 && selectedVoice
            ? { ...profile, voice: selectedVoice }
            : profile
        ),
      }
    })
    toast.success("You're all set!")
    onComplete()
  }

  if (!open) return null

  const isWelcome = step === "welcome"

  return (
    <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-background duration-500 fade-in">
      {/* Decorative background - shared, but enhanced for welcome */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 size-96 animate-in rounded-full bg-primary/6 blur-3xl duration-1000 zoom-in-50 fade-in" />
        <div className="absolute -bottom-24 -left-24 size-72 animate-in rounded-full bg-primary/4 blur-3xl delay-200 duration-1000 fill-mode-backwards zoom-in-50 fade-in" />
        {isWelcome && (
          <>
            <div className="absolute top-1/2 left-1/2 size-150 -translate-x-1/2 -translate-y-1/2 animate-in rounded-full bg-primary/3 blur-[120px] duration-1500 fade-in" />
            <div className="absolute top-1/4 right-1/4 size-48 animate-in rounded-full bg-chart-2/5 blur-3xl delay-300 duration-1000 fill-mode-backwards fade-in" />
          </>
        )}
      </div>

      <div
        className={`relative flex w-full flex-col items-center px-6 ${isWelcome ? "max-w-lg" : "max-w-md"}`}
      >
        {/* Welcome splash - lives outside the card */}
        {isWelcome && <WelcomeStep onContinue={() => setStep("voices")} />}

        {/* Setup flow - card with progress bar */}
        {!isWelcome && (
          <SetupPhase>
            {/* Step progress */}
            <div className="mb-8 flex w-full max-w-xs gap-2 self-center">
              {TRACKED_STEPS.map((s, i) => {
                const currentIndex = TRACKED_STEPS.indexOf(step)
                return (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                      i <= currentIndex ? "bg-primary" : "bg-border"
                    }`}
                  />
                )
              })}
            </div>

            {/* Card */}
            <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-lg ring-1 ring-foreground/3">
              <StepTransition stepKey={step}>
                {step === "voices" && (
                  <VoicesStep
                    hasVoices={hasVoices}
                    loading={voicesLoading}
                    voiceCount={voices.length}
                    onContinue={() => setStep("mode")}
                  />
                )}

                {step === "mode" && (
                  <ModeStep
                    selectedMode={selectedMode}
                    onSelectMode={handleModeSelect}
                    onImportClick={() => fileInputRef.current?.click()}
                  />
                )}

                {step === "channel" && (
                  <ChannelStep
                    channel={channel}
                    onChannelChange={setChannel}
                    selectedVoice={selectedVoice}
                    onVoiceChange={setSelectedVoice}
                    voices={voices}
                    voicesLoading={voicesLoading}
                    onFinish={handleFinish}
                    onBack={() => setStep("mode")}
                  />
                )}
              </StepTransition>
            </div>
          </SetupPhase>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportBackup}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Setup phase entrance - animates in when welcome step transitions out
// ---------------------------------------------------------------------------

function SetupPhase({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full animate-in flex-col items-center duration-500 fade-in slide-in-from-bottom-4">
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step transition wrapper
// ---------------------------------------------------------------------------

function StepTransition({
  stepKey,
  children,
}: {
  stepKey: string
  children: React.ReactNode
}) {
  const [displayChildren, setDisplayChildren] = React.useState(children)
  const [animating, setAnimating] = React.useState(false)
  const prevKeyRef = React.useRef(stepKey)

  React.useEffect(() => {
    if (stepKey !== prevKeyRef.current) {
      prevKeyRef.current = stepKey
      setAnimating(true)

      // Short delay for the fade-out, then swap content and fade-in
      const timer = setTimeout(() => {
        setDisplayChildren(children)
        setAnimating(false)
      }, 150)

      return () => clearTimeout(timer)
    } else {
      setDisplayChildren(children)
    }
  }, [stepKey, children])

  return (
    <div
      className={`transition-all duration-200 ${
        animating ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      {displayChildren}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Welcome (splash - no progress bar)
// ---------------------------------------------------------------------------

function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex w-full max-w-lg flex-col items-center">
      {/* Hero mark */}
      <div className="relative animate-in duration-700 zoom-in-50 fade-in">
        <div className="absolute -inset-4 rounded-full bg-primary/8 blur-2xl" />
        <div className="absolute -inset-1 rounded-full bg-primary/5 blur-md" />
        <img
          src={iconSrc}
          alt=""
          className="relative size-20 drop-shadow-xl dark:brightness-150 dark:contrast-75 dark:invert dark:saturate-0"
        />
      </div>

      {/* Title lockup */}
      <div className="mt-8 flex animate-in flex-col items-center delay-200 duration-600 fill-mode-backwards fade-in slide-in-from-bottom-3">
        <img src={logoSrc} alt="Chatvoice" className="h-9 dark:invert" />
        <p className="mt-3 text-center text-[15px] leading-relaxed text-muted-foreground">
          Give every chatter in your Twitch stream their own voice.
        </p>
      </div>

      {/* Feature grid */}
      <div className="mt-10 grid w-full animate-in grid-cols-3 gap-3 delay-400 duration-600 fill-mode-backwards fade-in slide-in-from-bottom-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.label}
            className="flex flex-col items-center gap-2.5 rounded-xl border border-border/50 bg-card/50 px-3 py-4 text-center"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <feature.icon className="size-4.5 text-primary" />
            </div>
            <span className="text-xs leading-snug font-medium text-muted-foreground">
              {feature.label}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Button
        className="mt-10 w-full max-w-xs animate-in delay-600 duration-500 fill-mode-backwards fade-in slide-in-from-bottom-2"
        size="lg"
        onClick={onContinue}
      >
        Get started
        <ArrowRightIcon className="size-4" />
      </Button>

      <p className="mt-2 animate-in text-xs text-muted-foreground/60 delay-700 duration-500 fill-mode-backwards fade-in">
        No account required, all data is stored in your browser.
      </p>
    </div>
  )
}

const FEATURES = [
  {
    icon: UsersIcon,
    label: "Chats of Any Size",
  },
  {
    icon: SparklesIcon,
    label: "Give Unique Voices",
  },
  {
    icon: SettingsIcon,
    label: "Easily Configurable",
  },
]

// ---------------------------------------------------------------------------
// Step 2: Browser voice check
// ---------------------------------------------------------------------------

function VoicesStep({
  hasVoices,
  loading,
  voiceCount,
  onContinue,
}: {
  hasVoices: boolean
  loading: boolean
  voiceCount: number
  onContinue: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Voice check</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chatvoice uses your browser's speech synthesis to read messages aloud.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          <span className="text-sm text-muted-foreground">
            Checking for voices…
          </span>
        </div>
      ) : hasVoices ? (
        <div className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-green-500" />
          <div>
            <div className="text-sm font-medium">
              {voiceCount} voice{voiceCount !== 1 ? "s" : ""} detected
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your browser has speech synthesis voices available. You're good to
              go!
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div>
            <div className="text-sm font-medium">No voices found</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your browser doesn't seem to provide any voices. For the best
              experience, try using <strong>Microsoft Edge</strong> or{" "}
              <strong>Google Chrome</strong>. You can still continue, but speech
              might not work, or will be limited to your operating system's
              default voice.
            </p>
          </div>
        </div>
      )}

      <Button className="w-full" onClick={onContinue} disabled={loading}>
        Continue
        <ArrowRightIcon className="size-4" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Queue mode / import
// ---------------------------------------------------------------------------

const MODE_OPTIONS: {
  value: QueueMode
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    value: "small-chat",
    label: "Small chat",
    description:
      "Queue messages as they arrive. Best for smaller, slower chats where you want every message read.",
    icon: User,
  },
  {
    value: "big-chat",
    label: "Big chat",
    description:
      "Speak one message at a time, then skip to the newest. Best for larger, faster chats.",
    icon: Users,
  },
]

function ModeStep({
  selectedMode,
  onSelectMode,
  onImportClick,
}: {
  selectedMode: QueueMode | null
  onSelectMode: (mode: QueueMode) => void
  onImportClick: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Pick your mode</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how chat messages should be queued for speech.
        </p>
      </div>

      <div className="grid gap-2">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelectMode(option.value)}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
              selectedMode === option.value
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-muted"
            }`}
          >
            <div
              className={`mt-0.5 rounded-md border p-1.5 ${
                selectedMode === option.value
                  ? "border-primary/30 bg-primary/10"
                  : "border-border bg-muted/40"
              }`}
            >
              <option.icon
                className={`size-4 ${
                  selectedMode === option.value
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              />
            </div>
            <div className="min-w-0">
              <div
                className={`text-sm ${
                  selectedMode === option.value
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {option.label}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {option.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={onImportClick}>
        <CloudUploadIcon className="size-4" />
        Restore from backup
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Channel & default voice
// ---------------------------------------------------------------------------

function ChannelStep({
  channel,
  onChannelChange,
  selectedVoice,
  onVoiceChange,
  voices,
  voicesLoading,
  onFinish,
  onBack,
}: {
  channel: string
  onChannelChange: (value: string) => void
  selectedVoice: string
  onVoiceChange: (value: string) => void
  voices: { name: string; label: string; lang: string }[]
  voicesLoading: boolean
  onFinish: () => void
  onBack: () => void
}) {
  const sortedVoices = React.useMemo(
    () => [...voices].sort((a, b) => a.label.localeCompare(b.label)),
    [voices]
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Almost there</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a Twitch channel to listen to and a default voice.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-1.5">
          <Label className="text-sm">Twitch channel</Label>
          <Input
            placeholder="Channel name"
            value={channel}
            onChange={(e) => onChannelChange(e.target.value)}
          />
        </div>

        {voices.length > 0 && (
          <div className="grid gap-1.5">
            <Label className="text-sm">Default voice</Label>
            <Select
              value={selectedVoice}
              onValueChange={onVoiceChange}
              disabled={voicesLoading}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="max-w-(--radix-select-trigger-width)"
              >
                {sortedVoices.map((voice) => (
                  <SelectItem key={voice.name} value={voice.name}>
                    {voice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              You can add more voice profiles later in settings.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleFinishClick}>
          Finish setup
        </Button>
      </div>
    </div>
  )

  function handleFinishClick() {
    const trimmed = channel.trim()
    if (!trimmed) {
      toast.error("Please enter a Twitch channel name.")
      return
    }
    onFinish()
  }
}
