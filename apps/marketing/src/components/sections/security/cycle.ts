export const SECURITY_KEYS = ["isolation", "encryption", "emailCode"] as const
export type SecurityKey = (typeof SECURITY_KEYS)[number]

/** How long each control stays selected before the console advances. */
export const SECURITY_CYCLE_MS = 7000

export function stepSecurityKey(current: SecurityKey, direction: 1 | -1): SecurityKey {
  const index = SECURITY_KEYS.indexOf(current)
  const next = (index + direction + SECURITY_KEYS.length) % SECURITY_KEYS.length
  return SECURITY_KEYS[next]!
}

/** Arrow keys move the selection. Home and End jump to the ends. Other keys do nothing. */
export function securityKeyFromKey(current: SecurityKey, key: string): SecurityKey | null {
  if (key === "ArrowDown" || key === "ArrowRight") return stepSecurityKey(current, 1)
  if (key === "ArrowUp" || key === "ArrowLeft") return stepSecurityKey(current, -1)
  if (key === "Home") return SECURITY_KEYS[0]
  if (key === "End") return SECURITY_KEYS[SECURITY_KEYS.length - 1]!
  return null
}

export function focusSecurityTab(list: ParentNode, key: SecurityKey) {
  const tab = list.querySelector<HTMLElement>(`#security-tab-${key}`)
  if (!tab) return
  tab.focus()
}

/** True when focus moved to a node still inside the console, so autoplay stays paused. */
export function focusStaysInside(current: Node, target: EventTarget | null) {
  return target instanceof Node && current.contains(target)
}
