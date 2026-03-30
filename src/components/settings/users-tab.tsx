import * as React from "react"
import { PlusIcon, ShieldBan, Trash2Icon } from "lucide-react"

import {
  useChatvoice,
  formatTimestamp,
} from "@/lib/chatvoice-context"
import {
  ensureVoiceAssignment,
  normalizeLookupValue,
} from "@/lib/chatvoice-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  SectionHeading,
  SettingsField,
} from "@/components/settings/settings-primitives"

export function UsersTab() {
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

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Saved voice</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead className="w-12" />
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
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
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
                          <ShieldBan />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => {
                            updateConfig((current) => {
                              const next = { ...current.assignments }
                              delete next[assignment.userName]
                              return { ...current, assignments: next }
                            })
                          }}
                        >
                          <Trash2Icon />
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
