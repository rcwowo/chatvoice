import { useChatvoice, parseLines } from "@/lib/chatvoice-context"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckboxRow,
  Field,
  RangeField,
} from "@/components/dashboard-primitives"

export function ModerationPage() {
  const { config, updateConfig } = useChatvoice()

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Message rules</CardTitle>
            <CardDescription>
              Decide which chat messages are allowed into the queue before
              synthesis happens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <CheckboxRow
                title="Ignore command-style messages"
                description="Skips messages starting with ! or /."
                checked={config.playback.ignoreCommands}
                onCheckedChange={(checked) =>
                  updateConfig((current) => ({
                    ...current,
                    playback: {
                      ...current.playback,
                      ignoreCommands: checked,
                    },
                  }))
                }
              />
              <CheckboxRow
                title="Skip common bots"
                description="Filters usernames that end with bot."
                checked={config.playback.skipBots}
                onCheckedChange={(checked) =>
                  updateConfig((current) => ({
                    ...current,
                    playback: { ...current.playback, skipBots: checked },
                  }))
                }
              />
              <CheckboxRow
                title="Skip broadcaster messages"
                description="Useful when the broadcaster already narrates themselves."
                checked={config.playback.skipBroadcaster}
                onCheckedChange={(checked) =>
                  updateConfig((current) => ({
                    ...current,
                    playback: {
                      ...current.playback,
                      skipBroadcaster: checked,
                    },
                  }))
                }
              />
              <CheckboxRow
                title="Skip moderator messages"
                description="Prevents mod actions and helper replies from being spoken."
                checked={config.playback.skipModerators}
                onCheckedChange={(checked) =>
                  updateConfig((current) => ({
                    ...current,
                    playback: {
                      ...current.playback,
                      skipModerators: checked,
                    },
                  }))
                }
              />
              <CheckboxRow
                title="Skip subscriber messages"
                description="Optional if you want the queue focused on non-subscriber chatters."
                checked={config.playback.skipSubscribers}
                onCheckedChange={(checked) =>
                  updateConfig((current) => ({
                    ...current,
                    playback: {
                      ...current.playback,
                      skipSubscribers: checked,
                    },
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limits and blocklists</CardTitle>
            <CardDescription>
              Keep the queue stable with length caps, queue depth limits, and
              local-only filters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <RangeField
              label="Minimum message length"
              value={config.playback.minMessageLength}
              onChange={(value) =>
                updateConfig((current) => ({
                  ...current,
                  playback: {
                    ...current.playback,
                    minMessageLength: value,
                  },
                }))
              }
              min={0}
              max={50}
            />
            <RangeField
              label="Maximum message length"
              value={config.playback.maxMessageLength}
              onChange={(value) =>
                updateConfig((current) => ({
                  ...current,
                  playback: {
                    ...current.playback,
                    maxMessageLength: value,
                  },
                }))
              }
              min={20}
              max={300}
            />
            <RangeField
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
            <Field label="Blocked usernames (one per line)">
              <Textarea
                rows={5}
                value={config.playback.blockedUsers.join("\n")}
                onChange={(event) =>
                  updateConfig((current) => ({
                    ...current,
                    playback: {
                      ...current.playback,
                      blockedUsers: parseLines(event.target.value),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Blocked terms (one per line)">
              <Textarea
                rows={5}
                value={config.playback.blockedTerms.join("\n")}
                onChange={(event) =>
                  updateConfig((current) => ({
                    ...current,
                    playback: {
                      ...current.playback,
                      blockedTerms: parseLines(event.target.value),
                    },
                  }))
                }
              />
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
