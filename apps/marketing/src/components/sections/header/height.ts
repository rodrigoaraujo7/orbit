const HEADER_HEIGHT_PROPERTY = "--marketing-header-height"

export function bindMarketingHeaderHeight(header: HTMLElement | null) {
  if (!header) return
  const syncHeight = () => {
    document.documentElement.style.setProperty(HEADER_HEIGHT_PROPERTY, `${header.offsetHeight}px`)
  }
  syncHeight()
  if (typeof ResizeObserver === "undefined") return
  const observer = new ResizeObserver(syncHeight)
  observer.observe(header)
  return () => {
    observer.disconnect()
    document.documentElement.style.removeProperty(HEADER_HEIGHT_PROPERTY)
  }
}
