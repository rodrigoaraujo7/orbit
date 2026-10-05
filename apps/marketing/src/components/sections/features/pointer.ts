export type PointerVars = {
  /** Pointer position inside the card, in px from the top-left corner. */
  x: number
  y: number
  /** Horizontal position normalized to -1…1 from the card center. Drives the finance crosshair. */
  px: number
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
  return { x, y, px: normalize(x, box.width) }
}

/** Pointer position relative to a box, including points that fall outside it. */
export function spotlightPoint(box: Box, clientX: number, clientY: number) {
  return { x: clientX - box.left, y: clientY - box.top }
}

export function hoveredCard(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLElement>(".bento-card") : null
}

export const POINTER_PROPERTIES = ["--mx", "--my", "--px"] as const

export function applyPointerVars(style: CSSStyleDeclaration, vars: PointerVars) {
  style.setProperty("--mx", `${vars.x}px`)
  style.setProperty("--my", `${vars.y}px`)
  style.setProperty("--px", String(vars.px))
}

export function clearPointerVars(style: CSSStyleDeclaration) {
  for (const property of POINTER_PROPERTIES) style.removeProperty(property)
}

export function applySpotlight(style: CSSStyleDeclaration, point: { x: number; y: number }) {
  style.setProperty("--mx", `${point.x}px`)
  style.setProperty("--my", `${point.y}px`)
  style.setProperty("--glow", "1")
}

/** Hides the glow where it last was. Clearing the origin would slide it to the card center. */
export function fadeSpotlight(style: CSSStyleDeclaration) {
  style.setProperty("--glow", "0")
}
