import { useEffect, useState } from "react"

export type Theme = "light" | "dark"

const STORAGE_KEY = "pm-theme"

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "light" || stored === "dark") return stored
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/**
 * Theme persisted in localStorage, falling back to the system preference.
 * The first paint is handled by the inline script in index.html.
 *
 * ponytail: local state, not context — only the topbar consumes it. If a second
 * component needs the theme, promote it to context or useSyncExternalStore.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return {
    theme,
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  }
}
