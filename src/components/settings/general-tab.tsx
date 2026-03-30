import {
  ExternalLinkIcon,
  HeartIcon,
  MonitorIcon,
  MoonIcon,
  PlugIcon,
  SunIcon,
} from "lucide-react"

import logoSrc from "/logo.png"
import iconSrc from "/icon.png"
import { useChatvoice } from "@/lib/chatvoice-context"
import { useTheme } from "@/components/theme-provider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  SectionHeading,
  SettingsField,
  SettingsToggle,
} from "@/components/settings/settings-primitives"

const version: string = __APP_VERSION__

export function GeneralTab() {
  const { config, updateConfig } = useChatvoice()

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
                href="https://streamelements.com/rcwowo/tip"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <HeartIcon className="size-3" />
                Support the project
              </a>
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

      <SectionHeading title="Appearance" />
      <ThemeSwitcher />

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
