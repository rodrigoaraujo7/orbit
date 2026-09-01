/** Accepts "18000". With `pt-BR`, also "18.000,50"; with `en-US`, "18,000.50". */
export type AmountLocale = "en-US" | "pt-BR"

export function parseAmount(raw: string, locale: AmountLocale = "pt-BR"): number | null {
  if (!raw) return null
  const normalized =
    locale === "en-US" ? raw.replace(/,/g, "") : raw.replace(/\./g, "").replace(",", ".")
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/**
 * A tool/project is paid when it has an amount greater than zero — empty, "0"
 * and "0,00"/"0.00" are all free.
 */
export function hasPositiveAmount(amount: string, locale: AmountLocale = "pt-BR"): boolean {
  const value = parseAmount(amount, locale)
  return value != null && value > 0
}

/** Decimal currency units (reais, dollars) → integer cents. */
export function toCents(amount: number): bigint {
  return BigInt(Math.round(amount * 100))
}

export function fromCents(cents: bigint): number {
  return Number(cents) / 100
}
