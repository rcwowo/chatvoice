import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
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

export function ExportSoundsDialog({
  open,
  onOpenChange,
  soundList,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  soundList: string
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

  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(soundList)
      setCopied(true)
      toast.success("Copied sound effect list")
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
          <DialogTitle>Sound effect list</DialogTitle>
          <DialogDescription>
            Copy this list and share it with your chat so they know which sound
            effects they can use.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="sound-effect-list">Available sound effects</Label>
          <Textarea
            id="sound-effect-list"
            readOnly
            rows={4}
            value={soundList}
            onFocus={(event) => event.currentTarget.select()}
            placeholder="No sound effects yet."
            className="min-h-20 resize-none font-mono"
          />
        </div>

        <DialogFooter>
          <Button onClick={copyList} disabled={!soundList}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy list"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
