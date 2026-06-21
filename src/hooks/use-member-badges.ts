import * as React from "react"

import {
  type MemberBadge,
  loadMemberBadgeLookup,
} from "@/lib/member-badges"

export function useMemberBadges() {
  const [badgeByUserId, setBadgeByUserId] = React.useState<
    Map<string, MemberBadge>
  >(() => new Map())
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    void loadMemberBadgeLookup()
      .then((lookup) => {
        if (cancelled) {
          return
        }

        setBadgeByUserId(lookup)
        setReady(true)
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setBadgeByUserId(new Map())
        setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { badgeByUserId, ready }
}
