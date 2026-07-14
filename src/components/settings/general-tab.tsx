import * as React from "react"
import {
  ExternalLinkIcon,
  HeartIcon,
  MonitorIcon,
  MoonIcon,
  PlugIcon,
  SparklesIcon,
  SunIcon,
  User,
  Users,
} from "lucide-react"

import type {
  MessageTimestampFormat,
  QueueMode,
} from "@/lib/chatvoice-config"
import logoSrc from "/logo.png"
import iconSrc from "/icon.png"
import { useChatvoiceSettings } from "@/lib/chatvoice-context"
import { useTheme } from "@/components/theme-provider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  SectionHeading,
  SettingsField,
  SettingsRange,
  SettingsToggle,
} from "@/components/settings/settings-primitives"
import { ChangelogDialog } from "@/components/changelog-dialog"

const version: string = __APP_VERSION__

export function GeneralTab() {
  const { config, updateConfig } = useChatvoiceSettings()
  const [changelogOpen, setChangelogOpen] = React.useState(false)

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative -mx-6 -mt-12 overflow-hidden px-6 pt-8 pb-6">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-primary/6 via-primary/3 to-transparent" />
        <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-primary/4 blur-3xl" />

        <div className="relative flex items-start gap-5">
          {/* Icon */}
          <img
            src={iconSrc}
            alt=""
            className="size-14 shrink-0 drop-shadow-md dark:brightness-150 dark:contrast-75 dark:invert dark:saturate-0"
          />

          <div className="min-w-0 flex-1">
            {/* Logo */}
            <img src={logoSrc} alt="Chatvoice" className="h-6 dark:invert" />
            <p className="text-xs text-muted-foreground mt-1">Version {version}</p>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
              Let your chat have a voice! Read Twitch chat messages aloud using your
              browser's built-in speech synthesis capabilities.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://patreon.com/rcwowo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <HeartIcon className="size-3" />
                Support the project
              </a>
              <button
                type="button"
                onClick={() => setChangelogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-foreground/5 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors cursor-pointer hover:bg-foreground/10 hover:text-foreground"
              >
                <SparklesIcon className="size-3" />
                What's new
              </button>
              <a
                href="https://bsky.app/profile/rcw.lol"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-foreground/5 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/1 hover:text-foreground"
              >
                <ExternalLinkIcon className="size-3" />
                Bluesky
              </a>
            </div>
          </div>
        </div>
      </div>

      <SectionHeading
        title="Appearance"
        description="Theme and how live chat is displayed."
      />
      <ThemeSwitcher />
      <div className="space-y-4">
        <SettingsRange
          label="Max messages"
          value={config.playback.maxDisplayedMessages}
          onChange={(value) =>
            updateConfig((current) => ({
              ...current,
              playback: {
                ...current.playback,
                maxDisplayedMessages: value,
              },
            }))
          }
          min={50}
          max={500}
        />
        <SettingsRange
          label="Chat scale"
          value={config.playback.chatScale}
          onChange={(value) =>
            updateConfig((current) => ({
              ...current,
              playback: {
                ...current.playback,
                chatScale: value,
              },
            }))
          }
          min={75}
          max={200}
          formatValue={(value) => `${value}%`}
        />
      </div>

      <SectionHeading
        title="Message timestamp format"
        description="Choose how timestamps should appear in the chat preview."
      />
      <TimestampFormatSwitcher
        value={config.playback.messageTimestampFormat}
        onChange={(format) =>
          updateConfig((current) => ({
            ...current,
            playback: {
              ...current.playback,
              messageTimestampFormat: format,
            },
          }))
        }
      />

      <Separator />

      <SectionHeading
        title="Queue mode"
        description="Choose how chat messages are queued for speech."
      />
      <QueueModeSwitcher
        value={config.playback.queueMode}
        onChange={(mode) =>
          updateConfig((current) => ({
            ...current,
            playback: { ...current.playback, queueMode: mode },
          }))
        }
      />

      <Separator />

      <SectionHeading
        title="Speech template"
        description="Control how final spoken text is assembled before it is sent to the browser speech engine."
      />
      <div className="space-y-4">
        <SettingsField label="Template">
          <Textarea
            rows={3}
            value={config.playback.textTemplate}
            onChange={(event) =>
              updateConfig((current) => ({
                ...current,
                playback: {
                  ...current.playback,
                  textTemplate: event.target.value,
                },
              }))
            }
          />
        </SettingsField>
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <div className="mb-2 text-xs font-medium text-muted-foreground uppercase">
            Available tokens
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{`{displayName}`}</Badge>
            <Badge variant="outline">{`{user}`}</Badge>
            <Badge variant="outline">{`{channel}`}</Badge>
            <Badge variant="outline">{`{message}`}</Badge>
          </div>
        </div>
      </div>

      <Separator />

      <SectionHeading title="Connection" />
      <div className="space-y-3">
        <SettingsToggle
          icon={PlugIcon}
          title="Auto-connect on startup"
          description="Automatically reconnect to the last channel when the app opens."
          checked={config.twitch.autoConnect}
          onCheckedChange={(checked) =>
            updateConfig((current) => ({
              ...current,
              twitch: { ...current.twitch, autoConnect: checked },
            }))
          }
        />
      </div>
      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </div>
  )
}

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  const options: {
    value: "light" | "dark" | "system"
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    { value: "light", label: "Light", icon: SunIcon },
    { value: "dark", label: "Dark", icon: MoonIcon },
    { value: "system", label: "System", icon: MonitorIcon },
  ]

  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setTheme(option.value)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            theme === option.value
              ? "border-primary bg-primary/10 font-medium text-foreground"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <option.icon className="size-4" />
          {option.label}
        </button>
      ))}
    </div>
  )
}

const QUEUE_MODE_OPTIONS: {
  value: QueueMode
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    value: "small-chat",
    label: "Small chat",
    description: "Queue messages as they arrive, up to the queue limit. Best for smaller, slower chats.",
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

const MESSAGE_TIMESTAMP_FORMAT_OPTIONS: {
  value: MessageTimestampFormat
  preview: string
}[] = [
  {
    value: "24-hour",
    preview: "21:37",
  },
  {
    value: "12-hour",
    preview: "9:37",
  },
  {
    value: "12-hour-meridiem",
    preview: "9:37 PM",
  },
  {
    value: "none",
    preview: "None",
  },
]

function TimestampFormatSwitcher({
  value,
  onChange,
}: {
  value: MessageTimestampFormat
  onChange: (format: MessageTimestampFormat) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MESSAGE_TIMESTAMP_FORMAT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            value === option.value
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span className="font-mono text-xs sm:text-sm">{option.preview}</span>
        </button>
      ))}
    </div>
  )
}

function QueueModeSwitcher({
  value,
  onChange,
}: {
  value: QueueMode
  onChange: (mode: QueueMode) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {QUEUE_MODE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
            value === option.value
              ? "border-primary bg-primary/10"
              : "border-border hover:bg-muted"
          }`}
        >
          <div
            className={`mt-0.5 rounded-md border p-1.5 ${
              value === option.value
                ? "border-primary/30 bg-primary/10"
                : "border-border bg-muted/40"
            }`}
          >
            <option.icon
              className={`size-3.5 ${
                value === option.value
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            />
          </div>
          <div>
            <div
              className={`text-sm ${
                value === option.value
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {option.label}
            </div>
            <div className="text-xs text-muted-foreground">
              {option.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
