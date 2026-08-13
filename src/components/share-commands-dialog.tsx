import * as React from "react"
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ShareCommandsDialog({
  open,
  onOpenChange,
  shareMessage,
  shareUrl,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareMessage: string
  shareUrl: string
}) {
  const [copied, setCopied] = React.useState(false)
  const resetTimerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (!open) {
      setCopied(false)
    }
  }, [open])

  const copyShareMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage)
      setCopied(true)
      toast.success("Copied chatbot reply")
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
      resetTimerRef.current = window.setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add commands to your chatbot</DialogTitle>
          <DialogDescription>
            Create a custom command in your chatbot of choice that responds with
            the following link, such as StreamElements, Nightbot or Fossabot.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="commands-share-text">Chatbot reply</Label>
          <Textarea
            id="commands-share-text"
            readOnly
            rows={4}
            value={shareMessage}
            onFocus={(event) => event.currentTarget.select()}
            className="min-h-20 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Note: you'll have to update the command any time you change
            permissions.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" asChild>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              Preview page
              <ExternalLinkIcon />
            </a>
          </Button>
          <Button onClick={copyShareMessage}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy reply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
