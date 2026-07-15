import { useState } from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const FAQ_ITEMS = [
  {
    question: "What is Chatvoice?",
    answer:
      "Chatvoice is a webapp that utilizes your browser's built-in speechsynthesis capabilities to read your Twitch chat aloud. It's designed to help both streamers and viewers listen to the chat without having to look away from their game or activity.",
  },
  {
    question: "How does it work?",
    answer:
      "Your browser most likely has a built-in process to convert text into speech. Chatvoice utilizes this process by queuing up messages from a specific Twitch channel and reading them as they come in. You can assign or auto-assign specific voices profiles to different chatters, so you can tell who's talking without looking away from your game.",
  },
  {
    question: "Do I need to login to use Chatvoice?",
    answer:
    "No! Chatvoice connects to Twitch anonymously via IRC, meaning you can connect to any channel. All of your data, like settings and voice assignments are stored locally in your browser - and you can backup or restore them at any point via a JSON file.",
  },
  {
    question: "Why do you recommend Chrome or Edge?",
    answer:
      "While almost all modern browsers support speech synthesis, not all of them have many voices available. Chrome and Edge tend to have the most voices across multiple different languages. In the cases of Chrome and Edge, it's due to the fact that both Google and Microsoft have cloud text-to-speech services.",
  },
  {
    question: "How does it compare to Speechchat?",
    answer:
      "Speechchat is a webapp what inspired the creation of Chatvoice. The main difference is that Chatvoice allows you to assign or auto-assign specific voices to different chatters, whereas Speechchat only uses one voice for all chatters.",
  }
] as const

export function FaqSection({ className }: { className?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section
      className={cn(
        "flex w-full max-w-3xl flex-col items-center text-center",
        className
      )}
      aria-labelledby="faq-heading"
    >
      <h2
        id="faq-heading"
        className={cn(
          "font-syne text-3xl font-bold tracking-tight text-balance sm:text-4xl",
          "animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both"
        )}
      >
        Frequently Asked Questions
      </h2>

      <div
        className={cn(
          "mt-10 w-full text-left sm:mt-12",
          "animate-in fade-in slide-in-from-bottom-3 duration-700 delay-200 fill-mode-both"
        )}
      >
        {FAQ_ITEMS.map((item, index) => {
          const open = openIndex === index
          const panelId = `faq-panel-${index}`
          const buttonId = `faq-button-${index}`

          return (
            <div
              key={item.question}
              className="border-b border-white/10 first:border-t"
            >
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-white/90 sm:py-5"
                >
                  <span className="font-syne text-base font-semibold tracking-tight sm:text-lg">
                    {item.question}
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "size-4 shrink-0 text-white/45 transition-transform duration-200",
                      open && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                aria-hidden={!open}
                inert={!open ? true : undefined}
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="pb-4 text-sm text-pretty text-white/55 sm:pb-5 sm:text-base">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
