import * as React from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { toast } from "sonner"
import { SparklesIcon } from "lucide-react"

import { ChatvoiceProvider, useChatvoiceSettings } from "@/lib/chatvoice-context"
import { hasNewVersion, initLastSeenVersion, markVersionSeen } from "@/lib/changelog"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppHeader } from "@/components/app-header"
import { OnboardingDialog } from "@/components/onboarding-dialog"
import { SettingsDialog } from "@/components/settings-dialog"
import { ChangelogDialog } from "@/components/changelog-dialog"
import { ChatPage } from "@/pages/chat-page"
import { LandingPage } from "@/pages/landing-page"

function DashboardLayout() {
  const { ready, needsOnboarding, completeOnboarding } = useChatvoiceSettings()
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [changelogOpen, setChangelogOpen] = React.useState(false)

  // Show a toast when the app version has changed since last visit
  React.useEffect(() => {
    if (!ready || needsOnboarding) return

    if (hasNewVersion()) {
      toast("Chatvoice has been updated since your last visit!", {
        icon: <SparklesIcon className="size-4" />,
        duration: 10_000,
        action: {
          label: "What's new",
          onClick: () => setChangelogOpen(true),
        },
        onDismiss: () => markVersionSeen(),
      })
    }
  }, [ready, needsOnboarding])

  if (!ready) {
    return <div className="min-h-svh bg-background" />
  }

  if (needsOnboarding) {
    return (
      <OnboardingDialog
        open
        onComplete={() => {
          initLastSeenVersion()
          completeOnboarding()
        }}
      />
    )
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      <AppHeader onSettingsClick={() => setSettingsOpen(true)} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatPage />
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </div>
  )
}

function AppShell() {
  return (
    <TooltipProvider>
      <ChatvoiceProvider>
        <DashboardLayout />
      </ChatvoiceProvider>
    </TooltipProvider>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
