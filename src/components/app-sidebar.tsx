import {
  AudioLinesIcon,
  CircleIcon,
  MessageSquareIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react"

import logoSrc from "@/assets/logo.svg"
import { type PageId, useChatvoice } from "@/lib/chatvoice-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const NAV_ITEMS: {
  id: PageId
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: "chat", label: "Chat", icon: MessageSquareIcon },
  { id: "voices", label: "Voices", icon: AudioLinesIcon },
  { id: "moderation", label: "Moderation", icon: ShieldIcon },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
]

export function AppSidebar() {
  const { activePage, setActivePage, connectionState, playbackQueue } =
    useChatvoice()

  const connected = connectionState?.connected ?? false
  const channel = connectionState?.channel

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-2">
          <img
            src={logoSrc}
            alt="Chatvoice"
            className="h-7 w-auto dark:invert"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activePage === item.id}
                    onClick={() => setActivePage(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.id === "chat" && playbackQueue.length > 0 ? (
                    <SidebarMenuBadge>{playbackQueue.length}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1 text-sm">
          <CircleIcon
            className={`size-2.5 shrink-0 fill-current ${
              connected ? "text-green-500" : "text-muted-foreground/50"
            }`}
          />
          <span className="truncate text-muted-foreground">
            {connected ? `Connected to #${channel}` : "Offline"}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
