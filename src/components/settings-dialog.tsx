import * as React from "react"
import {
  AudioLinesIcon,
  DatabaseIcon,
  ShieldIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { GeneralTab } from "@/components/settings/general-tab"
import { VoicesTab } from "@/components/settings/voices-tab"
import { ModerationTab } from "@/components/settings/moderation-tab"
import { UsersTab } from "@/components/settings/users-tab"
import { BackupTab } from "@/components/settings/backup-tab"

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
      <DialogContent className="flex h-[85vh] w-[80vw] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
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
          <div className="min-h-0 min-w-0 flex-1 overflow-auto">
            <div className="p-6 mt-6">
              {activeTab === "general" && <GeneralTab />}
              {activeTab === "voices" && <VoicesTab />}
              {activeTab === "moderation" && <ModerationTab />}
              {activeTab === "users" && <UsersTab />}
              {activeTab === "backup" && <BackupTab />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
