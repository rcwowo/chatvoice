import changelogData from "../../changelog.json"

const APP_VERSION: string = __APP_VERSION__
const LAST_SEEN_KEY = "chatvoice::last-seen-version"

export type ChangelogEntry = {
  version: string
  date: string
  items: string[]
}

export const CHANGELOG: ChangelogEntry[] = changelogData

export function getAppVersion(): string {
  return APP_VERSION
}

/**
 * False on the first visit (no stored version) so the onboarding flow isn't
 * disrupted by the update toast.
 */
export function hasNewVersion(): boolean {
  const lastSeen = localStorage.getItem(LAST_SEEN_KEY)
  if (!lastSeen) return false // first visit – skip toast
  return lastSeen !== APP_VERSION
}

export function markVersionSeen(): void {
  localStorage.setItem(LAST_SEEN_KEY, APP_VERSION)
}

export function initLastSeenVersion(): void {
  if (!localStorage.getItem(LAST_SEEN_KEY)) {
    localStorage.setItem(LAST_SEEN_KEY, APP_VERSION)
  }
}
