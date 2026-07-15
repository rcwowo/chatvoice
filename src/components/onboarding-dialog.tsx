import * as React from "react"
import {
  ArrowRightIcon,
  AudioLinesIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CloudUploadIcon,
  User,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import type { QueueMode } from "@/lib/chatvoice-config"
import {
  getBrowserSupportCopy,
  getBrowserSupportTier,
  type BrowserSupportTier,
} from "@/lib/browser-support"
import logoSrc from "/branding/logo.png"
import { useChatvoiceSettings } from "@/lib/chatvoice-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SettingsField } from "@/components/settings/settings-primitives"

type OnboardingStep = "voices" | "mode" | "channel"

const TRACKED_STEPS: OnboardingStep[] = ["voices", "mode", "channel"]

const STEP_META: Record<
  OnboardingStep,
  { title: string; description: string }
> = {
  voices: {
    title: "Voice check",
    description:
      "Chatvoice uses your browser's speech synthesis to read messages aloud.",
  },
  mode: {
    title: "Queue mode",
    description: "Choose how chat messages should be queued for speech.",
  },
  channel: {
    title: "Channel setup",
    description: "Choose a Twitch channel to listen to and a default voice.",
  },
}

export function OnboardingDialog({
  open,
  onComplete,
}: {
  open: boolean
  onComplete: () => void
}) {
  const { updateConfig, restoreBackup, voices, voicesLoading } =
    useChatvoiceSettings()

  const [step, setStep] = React.useState<OnboardingStep>("voices")
  const [selectedMode, setSelectedMode] = React.useState<QueueMode | null>(null)
  const [channel, setChannel] = React.useState("")
  const [selectedVoice, setSelectedVoice] = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const supportTier = getBrowserSupportTier(voicesLoading, voices.length)

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
          savedChannels: [
            ...new Set([
              ...(current.twitch.savedChannels ?? []),
              channel.trim().replace(/^#/, "").toLowerCase(),
            ]),
          ],
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

  const meta = STEP_META[step]

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center border-b border-border bg-background px-4">
        <img src={logoSrc} alt="Chatvoice" className="h-6 w-auto dark:invert" />
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4 sm:p-6">
        <div className="flex w-full max-w-md animate-in flex-col duration-500 fade-in slide-in-from-bottom-3">
          <div className="mb-6 flex w-full gap-2">
            {TRACKED_STEPS.map((s, i) => {
              const currentIndex = TRACKED_STEPS.indexOf(step)
              return (
                <div
                  key={s}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-500",
                    i <= currentIndex ? "bg-primary" : "bg-border"
                  )}
                />
              )
            })}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-foreground/5">
            <div className="border-b border-border bg-muted/30 px-5 py-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Setup
              </p>
              <h2 className="mt-1 text-base font-semibold tracking-tight">
                {meta.title}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {meta.description}
              </p>
            </div>

            <div className="p-5">
              <StepTransition stepKey={step}>
                {step === "voices" && (
                  <VoicesStep
                    tier={supportTier}
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
          </div>
        </div>
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
      className={cn(
        "transition-all duration-200",
        animating ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
      )}
    >
      {displayChildren}
    </div>
  )
}

const TIER_STYLES: Record<
  Exclude<BrowserSupportTier, "loading">,
  { shell: string; icon: string; Icon: typeof CircleCheckIcon }
> = {
  ready: {
    shell: "border-emerald-500/30 bg-emerald-500/5",
    icon: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Icon: CircleCheckIcon,
  },
  limited: {
    shell: "border-amber-500/30 bg-amber-500/5",
    icon: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Icon: AudioLinesIcon,
  },
  unsupported: {
    shell: "border-rose-500/30 bg-rose-500/5",
    icon: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    Icon: CircleAlertIcon,
  },
}

function VoicesStep({
  tier,
  voiceCount,
  onContinue,
}: {
  tier: BrowserSupportTier
  voiceCount: number
  onContinue: () => void
}) {
  return (
    <div className="space-y-5">
      {tier === "loading" ? (
        <div
          className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
          role="status"
          aria-live="polite"
          aria-busy
        >
          <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          <span className="text-sm text-muted-foreground">
            Checking for voices…
          </span>
        </div>
      ) : (
        <SupportStatusBanner
          tier={tier}
          {...getBrowserSupportCopy(tier, voiceCount)}
        />
      )}

      <Button className="w-full" onClick={onContinue} disabled={tier === "loading"}>
        Continue
        <ArrowRightIcon className="size-4" />
      </Button>
    </div>
  )
}

function SupportStatusBanner({
  tier,
  title,
  body,
}: {
  tier: Exclude<BrowserSupportTier, "loading">
  title: string
  body: string
}) {
  const { shell, icon, Icon } = TIER_STYLES[tier]

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2.5",
        shell
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
          icon
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{body}</p>
      </div>
    </div>
  )
}

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
      "Queue messages as they arrive, up to the queue limit. Best for smaller, slower chats.",
    icon: User,
  },
  {
    value: "big-chat",
    label: "Big chat",
    description:
      "Speak one message at a time, then skip ahead to the newest message. Best for larger, faster chats.",
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
      <div className="grid gap-2">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelectMode(option.value)}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
              selectedMode === option.value
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-muted"
            )}
          >
            <div
              className={cn(
                "mt-0.5 rounded-md border p-1.5",
                selectedMode === option.value
                  ? "border-primary/30 bg-primary/10"
                  : "border-border bg-muted/40"
              )}
            >
              <option.icon
                className={cn(
                  "size-3.5",
                  selectedMode === option.value
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              />
            </div>
            <div className="min-w-0">
              <div
                className={cn(
                  "text-sm",
                  selectedMode === option.value
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
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

  function handleFinishClick() {
    const trimmed = channel.trim()
    if (!trimmed) {
      toast.error("Please enter a Twitch channel name.")
      return
    }
    onFinish()
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <SettingsField label="Twitch channel">
          <Input
            placeholder="Channel name"
            value={channel}
            onChange={(e) => onChannelChange(e.target.value)}
          />
        </SettingsField>

        {voices.length > 0 && (
          <SettingsField label="Default voice">
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
          </SettingsField>
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
}
