import { SettingsIcon } from "lucide-react"

import logoSrc from "/branding/logo.png"
import { ChannelSwitcher } from "@/components/channel-switcher"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function AppHeader({
  onSettingsClick,
}: {
  onSettingsClick: () => void
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        <img src={logoSrc} alt="Chatvoice" className="h-6 w-auto dark:invert" />
      </div>
      <div className="flex items-center gap-2">
        <ChannelSwitcher />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onSettingsClick}>
              <SettingsIcon className="size-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
