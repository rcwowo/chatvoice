import { AudioLinesIcon, CircleAlertIcon, CircleCheckIcon } from "lucide-react"

import { useBrowserVoices } from "@/hooks/use-browser-voices"
import {
  getBrowserSupportCopy,
  getBrowserSupportTier,
  type BrowserSupportTier,
} from "@/lib/browser-support"
import { cn } from "@/lib/utils"

const TIER_STYLES: Record<
  Exclude<BrowserSupportTier, "loading">,
  { shell: string; icon: string; Icon: typeof CircleCheckIcon }
> = {
  ready: {
    shell:
      "border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_24px_-14px_oklch(0.7_0.17_155_/0.28)]",
    icon: "bg-emerald-500/20 text-emerald-400",
    Icon: CircleCheckIcon,
  },
  limited: {
    shell:
      "border-amber-500/30 bg-amber-500/10 shadow-[0_0_24px_-14px_oklch(0.8_0.14_85_/0.22)]",
    icon: "bg-amber-500/20 text-amber-400",
    Icon: AudioLinesIcon,
  },
  unsupported: {
    shell:
      "border-rose-500/30 bg-rose-500/10 shadow-[0_0_24px_-14px_oklch(0.65_0.2_25_/0.25)]",
    icon: "bg-rose-500/20 text-rose-400",
    Icon: CircleAlertIcon,
  },
}

export function BrowserSupportSection({ className }: { className?: string }) {
  const { voices, loading } = useBrowserVoices()
  const tier = getBrowserSupportTier(loading, voices.length)

  return (
    <div
      className={cn(
        "w-full max-w-2xl",
        "animate-in fade-in slide-in-from-bottom-3 duration-700 delay-300 fill-mode-both",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy={loading}
    >
      {tier === "loading" ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur-md">
          <div
            className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70"
            aria-hidden
          />
          <span className="text-sm text-white/55">Checking for voices…</span>
        </div>
      ) : (
        <StatusBanner
          tier={tier}
          {...getBrowserSupportCopy(tier, voices.length)}
        />
      )}
    </div>
  )
}

function StatusBanner({
  tier,
  title,
  body,
}: {
  tier: Exclude<BrowserSupportTier, "loading">
  title: string
  body: string
}) {
  const { shell, icon, Icon } = TIER_STYLES[tier]

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left backdrop-blur-md sm:items-center sm:gap-3.5 sm:px-5",
        shell
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full sm:mt-0",
          icon
        )}
        aria-hidden
      >
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-syne text-base font-semibold tracking-tight">
          {title}
        </p>
        <p className="mt-0.5 text-sm text-pretty text-white/60">{body}</p>
      </div>
    </div>
  )
}
