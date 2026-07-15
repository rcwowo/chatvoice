export type BrowserSupportTier = "loading" | "unsupported" | "limited" | "ready"

/** Voice count below this is treated as limited browser support. */
export const BROWSER_SUPPORT_LIMITED_THRESHOLD = 10

export function getBrowserSupportTier(
  loading: boolean,
  voiceCount: number
): BrowserSupportTier {
  if (loading) return "loading"
  if (voiceCount === 0) return "unsupported"
  if (voiceCount < BROWSER_SUPPORT_LIMITED_THRESHOLD) return "limited"
  return "ready"
}

export function getBrowserSupportCopy(
  tier: Exclude<BrowserSupportTier, "loading">,
  voiceCount: number
): { title: string; body: string } {
  if (tier === "unsupported") {
    return {
      title: "Your browser isn't supported.",
      body: "We couldn't find any voices. You may want to try Chrome or Edge for the best support across multiple languages.",
    }
  }

  if (tier === "limited") {
    return {
      title: "Partially supported.",
      body: `Your browser only has ${voiceCount} voice${voiceCount === 1 ? "" : "s"}. You may want to try Chrome or Edge for the best experience.`,
    }
  }

  return {
    title: "Fully supported.",
    body: `Your browser has ${voiceCount} voices. Plenty of voices are available to use in this browser.`,
  }
}
