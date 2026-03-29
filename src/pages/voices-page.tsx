import * as React from "react"

import { useChatvoice } from "@/lib/chatvoice-context"
import { type VoiceProfile, createVoiceProfile } from "@/lib/chatvoice-config"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Field,
  SliderField,
  VoiceMeta,
} from "@/components/dashboard-primitives"

export function VoicesPage() {
  const { config, updateConfig, voices, voicesLoading } = useChatvoice()

  const voiceOptions = React.useMemo(
    () =>
      voices
        .slice()
        .sort((left, right) => left.label.localeCompare(right.label)),
    [voices]
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Voice profiles</CardTitle>
          <CardDescription>
            These are the saved voices that can be randomly assigned to chatters
            and manually remapped later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.voiceProfiles.map((profile, index) => (
            <div
              key={profile.id}
              className="rounded-2xl border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <Input
                    value={profile.label}
                    onChange={(event) =>
                      updateVoiceProfile(
                        profile.id,
                        { label: event.target.value },
                        updateConfig
                      )
                    }
                    className="max-w-52"
                  />
                  <div className="text-xs text-muted-foreground">
                    Profile {index + 1}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Enabled</Label>
                  <Switch
                    checked={profile.enabled}
                    onCheckedChange={(checked) =>
                      updateVoiceProfile(
                        profile.id,
                        { enabled: checked },
                        updateConfig
                      )
                    }
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Browser voice">
                  <Select
                    value={profile.voice}
                    onValueChange={(value) =>
                      updateVoiceProfile(
                        profile.id,
                        { voice: value },
                        updateConfig
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          voicesLoading ? "Loading voices..." : "Select voice"
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
                </Field>
                <VoiceMeta voiceKey={profile.voice} voices={voiceOptions} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <SliderField
                  label="Rate"
                  value={profile.rate}
                  onChange={(value) =>
                    updateVoiceProfile(
                      profile.id,
                      { rate: value },
                      updateConfig
                    )
                  }
                />
                <SliderField
                  label="Pitch"
                  value={profile.pitch}
                  onChange={(value) =>
                    updateVoiceProfile(
                      profile.id,
                      { pitch: value },
                      updateConfig
                    )
                  }
                />
                <SliderField
                  label="Volume"
                  value={profile.volume}
                  onChange={(value) =>
                    updateVoiceProfile(
                      profile.id,
                      { volume: value },
                      updateConfig
                    )
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Random assignment only uses enabled profiles; if all are disabled,
            Chatvoice falls back to any saved voice.
          </div>
          <Button
            variant="outline"
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
            Add voice profile
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

function updateVoiceProfile(
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
