import { Link } from "react-router-dom"

import iconSrc from "/branding/icon.png"
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

export function LandingHeader() {
  return (
    <header className="relative z-10 flex justify-center px-4 pt-6 sm:pt-8">
      <nav
        className={cn(
          "flex w-full max-w-xs items-center justify-between rounded-full border border-white/10 bg-white/5 px-3 py-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-md sm:max-w-sm",
          "animate-in duration-700 fade-in slide-in-from-top-2"
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
  )
}
