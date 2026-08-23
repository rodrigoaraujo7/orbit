import { useEffect, useState } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

/**
 * True when the system asks for less motion. The dashboard reads it to render
 * charts and counters at their final value instead of animating them in — the
 * numbers are the point, the animation is the garnish.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => matchMedia(QUERY).matches)

  useEffect(() => {
    const media = matchMedia(QUERY)
    const update = () => setReduced(media.matches)
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return reduced
}
