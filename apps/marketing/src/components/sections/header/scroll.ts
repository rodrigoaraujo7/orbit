const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

type InPageNavClick = {
  defaultPrevented: boolean
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  currentTarget: { getAttribute(name: string): string | null }
  preventDefault(): void
}

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/**
 * Same-page nav clicks. `scrollIntoView` honors each section's `scroll-mt-24`,
 * so the sticky header stays clear of the heading. Reduced motion scrolls instantly.
 */
export function followInPageNav(event: InPageNavClick) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }

  const href = event.currentTarget.getAttribute("href")
  if (!href?.startsWith("#")) return

  const target = document.getElementById(href.slice(1))
  if (!target) return

  target.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  })
  window.history.pushState(null, "", href)
  event.preventDefault()
}
