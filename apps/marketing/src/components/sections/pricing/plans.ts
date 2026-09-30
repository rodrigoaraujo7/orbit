export const PRO_MONTHLY_USD = 20
export const PRO_YEARLY_USD = 16

export type BillingInterval = "monthly" | "yearly"

/** Pro's displayed monthly amount. Yearly billing uses the discounted rate. */
export function proMonthlyAmount(interval: BillingInterval): number {
  return interval === "yearly" ? PRO_YEARLY_USD : PRO_MONTHLY_USD
}

export function yearlyDiscountPercent(): number {
  return Math.round((1 - PRO_YEARLY_USD / PRO_MONTHLY_USD) * 100)
}

export function yearlyTotalUsd(): number {
  return PRO_YEARLY_USD * 12
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

/** Arrow keys move a two-option billing radiogroup. Other keys do nothing. */
export function intervalFromKey(key: string): BillingInterval | null {
  if (key === "ArrowRight" || key === "ArrowDown") return "yearly"
  if (key === "ArrowLeft" || key === "ArrowUp") return "monthly"
  return null
}
