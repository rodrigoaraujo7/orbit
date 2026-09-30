export type PointerVars = {
  /** Pointer position inside the card, in px from the top-left corner. */
  x: number
  y: number
  /** Same position normalized to -1…1 from the card center, for parallax. */
  px: number
  py: number
}

type Box = Pick<DOMRect, "left" | "top" | "width" | "height">

function clamp(value: number, max: number) {
  return Math.min(Math.max(value, 0), max)
}

function normalize(value: number, size: number) {
  return size > 0 ? Number(((value / size) * 2 - 1).toFixed(3)) : 0
}

export function pointerVars(box: Box, clientX: number, clientY: number): PointerVars {
  const x = clamp(clientX - box.left, box.width)
  const y = clamp(clientY - box.top, box.height)
  return { x, y, px: normalize(x, box.width), py: normalize(y, box.height) }
}

export const POINTER_PROPERTIES = ["--mx", "--my", "--px", "--py"] as const

export function applyPointerVars(style: CSSStyleDeclaration, vars: PointerVars) {
  style.setProperty("--mx", `${vars.x}px`)
  style.setProperty("--my", `${vars.y}px`)
  style.setProperty("--px", String(vars.px))
  style.setProperty("--py", String(vars.py))
}

export function clearPointerVars(style: CSSStyleDeclaration) {
  for (const property of POINTER_PROPERTIES) style.removeProperty(property)
}
