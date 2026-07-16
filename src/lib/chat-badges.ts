import type { TwitchBadge, TwitchChatMessage } from "@/lib/twitch-chat"

type IvrBadgeVersion = {
  id: string
  image_url_1x: string
  image_url_2x?: string
  image_url_4x?: string
  title?: string
  description?: string
}

type IvrBadgeSet = {
  set_id: string
  versions?: IvrBadgeVersion[]
}

export type TwitchBadgeCatalogEntry = {
  set: string
  version: string
  imageUrl: string
  title: string
}

export type TwitchBadgeCatalog = Map<string, TwitchBadgeCatalogEntry>

const GLOBAL_BADGES_URL = "https://api.ivr.fi/v2/twitch/badges/global"

let globalBadgeSetsPromise: Promise<IvrBadgeSet[]> | null = null

export function createEmptyBadgeCatalog(): TwitchBadgeCatalog {
  return new Map()
}

export function badgeCatalogKey(set: string, version: string) {
  return `${set}/${version}`
}

export async function fetchTwitchBadgeCatalog(
  channelLogin: string
): Promise<TwitchBadgeCatalog> {
  const login = normalizeChannelLogin(channelLogin)
  const [globalResult, channelResult] = await Promise.allSettled([
    fetchGlobalBadgeSets(),
    fetchJson<IvrBadgeSet[]>(
      `https://api.ivr.fi/v2/twitch/badges/channel?login=${encodeURIComponent(login)}`
    ),
  ])

  const catalog = createEmptyBadgeCatalog()

  if (globalResult.status === "fulfilled") {
    mergeBadgeSets(catalog, globalResult.value)
  }

  if (channelResult.status === "fulfilled") {
    // Channel sets override global for the same set/version (subs, bits, etc.).
    mergeBadgeSets(catalog, channelResult.value)
  }

  if (
    globalResult.status !== "fulfilled" &&
    channelResult.status !== "fulfilled"
  ) {
    throw new Error("Failed to load Twitch badges")
  }

  return catalog
}

export function hydrateMessageBadges(
  message: TwitchChatMessage,
  catalog: TwitchBadgeCatalog | null
): TwitchChatMessage {
  if (message.badges.length === 0) {
    return message
  }

  if (!catalog) {
    return {
      ...message,
      badges: message.badges.map(({ set, version }) => ({ set, version })),
    }
  }

  return {
    ...message,
    badges: message.badges.map((badge) => resolveBadge(badge, catalog)),
  }
}

function resolveBadge(
  badge: TwitchBadge,
  catalog: TwitchBadgeCatalog
): TwitchBadge {
  const entry = catalog.get(badgeCatalogKey(badge.set, badge.version))
  if (!entry) {
    return { set: badge.set, version: badge.version }
  }

  return {
    set: badge.set,
    version: badge.version,
    imageUrl: entry.imageUrl,
    title: entry.title,
  }
}

function mergeBadgeSets(catalog: TwitchBadgeCatalog, sets: IvrBadgeSet[]) {
  for (const badgeSet of sets) {
    for (const version of badgeSet.versions ?? []) {
      if (!badgeSet.set_id || !version.id || !version.image_url_1x) {
        continue
      }

      catalog.set(badgeCatalogKey(badgeSet.set_id, version.id), {
        set: badgeSet.set_id,
        version: version.id,
        imageUrl: version.image_url_1x,
        title: version.title?.trim() || badgeSet.set_id,
      })
    }
  }
}

async function fetchGlobalBadgeSets(): Promise<IvrBadgeSet[]> {
  if (!globalBadgeSetsPromise) {
    globalBadgeSetsPromise = fetchJson<IvrBadgeSet[]>(GLOBAL_BADGES_URL).catch(
      (error) => {
        globalBadgeSetsPromise = null
        throw error
      }
    )
  }

  return globalBadgeSetsPromise
}

function normalizeChannelLogin(channel: string) {
  return channel.trim().replace(/^#/, "").toLowerCase()
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return (await response.json()) as T
}
