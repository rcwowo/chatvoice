import { Link } from "react-router-dom"
import { ArrowRightIcon } from "lucide-react"

import iconSrc from "/branding/icon.png"
import { BrowserSupportSection } from "@/components/landing/browser-support-section"
import { FaqSection } from "@/components/landing/faq-section"
import { LandingFooter } from "@/components/landing/landing-footer"
import { VoiceAssignmentDemo } from "@/components/landing/voice-assignment-demo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const GITHUB_URL = "https://github.com/rcwowo/chatvoice"

/* lucide 1.0 removed brand icons :( */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.014-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.528 2.341 1.087 2.91.832.092-.647.35-1.087.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0 0 22 12c0-5.523-4.477-10-10-10Z" />
    </svg>
  )
}

export function LandingPage() {
  return (
    <div className="dark relative flex min-h-svh flex-col overflow-x-hidden bg-black text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.18_302_/0.35),transparent_60%)]"
      />

      <header className="relative z-10 flex justify-center px-4 pt-6 sm:pt-8">
        <nav
          className={cn(
            "flex w-full max-w-xs items-center justify-between rounded-full border border-white/10 bg-white/5 px-3 py-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-md sm:max-w-sm",
            "animate-in fade-in slide-in-from-top-2 duration-700"
          )}
        >
          <Link
            to="/"
            className="flex size-8 items-center justify-center rounded-full"
            aria-label="Chatvoice home"
          >
            <img src={iconSrc} alt="" className="size-5 invert" />
          </Link>

          <div className="flex items-center gap-1.5">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="View Chatvoice on GitHub"
            >
              <GitHubIcon className="size-4" />
            </a>
            <Button
              asChild
              size="sm"
              className="h-8 rounded-full bg-primary px-3.5 text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/app">Launch</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pt-16 pb-16 sm:pt-20 md:pt-24">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <h1
            className={cn(
              "w-full max-w-[740px] font-syne text-4xl font-bold tracking-tight text-balance sm:text-5xl sm:text-nowrap md:text-6xl",
              "animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both"
            )}
          >
            Give your chat a voice!
          </h1>
          <p
            className={cn(
              "mt-5 max-w-xl text-base text-pretty text-white/55 sm:text-lg",
              "animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100 fill-mode-both"
            )}
          >
            Chatvoice uses your browser&apos;s built-in speech synthesis
            capabilities to give people in your Twitch chat the ability to
            speak.
          </p>
        </div>

        <div
          className={cn(
            "relative mt-16 w-full sm:mt-20 md:mt-24",
            "animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 fill-mode-both"
          )}
        >
          <div className="relative mx-auto max-w-4xl">
            <div
              className={cn(
                "absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2",
                "animate-in fade-in zoom-in-95 duration-700 delay-300 fill-mode-both"
              )}
            >
              <Link
                to="/app"
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-1.5 rounded-full px-7 text-base font-medium text-white",
                  "border-2 border-transparent",
                  "[background:linear-gradient(#6E11B0,#2E074A)_padding-box,linear-gradient(#2E074A,#6E11B0)_border-box]",
                  "shadow-[0_8px_32px_-8px_#6E11B0B3]",
                  "transition-transform hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                Get started
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-8 -bottom-8 top-1/3 rounded-[50%] bg-primary/25 blur-3xl"
            />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-2xl shadow-black/50">
              <img
                src="/landing/screenshot.png"
                alt="Chatvoice reading Twitch chat aloud with a live queue"
                className="block h-auto w-full"
                width={1600}
                height={1000}
              />
            </div>
          </div>
        </div>

        <BrowserSupportSection className="mt-10 sm:mt-12" />

        <section
          className="mt-24 flex w-full max-w-4xl flex-col items-center text-center sm:mt-28 md:mt-32"
          aria-labelledby="voice-assignment-heading"
        >
          <h2
            id="voice-assignment-heading"
            className={cn(
              "font-syne text-3xl font-bold tracking-tight text-balance sm:text-4xl",
              "animate-in fade-in slide-in-from-bottom-3 duration-700 delay-500 fill-mode-both"
            )}
          >
            Make them all unique
          </h2>
          <p
            className={cn(
              "mt-4 max-w-xl text-base text-pretty text-white/55 sm:text-lg",
              "animate-in fade-in slide-in-from-bottom-3 duration-700 delay-600 fill-mode-both"
            )}
          >
            You can assign or auto-assign voices to specific people in your chat,
            that way you can tell who's talking without looking away from your game.
          </p>

          <VoiceAssignmentDemo className="mt-10 w-full sm:mt-12" />
        </section>

        <FaqSection className="mt-24 sm:mt-28 md:mt-32" />
      </main>

      <div className="relative z-10">
        <LandingFooter />
      </div>
    </div>
  )
}
