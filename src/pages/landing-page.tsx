import { Link } from "react-router-dom"
import { ArrowRightIcon } from "lucide-react"

import { BrowserSupportSection } from "@/components/landing/browser-support-section"
import { FaqSection } from "@/components/landing/faq-section"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingHeader } from "@/components/landing/landing-header"
import { VoiceAssignmentDemo } from "@/components/landing/voice-assignment-demo"
import { cn } from "@/lib/utils"

export function LandingPage() {
  return (
    <div className="dark relative flex min-h-svh flex-col overflow-x-hidden bg-black text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.18_302_/0.35),transparent_60%)]"
      />

      <LandingHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pt-16 pb-16 sm:pt-20 md:pt-24">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <h1
            className={cn(
              "w-full max-w-[740px] font-syne text-4xl font-bold tracking-tight text-balance sm:text-5xl sm:text-nowrap md:text-6xl",
              "animate-in duration-700 fill-mode-both fade-in slide-in-from-bottom-3"
            )}
          >
            Give your chat a voice!
          </h1>
          <p
            className={cn(
              "mt-5 max-w-xl text-base text-pretty text-white/55 sm:text-lg",
              "animate-in delay-100 duration-700 fill-mode-both fade-in slide-in-from-bottom-3"
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
            "animate-in delay-200 duration-1000 fill-mode-both fade-in slide-in-from-bottom-6"
          )}
        >
          <div className="relative mx-auto max-w-4xl">
            <div
              className={cn(
                "absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2",
                "animate-in delay-300 duration-700 fill-mode-both zoom-in-95 fade-in"
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
              className="pointer-events-none absolute -inset-x-8 top-1/3 -bottom-8 rounded-[50%] bg-primary/25 blur-3xl"
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
              "animate-in delay-500 duration-700 fill-mode-both fade-in slide-in-from-bottom-3"
            )}
          >
            Make them all unique
          </h2>
          <p
            className={cn(
              "mt-4 max-w-xl text-base text-pretty text-white/55 sm:text-lg",
              "animate-in delay-600 duration-700 fill-mode-both fade-in slide-in-from-bottom-3"
            )}
          >
            You can assign or auto-assign voices to specific people in your
            chat, that way you can tell who's talking without looking away from
            your game.
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
