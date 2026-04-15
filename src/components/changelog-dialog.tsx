import * as React from "react"
import { SparklesIcon } from "lucide-react"

import {
  type ChangelogEntry,
  CHANGELOG,
  getAppVersion,
  markVersionSeen,
} from "@/lib/changelog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

export function ChangelogDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  // Mark version as seen when the dialog is opened
  React.useEffect(() => {
    if (open) markVersionSeen()
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4" />
            What's new
          </DialogTitle>
          <DialogDescription>
            You're on version {getAppVersion()}. Here's what changed.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-5 overflow-y-auto pr-1">
          {CHANGELOG.map((entry) => (
            <ChangelogSection key={entry.version} entry={entry} />
          ))}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}

function ChangelogSection({ entry }: { entry: ChangelogEntry }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          v{entry.version}
        </Badge>
        <span className="text-xs text-muted-foreground">{entry.date}</span>
      </div>
      <ul className="space-y-1 pl-4 text-sm text-muted-foreground">
        {entry.items.map((item, i) => (
          <li key={i} className="list-disc pl-0.5">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
