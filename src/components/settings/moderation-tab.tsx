import * as React from "react"

import { useChatvoiceSettings, parseLines } from "@/lib/chatvoice-context"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  SectionHeading,
  SettingsCheckbox,
  SettingsField,
  SettingsRange,
} from "@/components/settings/settings-primitives"
import {
  AtSign,
  Link2,
  Zap,
  BotMessageSquare,
  Video,
  ShieldUser,
  Star,
  Smile,
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
