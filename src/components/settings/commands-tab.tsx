import * as React from "react"
import {
  BotIcon,
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
import {
  buildCommandsShareMessage,
  buildCommandsShareUrl,
  COMMAND_CATALOG,
  COMMAND_SHARE_ORDER,
  type CommandShareId,
} from "@/lib/command-share"
import { ShareCommandsDialog } from "@/components/settings/share-commands-dialog"
import { Button } from "@/components/ui/button"
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

const COMMAND_ICONS: Record<
  CommandShareId,
  React.ComponentType<{ className?: string }>
> = {
  queue: PowerIcon,
  playback: PauseIcon,
  skip: SkipForwardIcon,
  clear: ListXIcon,
  newVoice: ShuffleIcon,
}

export function CommandsTab() {
  const { config, updateConfig } = useChatvoiceSettings()
  const [shareOpen, setShareOpen] = React.useState(false)
  const [whitelistText, setWhitelistText] = React.useState(
    config.commands.whitelist.join("\n")
  )
  const shareUrl = buildCommandsShareUrl(
    config.commands,
    window.location.origin
  )
  const shareMessage = buildCommandsShareMessage(config.commands)

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

      <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <BotIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              Add these commands to your chatbot
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Share a public commands page with your chat so viewers can see
              what&apos;s enabled and what each command does.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => setShareOpen(true)}
        >
          Share commands
        </Button>
      </div>

      <div className="space-y-2">
        {COMMAND_SHARE_ORDER.map((id) => {
          const catalog = COMMAND_CATALOG[id]
          const setting = config.commands[id]
          return (
            <CommandRow
              key={id}
              command={catalog.command}
              description={catalog.description}
              icon={COMMAND_ICONS[id]}
              setting={setting}
              onEnabledChange={(enabled) => updateCommand(id, { enabled })}
              onMinRoleChange={(minRole) => updateCommand(id, { minRole })}
            />
          )
        })}
      </div>

      <ShareCommandsDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareMessage={shareMessage}
        shareUrl={shareUrl}
      />

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
