import { useEffect, useState } from "react"

const QUERY = "(max-width: 767px)"

/** True below Tailwind `md` (768px). */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => matchMedia(QUERY).matches)

  useEffect(() => {
    const media = matchMedia(QUERY)
    const update = () => setIsMobile(media.matches)
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return isMobile
}
