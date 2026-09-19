import * as React from "react"

import { useChatvoiceSettings, parseLines } from "@/lib/chatvoice-context"
import type { WordReplacement } from "@/lib/chatvoice-config"
import { createWordReplacement } from "@/lib/moderation"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  SectionHeading,
  SettingsCheckbox,
  SettingsField,
  SettingsRange,
} from "@/components/settings/settings-primitives"
import {
  ArrowRight,
  AtSign,
  Link2,
  Zap,
  BotMessageSquare,
  Video,
  ShieldUser,
  Star,
  Smile,
  Plus,
  Trash2,
} from "lucide-react"

export function ModerationTab() {
  const { config, updateConfig } = useChatvoiceSettings()

  const [blockedUsersText, setBlockedUsersText] = React.useState(
    config.playback.blockedUsers.join("\n")
  )
  const [blockedTermsText, setBlockedTermsText] = React.useState(
    config.playback.blockedTerms.join("\n")
  )

  const commitBlockedUsers = () => {
    updateConfig((current) => ({
      ...current,
      playback: {
        ...current.playback,
        blockedUsers: parseLines(blockedUsersText),
      },
    }))
  }
  const commitBlockedTerms = () => {
    updateConfig((current) => ({
      ...current,
      playback: {
        ...current.playback,
        blockedTerms: parseLines(blockedTermsText),
      },
    }))
  }

  const replacements = config.playback.wordReplacements

  const addReplacement = () => {
    updateConfig((current) => ({
      ...current,
      playback: {
        ...current.playback,
        wordReplacements: [
          ...current.playback.wordReplacements,
          createWordReplacement(),
        ],
      },
    }))
  }

  const updateReplacement = (id: string, patch: Partial<WordReplacement>) => {
    updateConfig((current) => ({
      ...current,
      playback: {
        ...current.playback,
        wordReplacements: current.playback.wordReplacements.map(
          (replacement) =>
            replacement.id === id ? { ...replacement, ...patch } : replacement
        ),
      },
    }))
  }

  const removeReplacement = (id: string) => {
    updateConfig((current) => ({
      ...current,
      playback: {
        ...current.playback,
        wordReplacements: current.playback.wordReplacements.filter(
          (replacement) => replacement.id !== id
        ),
      },
    }))
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Message rules"
        description="Decide which chat messages are allowed into the queue."
      />

      <div className="space-y-2">
        <SettingsCheckbox
          title="Strip links from speech"
          description="Removes URLs before the message is spoken."
          icon={Link2}
          checked={config.playback.stripLinks}
          onCheckedChange={(checked) =>
            updateConfig((current) => ({
              ...current,
              playback: { ...current.playback, stripLinks: checked },
            }))
          }
        />
        <SettingsCheckbox
          title="Strip mentions from speech"
          description="Removes @username mentions before the message is spoken."
          icon={AtSign}
          checked={config.playback.stripMentions}
          onCheckedChange={(checked) =>
            updateConfig((current) => ({
              ...current,
              playback: { ...current.playback, stripMentions: checked },
            }))
          }
        />
        <SettingsCheckbox
          title="Strip emotes from speech"
          description="Removes all emotes from messages added to the queue."
          icon={Smile}
          checked={config.playback.stripEmotes}
          onCheckedChange={(checked) =>
            updateConfig((current) => ({
              ...current,
              playback: { ...current.playback, stripEmotes: checked },
            }))
          }
        />
        <SettingsCheckbox
          title="Ignore command-style messages"
          description="Skips messages starting with ! or ?."
          icon={Zap}
          checked={config.playback.ignoreCommands}
          onCheckedChange={(checked) =>
            updateConfig((current) => ({
              ...current,
              playback: { ...current.playback, ignoreCommands: checked },
            }))
          }
        />
        <SettingsCheckbox
          title="Skip common bots"
          description="Filters usernames that end with bot."
          icon={BotMessageSquare}
          checked={config.playback.skipBots}
          onCheckedChange={(checked) =>
            updateConfig((current) => ({
              ...current,
              playback: { ...current.playback, skipBots: checked },
            }))
          }
        />
        <SettingsCheckbox
          title="Skip broadcaster messages"
          description="Useful when the broadcaster already narrates themselves."
          icon={Video}
          checked={config.playback.skipBroadcaster}
          onCheckedChange={(checked) =>
            updateConfig((current) => ({
              ...current,
              playback: { ...current.playback, skipBroadcaster: checked },
            }))
          }
        />
        <SettingsCheckbox
          title="Skip moderator messages"
          description="Prevents mod actions and helper replies from being spoken."
          icon={ShieldUser}
          checked={config.playback.skipModerators}
          onCheckedChange={(checked) =>
            updateConfig((current) => ({
              ...current,
              playback: { ...current.playback, skipModerators: checked },
            }))
          }
        />
        <SettingsCheckbox
          title="Skip non-subscriber messages"
          description="Only allow subscribers to have their messages spoken."
          icon={Star}
          checked={config.playback.skipSubscribers}
          onCheckedChange={(checked) =>
            updateConfig((current) => ({
              ...current,
              playback: { ...current.playback, skipSubscribers: checked },
            }))
          }
        />
      </div>

      <Separator />

      <div className="flex items-start justify-between gap-3">
        <SectionHeading
          title="Word replacements"
          description="Swap or remove words or phrases from spoken messages. Leave replacements empty to remove phrases."
        />
        <Button size="sm" className="shrink-0" onClick={addReplacement}>
          <Plus className="size-3.5" />
          Add rule
        </Button>
      </div>

      {replacements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          No replacements yet. Add a rule to rewrite or remove words before they
          are spoken.
        </div>
      ) : (
        <div className="space-y-2">
          {replacements.map((replacement) => (
            <ReplacementRow
              key={replacement.id}
              replacement={replacement}
              onUpdate={(patch) => updateReplacement(replacement.id, patch)}
              onRemove={() => removeReplacement(replacement.id)}
            />
          ))}
        </div>
      )}

      <Separator />

      <SectionHeading
        title="Limits and blocklists"
        description="Keep the queue stable with length caps and local-only filters."
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
        <SettingsField label="Blocked usernames (one per line)">
          <Textarea
            rows={4}
            value={blockedUsersText}
            onChange={(event) => setBlockedUsersText(event.target.value)}
            onBlur={commitBlockedUsers}
          />
        </SettingsField>
        <SettingsField label="Blocked terms (one per line)">
          <Textarea
            rows={4}
            value={blockedTermsText}
            onChange={(event) => setBlockedTermsText(event.target.value)}
            onBlur={commitBlockedTerms}
          />
        </SettingsField>
      </div>
    </div>
  )
}

function ReplacementRow({
  replacement,
  onUpdate,
  onRemove,
}: {
  replacement: WordReplacement
  onUpdate: (patch: Partial<WordReplacement>) => void
  onRemove: () => void
}) {
  const [from, setFrom] = React.useState(replacement.from)
  const [to, setTo] = React.useState(replacement.to)

  React.useEffect(() => setFrom(replacement.from), [replacement.from])
  React.useEffect(() => setTo(replacement.to), [replacement.to])

  const commitFrom = () => {
    const trimmed = from.trim()
    setFrom(trimmed)
    if (trimmed !== replacement.from) {
      onUpdate({ from: trimmed })
    }
  }

  const commitTo = () => {
    if (to !== replacement.to) {
      onUpdate({ to })
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Input
          value={from}
          placeholder="Find word or phrase"
          onChange={(event) => setFrom(event.target.value)}
          onBlur={commitFrom}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
          }}
          className="h-8 flex-1"
        />
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
        <Input
          value={to}
          placeholder="Replace with..."
          onChange={(event) => setTo(event.target.value)}
          onBlur={commitTo}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
          }}
          className="h-8 flex-1"
        />
        <Button
          variant="outline"
          size="icon-sm"
          className="shrink-0 text-destructive hover:text-destructive"
          onClick={onRemove}
          title="Delete replacement"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-2">
        <span className="text-xs text-muted-foreground">Apply this rule</span>
        <Switch
          checked={replacement.enabled}
          onCheckedChange={(enabled) => onUpdate({ enabled })}
        />
      </div>
    </div>
  )
}
