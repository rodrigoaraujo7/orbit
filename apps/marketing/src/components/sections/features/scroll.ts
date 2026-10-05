/** Below the `lg` breakpoint there is no hover, so scroll owns the illustration. */
export const SCROLL_ACTIVATION_QUERY = "(max-width: 1023px)"

/**
 * Share of the card that must be on screen. Low enough that a card slightly
 * taller than a phone still crosses it, high enough that a sliver does not.
 */
export const SCROLL_ACTIVATION_THRESHOLD = 0.35

export function usesScrollActivation() {
  return (
    typeof window.matchMedia === "function" && window.matchMedia(SCROLL_ACTIVATION_QUERY).matches
  )
}

export function applyScrollActivation(node: HTMLElement, active: boolean) {
  if (active) node.dataset.active = ""
  else delete node.dataset.active
}

/** Watches a card on small screens and plays its illustration while it is in view. */
export function bindScrollActivation(node: HTMLElement | null) {
  if (!node || typeof window.matchMedia !== "function") return () => undefined

  const query = window.matchMedia(SCROLL_ACTIVATION_QUERY)
  let observer: IntersectionObserver | undefined

  const connect = () => {
    observer?.disconnect()
    observer = undefined
    if (!query.matches || typeof IntersectionObserver === "undefined") {
      applyScrollActivation(node, false)
      return
    }
    observer = new IntersectionObserver(
      ([entry]) =>
        applyScrollActivation(node, (entry?.intersectionRatio ?? 0) >= SCROLL_ACTIVATION_THRESHOLD),
      { threshold: SCROLL_ACTIVATION_THRESHOLD },
    )
    observer.observe(node)
  }

  connect()
  query.addEventListener("change", connect)
  return () => {
    query.removeEventListener("change", connect)
    observer?.disconnect()
  }
}
