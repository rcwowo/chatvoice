import * as React from "react"
import {
  AudioLinesIcon,
  CloudDownloadIcon,
  CloudUploadIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  HeartIcon,
  Mic2Icon,
  MonitorIcon,
  MoonIcon,
  PlusIcon,
  ShieldIcon,
  SunIcon,
  Trash2Icon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react"

import {
  useChatvoice,
  parseLines,
  formatTimestamp,
} from "@/lib/chatvoice-context"
import {
  type VoiceProfile,
  createVoiceProfile,
  ensureVoiceAssignment,
  exportConfigBackup,
  normalizeLookupValue,
} from "@/lib/chatvoice-config"
import { useTheme } from "@/components/theme-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"

// ---------------------------------------------------------------------------
// Settings tab IDs
// ---------------------------------------------------------------------------

type SettingsTab = "general" | "voices" | "moderation" | "users" | "backup"

const SETTINGS_TABS: {
  id: SettingsTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: "general", label: "General", icon: WrenchIcon },
  { id: "voices", label: "Voices", icon: AudioLinesIcon },
  { id: "moderation", label: "Moderation", icon: ShieldIcon },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "backup", label: "Backup", icon: DatabaseIcon },
]

// ---------------------------------------------------------------------------
// Settings Dialog (exported)
// ---------------------------------------------------------------------------

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("general")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[75vw] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <nav className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/30 p-3">
            <h2 className="mb-3 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Settings
            </h2>
            <div className="flex flex-col gap-0.5">
              {SETTINGS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    activeTab === tab.id
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  }`}
                >
                  <tab.icon className="size-4 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-6">
              {activeTab === "general" && <GeneralTab />}
              {activeTab === "voices" && <VoicesTab />}
              {activeTab === "moderation" && <ModerationTab />}
              {activeTab === "users" && <UsersTab />}
              {activeTab === "backup" && <BackupTab />}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// General Tab
// ---------------------------------------------------------------------------

function GeneralTab() {
  const { config, updateConfig } = useChatvoice()

  return (
    <div className="space-y-6">
      {/* About */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <h3 className="text-base font-semibold">Chatvoice</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          A browser-based Twitch chat TTS app. Connects anonymously to any
          channel and reads messages aloud using the Web Speech API — no server,
          no accounts, fully local.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="https://github.com/chatvoice"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLinkIcon className="size-3.5" />
            GitHub
          </a>
          <a
            href="https://ko-fi.com/chatvoice"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/20"
          >
            <HeartIcon className="size-3.5" />
            Support the project
          </a>
        </div>
      </div>

      <Separator />

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

      <SectionHeading title="Playback" />
      <div className="space-y-3">
        <SettingsToggle
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
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Voices Tab
// ---------------------------------------------------------------------------

function VoicesTab() {
  const { config, updateConfig, voices, voicesLoading } = useChatvoice()

  const voiceOptions = React.useMemo(
    () =>
      voices
        .slice()
        .sort((left, right) => left.label.localeCompare(right.label)),
    [voices]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeading
          title="Voice profiles"
          description="Saved voices that are randomly assigned to chatters."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            updateConfig((current) => ({
              ...current,
              voiceProfiles: [
                ...current.voiceProfiles,
                createVoiceProfile(current.voiceProfiles.length),
              ],
            }))
          }
        >
          <PlusIcon className="size-3.5" />
          Add profile
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Voice</TableHead>
              <TableHead className="text-center">Rate</TableHead>
              <TableHead className="text-center">Pitch</TableHead>
              <TableHead className="text-center">Vol</TableHead>
              <TableHead className="text-center">Enabled</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {config.voiceProfiles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No voice profiles yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              config.voiceProfiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <Input
                      value={profile.label}
                      onChange={(e) =>
                        patchVoiceProfile(
                          profile.id,
                          { label: e.target.value },
                          updateConfig
                        )
                      }
                      className="h-7 w-28 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={profile.voice}
                      onValueChange={(value) =>
                        patchVoiceProfile(
                          profile.id,
                          { voice: value },
                          updateConfig
                        )
                      }
                    >
                      <SelectTrigger className="h-7 w-44 text-sm">
                        <SelectValue
                          placeholder={
                            voicesLoading ? "Loading..." : "Select voice"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceOptions.map((voice) => (
                          <SelectItem key={voice.name} value={voice.name}>
                            {voice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={-100}
                      max={100}
                      value={profile.rate}
                      onChange={(e) =>
                        patchVoiceProfile(
                          profile.id,
                          { rate: Number(e.target.value) || 0 },
                          updateConfig
                        )
                      }
                      className="h-7 w-16 text-center text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={-100}
                      max={100}
                      value={profile.pitch}
                      onChange={(e) =>
                        patchVoiceProfile(
                          profile.id,
                          { pitch: Number(e.target.value) || 0 },
                          updateConfig
                        )
                      }
                      className="h-7 w-16 text-center text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={-100}
                      max={100}
                      value={profile.volume}
                      onChange={(e) =>
                        patchVoiceProfile(
                          profile.id,
                          { volume: Number(e.target.value) || 0 },
                          updateConfig
                        )
                      }
                      className="h-7 w-16 text-center text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={profile.enabled}
                      onCheckedChange={(checked) =>
                        patchVoiceProfile(
                          profile.id,
                          { enabled: checked },
                          updateConfig
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        updateConfig((current) => ({
                          ...current,
                          voiceProfiles: current.voiceProfiles.filter(
                            (p) => p.id !== profile.id
                          ),
                        }))
                      }
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Random assignment only uses enabled profiles.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Moderation Tab
// ---------------------------------------------------------------------------

function ModerationTab() {
  const { config, updateConfig } = useChatvoice()

  // Use local state for blocklist textareas so typing isn't broken by parseLines
  const [blockedUsersText, setBlockedUsersText] = React.useState(
    config.playback.blockedUsers.join("\n")
  )
  const [blockedTermsText, setBlockedTermsText] = React.useState(
    config.playback.blockedTerms.join("\n")
  )

  // Sync local state back to config on blur
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
          checked={config.playback.stripLinks}
          onCheckedChange={(checked) =>
            updateConfig((current) => ({
              ...current,
              playback: { ...current.playback, stripLinks: checked },
            }))
          }
        />
        <SettingsCheckbox
          title="Ignore command-style messages"
          description="Skips messages starting with ! or /."
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

// ---------------------------------------------------------------------------
// Users Tab
// ---------------------------------------------------------------------------

function UsersTab() {
  const { config, updateConfig } = useChatvoice()
  const [newUserName, setNewUserName] = React.useState("")
  const [newDisplayName, setNewDisplayName] = React.useState("")

  const blockedSet = React.useMemo(
    () => new Set(config.playback.blockedUsers.map(normalizeLookupValue)),
    [config.playback.blockedUsers]
  )

  const assignmentRows = React.useMemo(() => {
    return Object.values(config.assignments)
      .filter((a) => !blockedSet.has(a.userName))
      .slice()
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))
  }, [config.assignments, blockedSet])

  const handleAddUser = () => {
    const userName = newUserName.trim()
    const displayName = newDisplayName.trim() || userName
    if (!userName) return

    const result = ensureVoiceAssignment(config, userName, displayName)
    if (result.created || result.assignment) {
      updateConfig(result.config)
    }
    setNewUserName("")
    setNewDisplayName("")
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Saved voice assignments"
        description="Reassign voices anytime. Mappings stay local and export with backups."
      />

      {/* Add user form */}
      <div className="flex items-end gap-2">
        <SettingsField label="Username">
          <Input
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="username"
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddUser()
            }}
          />
        </SettingsField>
        <SettingsField label="Display name (optional)">
          <Input
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            placeholder="DisplayName"
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddUser()
            }}
          />
        </SettingsField>
        <Button
          size="sm"
          onClick={handleAddUser}
          disabled={!newUserName.trim()}
          className="h-8"
        >
          <PlusIcon className="size-3.5" />
          Add user
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Saved voice</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignmentRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  Voice assignments appear here after previewing or receiving
                  chat.
                </TableCell>
              </TableRow>
            ) : (
              assignmentRows.map((assignment) => {
                const profile = config.voiceProfiles.find(
                  (vp) => vp.id === assignment.voiceProfileId
                )

                return (
                  <TableRow key={assignment.userName}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {assignment.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          @{assignment.userName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={assignment.voiceProfileId}
                        onValueChange={(value) =>
                          updateConfig((current) => ({
                            ...current,
                            assignments: {
                              ...current.assignments,
                              [assignment.userName]: {
                                ...assignment,
                                voiceProfileId: value,
                                lastSeenAt: new Date().toISOString(),
                              },
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-full min-w-36">
                          <SelectValue placeholder="Pick voice" />
                        </SelectTrigger>
                        <SelectContent>
                          {config.voiceProfiles.map((po) => (
                            <SelectItem key={po.id} value={po.id}>
                              {po.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimestamp(assignment.lastSeenAt)}
                      {profile ? ` · ${profile.label}` : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            updateConfig((current) => ({
                              ...current,
                              playback: {
                                ...current.playback,
                                blockedUsers: [
                                  ...current.playback.blockedUsers.filter(
                                    (u) =>
                                      normalizeLookupValue(u) !==
                                      assignment.userName
                                  ),
                                  assignment.userName,
                                ],
                              },
                            }))
                          }}
                        >
                          Block
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            updateConfig((current) => {
                              const next = { ...current.assignments }
                              delete next[assignment.userName]
                              return { ...current, assignments: next }
                            })
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Backup Tab
// ---------------------------------------------------------------------------

function BackupTab() {
  const { config, restoreBackup, setStatusMessage } = useChatvoice()
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

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
    if (!file) return

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
      <SectionHeading
        title="Backups"
        description="Export a human-readable local backup, or restore a previous one."
      />

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">What gets saved</div>
        <ul className="mt-2 space-y-1">
          <li>· Twitch channel settings</li>
          <li>· Voice profile library</li>
          <li>· Randomized user assignments</li>
          <li>· Filters, limits, and blocklists</li>
          <li>· Schema version metadata for migrations</li>
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button onClick={downloadBackup}>
          <CloudDownloadIcon className="size-4" />
          Export backup
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <CloudUploadIcon className="size-4" />
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

      <Separator />

      <SectionHeading title="Danger zone" />
      <Button
        variant="destructive"
        onClick={() => {
          if (
            window.confirm(
              "This will reset ALL settings to defaults. This cannot be undone. Continue?"
            )
          ) {
            localStorage.clear()
            window.location.reload()
          }
        }}
      >
        Delete all settings
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Theme switcher
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Local primitives (scoped to settings dialog)
// ---------------------------------------------------------------------------

function SectionHeading({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && (
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

function SettingsField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  )
}

function SettingsToggle({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="flex items-start gap-3">
        <div className="rounded-md border border-border bg-muted/40 p-1.5">
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function SettingsCheckbox({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  )
}

function SettingsRange({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(values) => onChange(values[0] ?? min)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function patchVoiceProfile(
  id: string,
  patch: Partial<VoiceProfile>,
  updateConfig: ReturnType<typeof useChatvoice>["updateConfig"]
) {
  updateConfig((current) => ({
    ...current,
    voiceProfiles: current.voiceProfiles.map((profile) =>
      profile.id === id ? { ...profile, ...patch } : profile
    ),
  }))
}
