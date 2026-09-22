import type { ComponentType } from "react"
import { Link, Navigate, useSearchParams } from "react-router-dom"
import {
  ArrowRightIcon,
  ListXIcon,
  PauseIcon,
  PowerIcon,
  ShuffleIcon,
  SkipForwardIcon,
} from "lucide-react"

import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingHeader } from "@/components/landing/landing-header"
import { Badge } from "@/components/ui/badge"
import {
  COMMAND_CATALOG,
  type CommandShareId,
  disabledSharedCommands,
  groupSharedCommands,
  parseCommandsShareParam,
  type SharedCommandState,
  sharedCommandRoleLabel,
} from "@/lib/command-share"
import { cn } from "@/lib/utils"

const COMMAND_ICONS: Record<
  CommandShareId,
  ComponentType<{ className?: string }>
> = {
  queue: PowerIcon,
  playback: PauseIcon,
  skip: SkipForwardIcon,
  clear: ListXIcon,
  newVoice: ShuffleIcon,
}

export function CommandsPage() {
  const [searchParams] = useSearchParams()
  const parsed = parseCommandsShareParam(searchParams.get("c"))

  if (parsed.kind === "absent") {
    return <Navigate to="/" replace />
  }

  const commands =
    parsed.kind === "valid" ? parsed.commands : disabledSharedCommands()
  const groups = groupSharedCommands(commands)

  return (
    <div className="dark relative flex min-h-svh flex-col overflow-x-hidden bg-black text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[50vh] bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.18_302_/0.35),transparent_60%)]"
      />

      <LandingHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-16 pb-16 sm:pt-20">
        <div className="flex flex-col items-center text-center">
          <h1
            className={cn(
              "font-syne text-4xl font-bold tracking-tight text-balance sm:text-5xl",
              "animate-in duration-700 fill-mode-both fade-in slide-in-from-bottom-3"
            )}
          >
            Learn how to use Chatvoice commands
          </h1>
          <p
            className={cn(
              "mt-4 max-w-xl text-base text-pretty text-white/55 sm:text-lg",
              "animate-in delay-100 duration-700 fill-mode-both fade-in slide-in-from-bottom-3"
            )}
          >
            These are the commands enabled in this channel, as well as the
            minimum role needed to use them.
          </p>
        </div>

        {parsed.kind === "invalid" && (
          <p className="mt-8 text-center text-sm text-amber-200/80">
            This commands link looks incomplete or modified. The entire URL is
            required to display this page.
          </p>
        )}

        <div
          className={cn(
            "mt-10 space-y-8",
            "animate-in delay-200 duration-700 fill-mode-both fade-in slide-in-from-bottom-3"
          )}
        >
          {groups.mixed ? (
            <>
              <CommandGroup title="Enabled" commands={groups.enabled} />
              <CommandGroup title="Disabled" commands={groups.disabled} />
            </>
          ) : (
            <CommandList
              commands={
                groups.enabled.length > 0 ? groups.enabled : groups.disabled
              }
            />
          )}
        </div>

        <section
          className={cn(
            "mt-16 flex flex-col items-center text-center sm:mt-20",
            "animate-in delay-300 duration-700 fill-mode-both fade-in slide-in-from-bottom-3"
          )}
        >
          <h2 className="font-syne text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Want to give your chat a voice?
          </h2>
          <p className="mt-3 max-w-md text-sm text-pretty text-white/55 sm:text-base">
            Chatvoice is a powerful tool for streamers and viewers that reads
            Twitch chat aloud in your browser. No login needed, try it!
          </p>
          <Link
            to="/app"
            className={cn(
              "mt-6 inline-flex h-12 items-center justify-center gap-1.5 rounded-full px-7 text-base font-medium text-white",
              "border-2 border-transparent",
              "[background:linear-gradient(#6E11B0,#2E074A)_padding-box,linear-gradient(#2E074A,#6E11B0)_border-box]",
              "shadow-[0_8px_32px_-8px_#6E11B0B3]",
              "transition-transform hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            Try Chatvoice
            <ArrowRightIcon className="size-4" />
          </Link>
        </section>
      </main>

      <div className="relative z-10">
        <LandingFooter />
      </div>
    </div>
  )
}

function CommandGroup({
  title,
  commands,
}: {
  title: string
  commands: SharedCommandState[]
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-white/40 uppercase">
        {title}
      </h2>
      <CommandList commands={commands} />
    </section>
  )
}

function CommandList({ commands }: { commands: SharedCommandState[] }) {
  return (
    <ul className="space-y-3">
      {commands.map((state) => (
        <CommandReferenceRow key={state.id} state={state} />
      ))}
    </ul>
  )
}

function CommandReferenceRow({ state }: { state: SharedCommandState }) {
  const catalog = COMMAND_CATALOG[state.id]
  const Icon = COMMAND_ICONS[state.id]
  const roleLabel = sharedCommandRoleLabel(state)

  return (
    <li
      className={cn(
        "rounded-2xl border border-white/10 bg-[#0c0c0c] px-4 py-3.5",
        !state.enabled && "opacity-55"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-md border border-white/10 bg-white/5 p-1.5">
            <Icon className="size-3.5 text-white/70" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">{catalog.command}</div>
            <div className="mt-0.5 text-sm text-white/55">
              {catalog.description}
            </div>
          </div>
        </div>
        <Badge
          variant={state.enabled ? "default" : "outline"}
          className={cn(
            "mt-0.5 shrink-0",
            !state.enabled && "border-white/15 text-white/70"
          )}
        >
          {roleLabel}
        </Badge>
      </div>
    </li>
  )
}
