export const LIGHTS_ON_MS = 1800

export function lightsOnPower(elapsedMs: number, reduceMotion = false) {
  if (reduceMotion) return 1
  if (elapsedMs <= 0) return 0
  if (elapsedMs >= LIGHTS_ON_MS) return 1
  const t = elapsedMs / LIGHTS_ON_MS
  return 1 - (1 - t) ** 3
}

export function applyLightsOn(
  uniforms: { power: { value: number }; rayLength: { value: number } },
  elapsedMs: number,
  rayLength: number,
  reduceMotion = false,
) {
  const power = lightsOnPower(elapsedMs, reduceMotion)
  uniforms.power.value = power
  uniforms.rayLength.value = rayLength * (0.25 + 0.75 * power)
}
