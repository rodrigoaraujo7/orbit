import type { ComponentProps } from "react"

import { cn } from "./utils"

/**
 * Highlights an inline word/name (e.g. the item being deleted, or a section
 * still under construction): italic serif by default. Color/weight stay up to
 * the caller (`className`). Pass `italic={false}` when the surrounding copy
 * needs the regular face (e.g. the word "delete" before the name) — Instrument
 * Serif still slants at the normal weight, so turning italics off switches to
 * Instrument Sans instead of only dropping the class.
 */
export function Emphasis({
  className,
  italic = true,
  ...props
}: ComponentProps<"span"> & { italic?: boolean }) {
  return (
    <span
      className={cn(
        "font-bold",
        italic ? "font-heading italic tracking-wider text-[1.15em]" : "font-subtitle",
        className,
      )}
      {...props}
    />
  )
}
