import * as React from "react"

import { useChatvoice, formatTimestamp } from "@/lib/chatvoice-context"
import { normalizeLookupValue } from "@/lib/chatvoice-config"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
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

export function UsersPage() {
  const { config, updateConfig } = useChatvoice()

  const assignmentRows = React.useMemo(() => {
    return Object.values(config.assignments)
      .slice()
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))
  }, [config.assignments])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Saved voice assignments</CardTitle>
          <CardDescription>
            Reassign voices anytime from the dashboard. The user-to-voice
            mapping stays local and exports with backups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[520px] rounded-xl border border-border">
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
                      Voice assignments appear here after previewing or
                      receiving chat.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignmentRows.map((assignment) => {
                    const profile = config.voiceProfiles.find(
                      (voiceProfile) =>
                        voiceProfile.id === assignment.voiceProfileId
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
                            <SelectTrigger className="w-full min-w-44">
                              <SelectValue placeholder="Pick voice" />
                            </SelectTrigger>
                            <SelectContent>
                              {config.voiceProfiles.map((profileOption) => (
                                <SelectItem
                                  key={profileOption.id}
                                  value={profileOption.id}
                                >
                                  {profileOption.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
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
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
