import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
  ShieldBan,
  Trash2Icon,
} from "lucide-react"

import {
  useChatvoice,
  formatTimestamp,
} from "@/lib/chatvoice-context"
import {
  normalizeLookupValue,
  pickRandomVoiceProfileId,
} from "@/lib/chatvoice-config"
import {
  getAssignmentPage,
  deleteAssignment,
  putAssignment,
} from "@/lib/assignments-db"
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

const PAGE_SIZE = 50

export function UsersTab() {
  const { config, updateConfig } = useChatvoice()
  const [newUserName, setNewUserName] = React.useState("")
  const [newVoiceProfileId, setNewVoiceProfileId] = React.useState("")

  const [page, setPage] = React.useState(0)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [rows, setRows] = React.useState<
    Awaited<ReturnType<typeof getAssignmentPage>>
  >({ items: [], total: 0 })
  const [refreshKey, setRefreshKey] = React.useState(0)

  const blockedSet = React.useMemo(
    () => new Set(config.playback.blockedUsers.map(normalizeLookupValue)),
    [config.playback.blockedUsers]
  )

  // Load a page of assignments from IndexedDB
  React.useEffect(() => {
    let cancelled = false

    getAssignmentPage(page, PAGE_SIZE, blockedSet, searchQuery).then(
      (result) => {
        if (!cancelled) setRows(result)
      }
    )

    return () => {
      cancelled = true
    }
  }, [page, blockedSet, searchQuery, refreshKey])

  // Reset page when search changes
  React.useEffect(() => {
    setPage(0)
  }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(rows.total / PAGE_SIZE))

  const handleAddUser = async () => {
    const userName = newUserName.trim()
    if (!userName) return

    const voiceProfileId =
      newVoiceProfileId || pickRandomVoiceProfileId(config.voiceProfiles)
    if (!voiceProfileId) return

    const now = new Date().toISOString()
    await putAssignment({
      userName: normalizeLookupValue(userName),
      displayName: userName,
      voiceProfileId,
      createdAt: now,
      lastSeenAt: now,
    })
    setRefreshKey((k) => k + 1)
    setNewUserName("")
    setNewVoiceProfileId("")
  }

  const refresh = () => setRefreshKey((k) => k + 1)

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
            placeholder="Username"
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddUser()
            }}
          />
        </SettingsField>
        <SettingsField label="Voice profile">
          <Select
            value={newVoiceProfileId}
            onValueChange={setNewVoiceProfileId}
          >
            <SelectTrigger className="h-8 min-w-36">
              <SelectValue placeholder="Random" />
            </SelectTrigger>
            <SelectContent>
              {config.voiceProfiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users…"
          className="h-8 pl-8"
        />
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
            {rows.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  {searchQuery
                    ? "No users match your search."
                    : "Voice assignments appear here after previewing or receiving chat."}
                </TableCell>
              </TableRow>
            ) : (
              rows.items.map((assignment) => (
                <AssignmentRow
                  key={assignment.userName}
                  assignment={assignment}
                  config={config}
                  updateConfig={updateConfig}
                  onRefresh={refresh}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {rows.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {rows.total} user{rows.total !== 1 ? "s" : ""} · page{" "}
            {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeftIcon className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRightIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function AssignmentRow({
  assignment,
  config,
  updateConfig,
  onRefresh,
}: {
  assignment: Awaited<ReturnType<typeof getAssignmentPage>>["items"][number]
  config: ReturnType<typeof useChatvoice>["config"]
  updateConfig: ReturnType<typeof useChatvoice>["updateConfig"]
  onRefresh: () => void
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{assignment.displayName}</span>
          <span className="text-xs text-muted-foreground">
            @{assignment.userName}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={assignment.voiceProfileId}
          onValueChange={async (value) => {
            await putAssignment({
              ...assignment,
              voiceProfileId: value,
              lastSeenAt: new Date().toISOString(),
            })
            onRefresh()
          }}
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
                        normalizeLookupValue(u) !== assignment.userName
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
            onClick={async () => {
              await deleteAssignment(assignment.userName)
              onRefresh()
            }}
          >
            <Trash2Icon />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
