import * as React from "react"
import {
  ExternalLinkIcon,
  HeartIcon,
  MonitorIcon,
  MoonIcon,
  PlugIcon,
  ShuffleIcon,
  SparklesIcon,
  SunIcon,
  User,
  Users,
} from "lucide-react"

import type { MessageTimestampFormat, QueueMode } from "@/lib/chatvoice-config"
import logoSrc from "/branding/logo.png"
import iconSrc from "/branding/icon.png"
import { useChatvoiceSettings } from "@/lib/chatvoice-context"
import { useTheme } from "@/components/theme-provider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SectionHeading,
  SettingsChoice,
  SettingsField,
  SettingsGroup,
  SettingsRange,
  SettingsToggle,
} from "@/components/settings/settings-primitives"
import type { SettingsChoiceOption } from "@/components/settings/settings-primitives"
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
            <p className="mt-1 text-xs text-muted-foreground">
              Version {version}
            </p>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
              Let your chat have a voice! Read Twitch chat messages aloud using
              your browser's built-in speech synthesis capabilities.
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
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-foreground/5 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
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

      <div className="space-y-8">
        <SettingsGroup
          title="Appearance"
          description="Theme and how live chat is displayed."
        >
          <div className="space-y-3">
            <SectionHeading title="Theme" />
            <ThemeSwitcher />
          </div>

          <div className="space-y-3">
            <SectionHeading title="Chat display" />
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
          </div>

          <div className="space-y-3">
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
          </div>
        </SettingsGroup>

        <Separator />

        <SettingsGroup
          title="Speech"
          description="How messages are queued and spoken."
        >
          <div className="space-y-3">
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
          </div>

          <div className="space-y-3">
            <SectionHeading
              title="Message limits"
              description="Keep the queue stable with message and queue size caps."
            />
            <div className="space-y-4">
              <SettingsRange
                label="Minimum message length"
                value={config.playback.minMessageLength}
                onChange={(value) =>
                  updateConfig((current) => ({
                    ...current,
                    playback: { ...current.playback, minMessageLength: value },
                  }))
                }
                min={0}
                max={50}
              />
              <SettingsRange
                label="Maximum message length"
                value={config.playback.maxMessageLength}
                onChange={(value) =>
                  updateConfig((current) => ({
                    ...current,
                    playback: { ...current.playback, maxMessageLength: value },
                  }))
                }
                min={20}
                max={300}
              />
              <SettingsRange
                label="Queue size cap"
                value={config.playback.maxQueueSize}
                onChange={(value) =>
                  updateConfig((current) => ({
                    ...current,
                    playback: { ...current.playback, maxQueueSize: value },
                  }))
                }
                min={1}
                max={25}
              />
            </div>
          </div>

          <div className="space-y-3">
            <SectionHeading
              title="Voice assignment"
              description="Control how voices are given to new chatters."
            />
            <SettingsToggle
              icon={ShuffleIcon}
              title="Auto-assign voices"
              description="Randomly assign and save a voice for each new chatter. When off, unassigned chatters use the default voice below without saving."
              checked={config.playback.autoAssignVoices}
              onCheckedChange={(checked) =>
                updateConfig((current) => ({
                  ...current,
                  playback: { ...current.playback, autoAssignVoices: checked },
                }))
              }
            />
            {!config.playback.autoAssignVoices && (
              <SettingsField label="Default voice for unassigned chatters">
                <Select
                  value={config.playback.defaultVoiceProfileId || "__random__"}
                  onValueChange={(value) =>
                    updateConfig((current) => ({
                      ...current,
                      playback: {
                        ...current.playback,
                        defaultVoiceProfileId:
                          value === "__random__" ? "" : value,
                      },
                    }))
                  }
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Random (from enabled)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__random__">
                      Random (from enabled)
                    </SelectItem>
                    {config.voiceProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsField>
            )}
          </div>

          <div className="space-y-3">
            <SectionHeading
              title="Speech template"
              description="Control how final spoken text is assembled before it is sent to the browser speech engine."
            />
            <div className="space-y-2">
              <Textarea
                rows={3}
                aria-label="Speech template"
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
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="mr-0.5">Available tokens</span>
                <Badge variant="outline">{`{displayName}`}</Badge>
                <Badge variant="outline">{`{user}`}</Badge>
                <Badge variant="outline">{`{channel}`}</Badge>
                <Badge variant="outline">{`{message}`}</Badge>
              </div>
            </div>
          </div>
        </SettingsGroup>

        <Separator />

        <SettingsGroup
          title="Connection"
          description="How Chatvoice connects to Twitch."
        >
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
        </SettingsGroup>

        <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
      </div>
    </div>
  )
}

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  const options: SettingsChoiceOption<"light" | "dark" | "system">[] = [
    { value: "light", label: "Light", icon: SunIcon },
    { value: "dark", label: "Dark", icon: MoonIcon },
    { value: "system", label: "System", icon: MonitorIcon },
  ]

  return <SettingsChoice value={theme} onChange={setTheme} options={options} />
}

const QUEUE_MODE_OPTIONS: SettingsChoiceOption<QueueMode>[] = [
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

const MESSAGE_TIMESTAMP_FORMAT_OPTIONS: SettingsChoiceOption<MessageTimestampFormat>[] =
  [
    {
      value: "24-hour",
      label: "24-hour",
      preview: "21:37",
    },
    {
      value: "12-hour",
      label: "12-hour",
      preview: "9:37",
    },
    {
      value: "12-hour-meridiem",
      label: "12-hour with AM/PM",
      preview: "9:37 PM",
    },
    {
      value: "none",
      label: "None",
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
    <SettingsChoice
      value={value}
      onChange={onChange}
      options={MESSAGE_TIMESTAMP_FORMAT_OPTIONS}
    />
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
    <SettingsChoice
      variant="card"
      value={value}
      onChange={onChange}
      options={QUEUE_MODE_OPTIONS}
    />
  )
}
