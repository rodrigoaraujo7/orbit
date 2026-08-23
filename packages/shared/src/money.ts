/** Accepts "18000" and "18.000,50" (pt-BR format). */
export function parseAmount(raw: string): number | null {
  if (!raw) return null
  const normalized = raw.replace(/\./g, "").replace(",", ".")
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/**
 * A tool/project is paid when it has an amount greater than zero — empty, "0"
 * and "0,00" are all free.
 */
export function hasPositiveAmount(amount: string): boolean {
  const value = parseAmount(amount)
  return value != null && value > 0
}

/** Decimal currency units (reais, dollars) → integer cents. */
export function toCents(amount: number): bigint {
  return BigInt(Math.round(amount * 100))
}

export function fromCents(cents: bigint): number {
  return Number(cents) / 100
}
