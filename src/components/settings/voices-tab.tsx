import * as React from "react"
import {
  CircleHelpIcon,
  PlusIcon,
  PlayIcon,
  ShuffleIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react"

import { useChatvoiceSettings } from "@/lib/chatvoice-context"
import type { ChatvoiceConfigContextValue } from "@/lib/chatvoice-context"
import {
  type VoiceProfile,
  createVoiceProfile,
  DEFAULT_PREVIEW_TEXT,
} from "@/lib/chatvoice-config"
import {
  type BrowserVoice,
  findSynthVoice,
  configRateToSpeechRate,
  configPitchToSpeechPitch,
  configVolumeToSpeechVolume,
} from "@/hooks/use-browser-voices"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  SectionHeading,
  SettingsToggle,
  SettingsField,
} from "@/components/settings/settings-primitives"

const VOICE_PARAM_HINT =
  "Not all voices support adjusting rate, pitch, or volume. Cloud voices especially often ignore these settings."

function VoiceParamHeader({ label }: { label: string }) {
  return (
    <TableHead className="text-center">
      <span className="inline-flex items-center justify-center gap-1">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
              aria-label={VOICE_PARAM_HINT}
            >
              <CircleHelpIcon className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-56 text-pretty">
            {VOICE_PARAM_HINT}
          </TooltipContent>
        </Tooltip>
      </span>
    </TableHead>
  )
}

export function VoicesTab() {
  const { config, updateConfig, voices, voicesLoading } = useChatvoiceSettings()

  const voiceOptions = React.useMemo(
    () =>
      voices
        .slice()
        .sort((left, right) => left.label.localeCompare(right.label)),
    [voices]
  )

  return (
    <div className="space-y-4">
      {/* Voice assignment settings */}
      <SectionHeading
        title="Voice assignment"
        description="Control how voices are given to new chatters."
      />

      <SettingsToggle
        icon={ShuffleIcon}
        title="Auto-assign voices"
        description="Randomly assign and save a voice for each new chatter. When off, unassigned chatters use the default voice below without saving."
        checked={config.playback.autoAssignVoices}
        onCheckedChange={(checked) =>
          updateConfig((current) => ({
            ...current,
            playback: { ...current.playback, autoAssignVoices: checked },
          }))
        }
      />

      {!config.playback.autoAssignVoices && (
        <SettingsField label="Default voice for unassigned chatters">
          <Select
            value={config.playback.defaultVoiceProfileId || "__random__"}
            onValueChange={(value) =>
              updateConfig((current) => ({
                ...current,
                playback: {
                  ...current.playback,
                  defaultVoiceProfileId:
                    value === "__random__" ? "" : value,
                },
              }))
            }
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Random (from enabled)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__random__">
                Random (from enabled)
              </SelectItem>
              {config.voiceProfiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsField>
      )}

      <div className="flex items-center justify-between gap-2">
        <SectionHeading
          title="Voice profiles"
          description="Saved voices that are randomly assigned to chatters."
        />
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
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

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Voice</TableHead>
              <VoiceParamHeader label="Rate" />
              <VoiceParamHeader label="Pitch" />
              <VoiceParamHeader label="Vol" />
              <TableHead className="text-center">Enabled</TableHead>
              <TableHead className="w-20" />
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
                      className="h-7 w-28 lg:min-w-28 lg:w-full text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <VoiceSelect
                      value={profile.voice}
                      onValueChange={(value) =>
                        patchVoiceProfile(
                          profile.id,
                          { voice: value },
                          updateConfig
                        )
                      }
                      voiceOptions={voiceOptions}
                      voicesLoading={voicesLoading}
                    />
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
                      className="h-7 w-16 xl:min-w-16 xl:w-full text-center text-sm"
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
                      className="h-7 w-16 xl:min-w-16 xl:w-full text-center text-sm"
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
                      className="h-7 w-16 xl:min-w-16 xl:w-full text-center text-sm"
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
                    <div className="flex items-center gap-1">
                      <PreviewButton profile={profile} />
                      <Button
                        variant="outline"
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
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function patchVoiceProfile(
  id: string,
  patch: Partial<VoiceProfile>,
  updateConfig: ChatvoiceConfigContextValue["updateConfig"]
) {
  updateConfig((current) => ({
    ...current,
    voiceProfiles: current.voiceProfiles.map((profile) =>
      profile.id === id ? { ...profile, ...patch } : profile
    ),
  }))
}

function PreviewButton({ profile }: { profile: VoiceProfile }) {
  const [playing, setPlaying] = React.useState(false)

  const play = React.useCallback(() => {
    const synth = window.speechSynthesis
    if (!synth) return

    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(DEFAULT_PREVIEW_TEXT)
    const synthVoice = findSynthVoice(profile.voice)
    if (synthVoice) utterance.voice = synthVoice

    utterance.rate = configRateToSpeechRate(profile.rate)
    utterance.pitch = configPitchToSpeechPitch(profile.pitch)
    utterance.volume = configVolumeToSpeechVolume(profile.volume)

    utterance.onend = () => setPlaying(false)
    utterance.onerror = () => setPlaying(false)

    setPlaying(true)
    synth.speak(utterance)
  }, [profile.voice, profile.rate, profile.pitch, profile.volume])

  const stop = React.useCallback(() => {
    window.speechSynthesis?.cancel()
    setPlaying(false)
  }, [])

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={playing ? stop : play}
      title={playing ? "Stop preview" : "Preview voice"}
    >
      {playing ? (
        <SquareIcon className="size-3" />
      ) : (
        <PlayIcon className="size-3.5" />
      )}
    </Button>
  )
}

/**
 * Defers rendering the (potentially huge) voice option list until the dropdown
 * is actually opened. This avoids mounting hundreds of Radix SelectItems per
 * profile row when the tab first appears.
 */
function VoiceSelect({
  value,
  onValueChange,
  voiceOptions,
  voicesLoading,
}: {
  value: string
  onValueChange: (value: string) => void
  voiceOptions: BrowserVoice[]
  voicesLoading: boolean
}) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = value
    ? voiceOptions.find((v) => v.name === value)?.label
    : undefined

  return (
    <Select value={value} onValueChange={onValueChange} open={open} onOpenChange={setOpen}>
      <SelectTrigger className="h-7 w-40 xl:min-w-40 xl:w-full text-sm">
        <SelectValue
          placeholder={voicesLoading ? "Loading..." : "Select voice"}
        >
          {selectedLabel}
        </SelectValue>
      </SelectTrigger>
      {open && (
        <SelectContent>
          {voiceOptions.map((voice) => (
            <SelectItem key={voice.name} value={voice.name}>
              {voice.label}
            </SelectItem>
          ))}
        </SelectContent>
      )}
    </Select>
  )
}
