import { AlertCircleIcon } from "lucide-react"

import { ChatvoiceProvider, useChatvoice } from "@/lib/chatvoice-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/app-sidebar"
import { ChatPage } from "@/pages/chat-page"
import { ModerationPage } from "@/pages/moderation-page"
import { SettingsPage } from "@/pages/settings-page"
import { UsersPage } from "@/pages/users-page"
import { VoicesPage } from "@/pages/voices-page"

function DashboardLayout() {
  const { ready, activePage, statusMessage } = useChatvoice()

  if (!ready) {
    return <div className="min-h-svh bg-background" />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium capitalize">{activePage}</span>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {statusMessage ? (
            <Alert className="mb-6">
              <AlertCircleIcon />
              <AlertTitle>Dashboard notice</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          ) : null}

          <ActivePage page={activePage} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function ActivePage({ page }: { page: string }) {
  switch (page) {
    case "chat":
      return <ChatPage />
    case "voices":
      return <VoicesPage />
    case "moderation":
      return <ModerationPage />
    case "users":
      return <UsersPage />
    case "settings":
      return <SettingsPage />
    default:
      return <ChatPage />
  }
}

export function App() {
  return (
    <TooltipProvider>
      <ChatvoiceProvider>
        <DashboardLayout />
      </ChatvoiceProvider>
    </TooltipProvider>
  )
}

export default App
