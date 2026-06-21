const MEMBER_BADGES_URL = "https://api.rcw.lol/members/badges"
const MEMBER_LIST_URL = "https://api.rcw.lol/members/list"

export type MemberBadge = {
  id: number
  name: string
  description: string
  image: string
}

export type MemberBadgeAssignment = {
  userId: string
  badge: string | null
}

export async function fetchMemberBadges(): Promise<MemberBadge[]> {
  const response = await fetch(MEMBER_BADGES_URL)
  if (!response.ok) {
    throw new Error(`Failed to load member badges (${response.status})`)
  }

  return response.json() as Promise<MemberBadge[]>
}

export async function fetchMemberBadgeAssignments(): Promise<
  MemberBadgeAssignment[]
> {
  const response = await fetch(MEMBER_LIST_URL)
  if (!response.ok) {
    throw new Error(`Failed to load member badge list (${response.status})`)
  }

  return response.json() as Promise<MemberBadgeAssignment[]>
}

export function buildMemberBadgeLookup(
  badges: MemberBadge[],
  assignments: MemberBadgeAssignment[]
): Map<string, MemberBadge> {
  const badgesById = new Map(badges.map((badge) => [String(badge.id), badge]))
  const lookup = new Map<string, MemberBadge>()

  for (const assignment of assignments) {
    if (assignment.badge == null) {
      continue
    }

    const badge = badgesById.get(String(assignment.badge))
    if (badge) {
      lookup.set(assignment.userId, badge)
    }
  }

  return lookup
}

export async function loadMemberBadgeLookup(): Promise<
  Map<string, MemberBadge>
> {
  const [badges, assignments] = await Promise.all([
    fetchMemberBadges(),
    fetchMemberBadgeAssignments(),
  ])

  return buildMemberBadgeLookup(badges, assignments)
}
