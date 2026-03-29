import * as React from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"

import { useChatvoice } from "@/lib/chatvoice-context"
import { type VoiceProfile, createVoiceProfile } from "@/lib/chatvoice-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SectionHeading } from "@/components/settings/settings-primitives"

export function VoicesTab() {
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
