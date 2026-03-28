import * as React from "react"
import {
  CloudDownloadIcon,
  CloudUploadIcon,
  Link2OffIcon,
  Mic2Icon,
} from "lucide-react"

import { useChatvoice, DEFAULT_PREVIEW_TEXT } from "@/lib/chatvoice-context"
import {
  buildSpeechText,
  ensureVoiceAssignment,
  exportConfigBackup,
  normalizeLookupValue,
} from "@/lib/chatvoice-config"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Field, ToggleRow } from "@/components/dashboard-primitives"

export function SettingsPage() {
  const {
    config,
    updateConfig,
    restoreBackup,
    connectionState,
    startConnection,
    stopConnection,
    setPlaybackQueue,
    setStatusMessage,
  } = useChatvoice()

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [isSavingConnection, setIsSavingConnection] = React.useState(false)
  const [isGeneratingPreview, setIsGeneratingPreview] = React.useState(false)
  const [previewUserName, setPreviewUserName] = React.useState("newchatter")
  const [previewDisplayName, setPreviewDisplayName] =
    React.useState("NewChatter")
  const [previewText, setPreviewText] = React.useState(DEFAULT_PREVIEW_TEXT)

  // -----------------------------------------------------------------------
  // Connection handlers
  // -----------------------------------------------------------------------

  const handleConnect = async () => {
    setIsSavingConnection(true)
    setStatusMessage(null)

    try {
      await startConnection({
        channel: config.twitch.channel,
        clientId: config.twitch.clientId,
        accessToken: config.twitch.accessToken,
        readOnly: config.twitch.readOnly,
      })
      setStatusMessage("Chatvoice is now connected to Twitch chat.")
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Connection failed"
      )
    } finally {
      setIsSavingConnection(false)
    }
  }

  const handleDisconnect = async () => {
    await stopConnection()
    setStatusMessage("Disconnected from Twitch chat.")
  }

  // -----------------------------------------------------------------------
  // Preview handler
  // -----------------------------------------------------------------------

  const handlePreviewPlayback = async () => {
    const previewProfile =
      config.voiceProfiles.find((profile) => profile.enabled) ??
      config.voiceProfiles[0]
    if (!previewProfile) {
      setStatusMessage("Add at least one voice profile before previewing.")
      return
    }

    setIsGeneratingPreview(true)
    setStatusMessage(null)

    try {
      let nextConfig = config
      const ensured = ensureVoiceAssignment(
        nextConfig,
        previewUserName,
        previewDisplayName
      )
      nextConfig = ensured.config

      if (ensured.created) {
        updateConfig(nextConfig)
      }

      const assignment =
        ensured.assignment ??
        Object.values(nextConfig.assignments).find(
          (entry) => entry.userName === normalizeLookupValue(previewUserName)
        )

      const profile = assignment
        ? nextConfig.voiceProfiles.find(
            (item) => item.id === assignment.voiceProfileId
          )
        : previewProfile

      if (!profile) {
        throw new Error("No saved voice is available for preview playback")
      }

      setPlaybackQueue((current) => [
        {
          id: `preview-${Date.now()}`,
          assignment: assignment ?? {
            userName: normalizeLookupValue(previewUserName),
            displayName: previewDisplayName,
            voiceProfileId: profile.id,
            createdAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
          },
          profile,
          text: buildSpeechText(
            config.playback.textTemplate,
            previewText,
            previewUserName,
            previewDisplayName,
            config.twitch.channel || "chatvoice"
          ),
          source: "preview",
        },
        ...current,
      ])

      setStatusMessage(`Queued preview using ${profile.label}.`)
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Preview failed"
      )
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  // -----------------------------------------------------------------------
  // Backup handlers
  // -----------------------------------------------------------------------

  const downloadBackup = () => {
    const backup = exportConfigBackup(config)
    const blob = new Blob([backup], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `chatvoice-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleRestoreBackup = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const payload = await file.text()
      restoreBackup(payload)
      setStatusMessage("Backup restored successfully.")
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Backup restore failed"
      )
    } finally {
      event.target.value = ""
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>
            Use anonymous chat for listening only, or add a Twitch token now so
            later dashboard features can reuse it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Channel">
            <Input
              value={config.twitch.channel}
              onChange={(event) =>
                updateConfig((current) => ({
                  ...current,
                  twitch: {
                    ...current.twitch,
                    channel: event.target.value,
                  },
                }))
              }
              placeholder="broadcastername"
            />
          </Field>
          <Field label="Client ID">
            <Input
              value={config.twitch.clientId}
              onChange={(event) =>
                updateConfig((current) => ({
                  ...current,
                  twitch: {
                    ...current.twitch,
                    clientId: event.target.value,
                  },
                }))
              }
              placeholder="Optional for anonymous listen"
            />
          </Field>
          <Field label="Access token" className="md:col-span-2">
            <Input
              type="password"
              value={config.twitch.accessToken}
              onChange={(event) =>
                updateConfig((current) => ({
                  ...current,
                  twitch: {
                    ...current.twitch,
                    accessToken: event.target.value,
                  },
                }))
              }
              placeholder="Optional for anonymous listen"
            />
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 md:col-span-2">
            <div>
              <div className="text-sm font-medium">Read-only Twitch auth</div>
              <div className="text-xs text-muted-foreground">
                Keeps the bridge in listening mode. Leave enabled unless you
                later need write scopes.
              </div>
            </div>
            <Switch
              checked={config.twitch.readOnly}
              onCheckedChange={(checked) =>
                updateConfig((current) => ({
                  ...current,
                  twitch: { ...current.twitch, readOnly: checked },
                }))
              }
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={connectionState?.connected ? "default" : "outline"}>
              {connectionState?.connected ? "Connected" : "Disconnected"}
            </Badge>
            <span>
              {connectionState?.usingAnonymousConnection
                ? "Listening anonymously"
                : "Authenticated with token"}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDisconnect}>
              Disconnect
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isSavingConnection || !config.twitch.channel.trim()}
            >
              {isSavingConnection ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Speech template + playback toggles */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Speech template</CardTitle>
            <CardDescription>
              Control how final spoken text is assembled before it is sent to
              Edge TTS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Template">
              <Textarea
                rows={4}
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
            </Field>
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <div className="font-medium">Available tokens</div>
              <div className="mt-2 flex flex-wrap gap-2 text-muted-foreground">
                <Badge variant="outline">{`{displayName}`}</Badge>
                <Badge variant="outline">{`{user}`}</Badge>
                <Badge variant="outline">{`{channel}`}</Badge>
                <Badge variant="outline">{`{message}`}</Badge>
              </div>
              <Separator className="my-3" />
              <div className="text-muted-foreground">
                Preview:{" "}
                {buildSpeechText(
                  config.playback.textTemplate,
                  previewText,
                  previewUserName,
                  previewDisplayName,
                  config.twitch.channel || "chatvoice"
                )}
              </div>
            </div>
            <div className="grid gap-3">
              <ToggleRow
                icon={Mic2Icon}
                title="Enable speech output"
                description="Pauses queue playback without disconnecting from chat."
                checked={config.playback.enabled}
                onCheckedChange={(checked) =>
                  updateConfig((current) => ({
                    ...current,
                    playback: { ...current.playback, enabled: checked },
                  }))
                }
              />
              <ToggleRow
                icon={Link2OffIcon}
                title="Strip links from speech"
                description="Removes URLs before the message is spoken."
                checked={config.playback.stripLinks}
                onCheckedChange={(checked) =>
                  updateConfig((current) => ({
                    ...current,
                    playback: {
                      ...current.playback,
                      stripLinks: checked,
                    },
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview playback */}
        <Card>
          <CardHeader>
            <CardTitle>Preview playback</CardTitle>
            <CardDescription>
              Simulate a first-time chatter and confirm that Chatvoice locks
              them to a saved random voice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Preview username">
                <Input
                  value={previewUserName}
                  onChange={(event) => setPreviewUserName(event.target.value)}
                />
              </Field>
              <Field label="Display name">
                <Input
                  value={previewDisplayName}
                  onChange={(event) =>
                    setPreviewDisplayName(event.target.value)
                  }
                />
              </Field>
            </div>
            <Field label="Preview message">
              <Textarea
                value={previewText}
                onChange={(event) => setPreviewText(event.target.value)}
                rows={5}
              />
            </Field>
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              First-time users are assigned a random saved voice profile, then
              that mapping persists in browser storage until you change it.
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              onClick={handlePreviewPlayback}
              disabled={isGeneratingPreview}
            >
              {isGeneratingPreview ? "Queueing..." : "Queue preview"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Backup */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Backups and versioning</CardTitle>
            <CardDescription>
              Export a human-readable local backup any time, then restore it
              later even after schema changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">What gets saved</div>
              <ul className="mt-3 space-y-2">
                <li>- Twitch channel and auth settings</li>
                <li>- Voice profile library</li>
                <li>- Randomized user assignments</li>
                <li>- Filters, limits, and blocklists</li>
                <li>- Schema version metadata for migrations</li>
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={downloadBackup}>
                <CloudDownloadIcon />
                Export backup
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudUploadIcon />
                Restore backup
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleRestoreBackup}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compatibility notes</CardTitle>
            <CardDescription>
              The current build already plans for version drift by migrating
              older payloads into the latest schema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="font-medium text-foreground">
                Migration strategy
              </div>
              <p className="mt-2">
                Backups wrap config data inside an envelope that includes
                `appVersion`, `schemaVersion`, and export time. The restore path
                accepts both current envelopes and older raw config objects,
                then normalizes missing fields.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="font-medium text-foreground">
                Local-only storage
              </div>
              <p className="mt-2">
                Browser `localStorage` holds the source of truth for the
                dashboard, while the local server handles Twitch connectivity
                and speech synthesis without relying on a remote database.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
