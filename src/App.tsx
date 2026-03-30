import * as React from "react"

import { ChatvoiceProvider, useChatvoice } from "@/lib/chatvoice-context"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppHeader } from "@/components/app-header"
import { SettingsDialog } from "@/components/settings-dialog"
import { ChatPage } from "@/pages/chat-page"

function DashboardLayout() {
  const { ready } = useChatvoice()
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  if (!ready) {
    return <div className="min-h-svh bg-background" />
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      <AppHeader onSettingsClick={() => setSettingsOpen(true)} />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-6">
        <ChatPage />
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
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
