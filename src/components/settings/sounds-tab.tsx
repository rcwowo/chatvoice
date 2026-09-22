import * as React from "react"
import {
  PlayIcon,
  SquareIcon,
  Trash2Icon,
  UploadIcon,
  Volume2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { useChatvoiceSettings } from "@/lib/chatvoice-context"
import {
  COMMAND_ROLE_OPTIONS,
  type CommandRole,
  type SoundEffect,
} from "@/lib/chatvoice-config"
import {
  normalizeSoundEffectName,
  uniqueSoundEffectName,
} from "@/lib/sound-effect-name"
import { buildSoundEffectList } from "@/lib/sound-effects"
import {
  deleteSoundEffectAudio,
  getSoundEffectAudio,
  putSoundEffectAudio,
} from "@/lib/sound-effects-db"
import { ExportSoundsDialog } from "@/components/settings/export-sounds-dialog"
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
import { SectionHeading } from "@/components/settings/settings-primitives"

const MAX_SOUND_EFFECT_BYTES = 2 * 1024 * 1024

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SoundsTab() {
  const { config, updateConfig } = useChatvoiceSettings()
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [exportOpen, setExportOpen] = React.useState(false)
  const sounds = config.soundEffects
  const soundList = buildSoundEffectList(sounds)

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return

    setUploading(true)
    try {
      const created: { id: string; baseName: string }[] = []

      for (const file of files) {
        if (!file.type.startsWith("audio/")) {
          toast.error(`${file.name} is not an audio file.`)
          continue
        }

        if (file.size > MAX_SOUND_EFFECT_BYTES) {
          toast.error(
            `${file.name} is larger than ${formatBytes(MAX_SOUND_EFFECT_BYTES)}.`
          )
          continue
        }

        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `sound-${Date.now()}-${created.length}`

        await putSoundEffectAudio({
          id,
          blob: file,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        })

        created.push({ id, baseName: file.name.replace(/\.[^.]+$/, "") })
      }

      if (created.length > 0) {
        updateConfig((current) => {
          const newSounds: SoundEffect[] = []

          for (const entry of created) {
            const name = uniqueSoundEffectName(entry.baseName, [
              ...current.soundEffects.map((sound) => sound.name),
              ...newSounds.map((sound) => sound.name),
            ])
            newSounds.push({
              id: entry.id,
              name,
              enabled: true,
              minRole: "everyone",
              volume: 1,
            })
          }

          return {
            ...current,
            soundEffects: [...current.soundEffects, ...newSounds],
          }
        })

        toast.success(
          `Added ${created.length} sound effect${created.length === 1 ? "" : "s"}.`
        )
      }
    } finally {
      setUploading(false)
    }
  }

  const updateSound = (id: string, patch: Partial<SoundEffect>) => {
    updateConfig((current) => ({
      ...current,
      soundEffects: current.soundEffects.map((sound) =>
        sound.id === id ? { ...sound, ...patch } : sound
      ),
    }))
  }

  const renameSound = (id: string, rawName: string) => {
    updateConfig((current) => {
      const others = current.soundEffects
        .filter((sound) => sound.id !== id)
        .map((sound) => sound.name)
      const name = uniqueSoundEffectName(rawName, others)

      return {
        ...current,
        soundEffects: current.soundEffects.map((sound) =>
          sound.id === id ? { ...sound, name } : sound
        ),
      }
    })
  }

  const removeSound = (id: string) => {
    updateConfig((current) => ({
      ...current,
      soundEffects: current.soundEffects.filter((sound) => sound.id !== id),
    }))
    void deleteSoundEffectAudio(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <SectionHeading
          title="Sound effects"
          description="Upload audio clips your chat can trigger alongside speech."
        />
        <Button
          size="sm"
          className="shrink-0"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon className="size-3.5" />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files)
            event.target.value = ""
          }}
        />
      </div>

      <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <Volume2Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              Learn how to use sound effects
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Chatters with the necessary roles can use the sound effects you
              set in their message by simply wrapping its name in parentheses.
              (e.g. &quot;I feel something coming... (fart) Oops.&quot;)
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => setExportOpen(true)}
        >
          Export list
        </Button>
      </div>

      <ExportSoundsDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        soundList={soundList}
      />

      {sounds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No sound effects yet. Upload an audio file to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {sounds.map((sound) => (
            <SoundEffectRow
              key={sound.id}
              sound={sound}
              onRename={(name) => renameSound(sound.id, name)}
              onUpdate={(patch) => updateSound(sound.id, patch)}
              onRemove={() => removeSound(sound.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SoundEffectRow({
  sound,
  onRename,
  onUpdate,
  onRemove,
}: {
  sound: SoundEffect
  onRename: (name: string) => void
  onUpdate: (patch: Partial<SoundEffect>) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center">
          <SoundNameInput sound={sound} onRename={onRename} />
        </div>
        <Switch
          checked={sound.enabled}
          onCheckedChange={(enabled) => onUpdate({ enabled })}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
        <Select
          value={sound.minRole}
          onValueChange={(value) => onUpdate({ minRole: value as CommandRole })}
          disabled={!sound.enabled}
        >
          <SelectTrigger className="h-8 w-[9.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMMAND_ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Vol</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={Math.round(sound.volume * 100)}
            disabled={!sound.enabled}
            onChange={(event) => {
              const value = Math.min(
                100,
                Math.max(0, Number(event.target.value))
              )
              onUpdate({ volume: (Number.isFinite(value) ? value : 100) / 100 })
            }}
            className="h-8 w-16 text-center text-sm"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <SoundPreviewButton sound={sound} />
          <Button
            variant="outline"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
            title="Delete sound effect"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function SoundNameInput({
  sound,
  onRename,
}: {
  sound: SoundEffect
  onRename: (name: string) => void
}) {
  const [draft, setDraft] = React.useState(sound.name)

  React.useEffect(() => {
    setDraft(sound.name)
  }, [sound.name])

  const commit = () => {
    const normalized = normalizeSoundEffectName(draft)
    if (!normalized || normalized === sound.name) {
      setDraft(sound.name)
      return
    }

    setDraft(normalized)
    onRename(normalized)
  }

  return (
    <Input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur()
        }
      }}
      className="h-8 flex-1 font-mono text-sm"
    />
  )
}

function SoundPreviewButton({ sound }: { sound: SoundEffect }) {
  const [playing, setPlaying] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const urlRef = React.useRef<string | null>(null)

  const stop = React.useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setPlaying(false)
  }, [])

  React.useEffect(() => stop, [stop])

  const play = React.useCallback(async () => {
    stop()
    const record = await getSoundEffectAudio(sound.id)
    if (!record) {
      toast.error("The audio file for this sound effect is missing.")
      return
    }

    const url = URL.createObjectURL(record.blob)
    urlRef.current = url

    const audio = new Audio(url)
    audio.volume = sound.volume
    audioRef.current = audio
    audio.onended = stop
    audio.onerror = () => {
      toast.error("Could not play this sound effect.")
      stop()
    }

    setPlaying(true)
    audio.play().catch(() => {
      toast.error("Could not play this sound effect.")
      stop()
    })
  }, [sound.id, sound.volume, stop])

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={playing ? stop : play}
      title={playing ? "Stop preview" : "Preview sound effect"}
    >
      {playing ? (
        <SquareIcon className="size-3" />
      ) : (
        <PlayIcon className="size-3.5" />
      )}
    </Button>
  )
}
