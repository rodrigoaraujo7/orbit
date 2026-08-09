import { useEffect, useState } from "react"

export type Theme = "light" | "dark"

const STORAGE_KEY = "pm-theme"

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "light" || stored === "dark") return stored
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/**
 * Tema persistido em localStorage, com fallback pro sistema.
 * O primeiro paint é resolvido pelo script inline no index.html.
 *
 * ponytail: state local, não context — só a topbar consome. Se um segundo
 * componente precisar do tema, promover pra context ou useSyncExternalStore.
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
