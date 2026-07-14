import * as React from "react"
import {
  InfoIcon,
  ListXIcon,
  PauseIcon,
  PowerIcon,
  ShuffleIcon,
  SkipForwardIcon,
} from "lucide-react"

import { useChatvoiceSettings, parseLines } from "@/lib/chatvoice-context"
import {
  COMMAND_ROLE_OPTIONS,
  type CommandRole,
  type CommandSetting,
  type CommandsConfig,
} from "@/lib/chatvoice-config"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
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
  SettingsField,
} from "@/components/settings/settings-primitives"

type CommandRowConfig = {
  key: keyof Omit<CommandsConfig, "whitelist">
  command: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const COMMAND_ROWS: CommandRowConfig[] = [
  {
    key: "queue",
    command: "!cv on / !cv off",
    description: "Enable or disable adding new chat messages to the queue.",
    icon: PowerIcon,
  },
  {
    key: "playback",
    command: "!cv pause / !cv play",
    description: "Pause or resume the currently speaking message.",
    icon: PauseIcon,
  },
  {
    key: "skip",
    command: "!cv skip",
    description: "Skip the message currently being spoken.",
    icon: SkipForwardIcon,
  },
  {
    key: "clear",
    command: "!cv clear",
    description: "Clear every message waiting in the queue.",
    icon: ListXIcon,
  },
  {
    key: "newVoice",
    command: "!newvoice",
    description:
      "Reassign the chatter to a random voice if they already have one saved.",
    icon: ShuffleIcon,
  },
]

export function CommandsTab() {
  const { config, updateConfig } = useChatvoiceSettings()
  const [whitelistText, setWhitelistText] = React.useState(
    config.commands.whitelist.join("\n")
  )

  const updateCommand = (
    key: keyof Omit<CommandsConfig, "whitelist">,
    patch: Partial<CommandSetting>
  ) => {
    updateConfig((current) => ({
      ...current,
      commands: {
        ...current.commands,
        [key]: { ...current.commands[key], ...patch },
      },
    }))
  }

  const commitWhitelist = () => {
    updateConfig((current) => ({
      ...current,
      commands: {
        ...current.commands,
        whitelist: parseLines(whitelistText),
      },
    }))
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Chat commands"
        description="Let chat control Chatvoice. Every command starts disabled."
      />

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
        <p>
          By default, <span className="font-medium text-foreground">!cv</span>{" "}
          commands can only be used by moderators.{" "}
          <span className="font-medium text-foreground">!newvoice</span> can be used by
          everyone when enabled. You can change the minimum role on each command below.
        </p>
      </div>

      <div className="space-y-2">
        {COMMAND_ROWS.map((row) => {
          const setting = config.commands[row.key]
          return (
            <CommandRow
              key={row.key}
              command={row.command}
              description={row.description}
              icon={row.icon}
              setting={setting}
              onEnabledChange={(enabled) => updateCommand(row.key, { enabled })}
              onMinRoleChange={(minRole) => updateCommand(row.key, { minRole })}
            />
          )
        })}
      </div>

      <Separator />

      <SectionHeading
        title="Permission whitelist"
        description="These usernames can run any enabled command, regardless of role."
      />

      <SettingsField label="Whitelisted usernames (one per line)">
        <Textarea
          rows={4}
          value={whitelistText}
          onChange={(event) => setWhitelistText(event.target.value)}
          onBlur={commitWhitelist}
          placeholder={"trustedmod\neditorname"}
        />
      </SettingsField>
    </div>
  )
}

function CommandRow({
  command,
  description,
  icon: Icon,
  setting,
  onEnabledChange,
  onMinRoleChange,
}: {
  command: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  setting: CommandSetting
  onEnabledChange: (enabled: boolean) => void
  onMinRoleChange: (minRole: CommandRole) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-md border border-border bg-muted/40 p-1.5">
            <Icon className="size-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">{command}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
        </div>
        <Switch checked={setting.enabled} onCheckedChange={onEnabledChange} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
        <span className="text-sm">Minimum role</span>
        <Select
          value={setting.minRole}
          onValueChange={(value) => onMinRoleChange(value as CommandRole)}
          disabled={!setting.enabled}
        >
          <SelectTrigger className="h-8 w-[11.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMMAND_ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
