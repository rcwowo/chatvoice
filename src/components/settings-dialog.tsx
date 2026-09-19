import * as React from "react"
import {
  AudioLinesIcon,
  DatabaseIcon,
  ShieldIcon,
  TerminalIcon,
  UsersIcon,
  Volume2Icon,
  WrenchIcon,
} from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { GeneralTab } from "@/components/settings/general-tab"
import { VoicesTab } from "@/components/settings/voices-tab"
import { ModerationTab } from "@/components/settings/moderation-tab"
import { UsersTab } from "@/components/settings/users-tab"
import { CommandsTab } from "@/components/settings/commands-tab"
import { SoundsTab } from "@/components/settings/sounds-tab"
import { BackupTab } from "@/components/settings/backup-tab"
import { cn } from "@/lib/utils"

const COMPACT_SETTINGS_MEDIA_QUERY = "(max-width: 849px)"

function useCompactSettings() {
  const [isCompact, setIsCompact] = React.useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(COMPACT_SETTINGS_MEDIA_QUERY).matches
      : false
  )

  React.useEffect(() => {
    const media = window.matchMedia(COMPACT_SETTINGS_MEDIA_QUERY)
    const onChange = () => setIsCompact(media.matches)
    onChange()
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  return isCompact
}

type SettingsTab =
  | "general"
  | "voices"
  | "moderation"
  | "users"
  | "commands"
  | "sounds"
  | "backup"

const SETTINGS_TABS: {
  id: SettingsTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: "general", label: "General", icon: WrenchIcon },
  { id: "voices", label: "Voices", icon: AudioLinesIcon },
  { id: "sounds", label: "Sounds", icon: Volume2Icon },
  { id: "moderation", label: "Moderation", icon: ShieldIcon },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "commands", label: "Commands", icon: TerminalIcon },
]

const DATA_TABS: {
  id: SettingsTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [{ id: "backup", label: "Backup", icon: DatabaseIcon }]

function SettingsTabButton({
  tab,
  isCompact,
  active,
  onSelect,
}: {
  tab: {
    id: SettingsTab
    label: string
    icon: React.ComponentType<{ className?: string }>
  }
  isCompact: boolean
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={tab.label}
      aria-label={tab.label}
      className={cn(
        "flex items-center rounded-lg py-2 text-sm transition-colors",
        isCompact ? "justify-center px-2" : "gap-2.5 px-2.5 text-left",
        active
          ? "bg-background font-medium text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
      )}
    >
      <tab.icon className="size-4 shrink-0" />
      {!isCompact && tab.label}
    </button>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("general")
  const isCompact = useCompactSettings()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none",
          isCompact
            ? "h-[calc(100dvh-1rem)] w-[calc(100%-1rem)]"
            : "h-[85vh] w-[80vw]"
        )}
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <nav
            className={cn(
              "flex shrink-0 flex-col border-r border-border bg-muted/30",
              isCompact ? "w-14 p-2" : "w-48 p-3"
            )}
          >
            {!isCompact && (
              <h2 className="mb-3 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Settings
              </h2>
            )}
            <div className="flex flex-col gap-0.5">
              {SETTINGS_TABS.map((tab) => (
                <SettingsTabButton
                  key={tab.id}
                  tab={tab}
                  isCompact={isCompact}
                  active={activeTab === tab.id}
                  onSelect={() => setActiveTab(tab.id)}
                />
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
              {DATA_TABS.map((tab) => (
                <SettingsTabButton
                  key={tab.id}
                  tab={tab}
                  isCompact={isCompact}
                  active={activeTab === tab.id}
                  onSelect={() => setActiveTab(tab.id)}
                />
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="min-h-0 min-w-0 flex-1 overflow-auto">
            <div
              className={cn(
                !isCompact && "mt-6 p-6",
                isCompact && activeTab === "general" && "mt-6 px-4 pt-6 pb-4",
                isCompact && activeTab !== "general" && "p-4"
              )}
            >
              {activeTab === "general" && <GeneralTab />}
              {activeTab === "voices" && <VoicesTab />}
              {activeTab === "sounds" && <SoundsTab />}
              {activeTab === "moderation" && <ModerationTab />}
              {activeTab === "users" && <UsersTab />}
              {activeTab === "commands" && <CommandsTab />}
              {activeTab === "backup" && <BackupTab />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
