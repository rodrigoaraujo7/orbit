import { useEffect, useState } from "react"

import { useDebouncedValue } from "../use-debounced-value/index.ts"

/**
 * Local text while typing; commits to the URL (or other store) after debounce.
 * Incoming `urlValue` wins on back/forward.
 */
export function useDraftSearch(
  urlValue: string | undefined,
  commit: (value: string | undefined) => void,
) {
  const [draft, setDraft] = useState(urlValue ?? "")
  const debounced = useDebouncedValue(draft)

  useEffect(() => {
    setDraft(urlValue ?? "")
  }, [urlValue])

  useEffect(() => {
    const next = debounced.trim() || undefined
    const current = urlValue?.trim() || undefined
    if (next !== current) commit(next)
  }, [commit, debounced, urlValue])

  return [draft, setDraft] as const
}
