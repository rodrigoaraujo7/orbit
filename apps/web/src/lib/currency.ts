export { CURRENCIES, DEFAULT_CURRENCY } from "shared"

// Intl.DisplayNames localizes the currency name to pt-BR natively — no
// hand-maintained translation dictionary.
import { CURRENCIES } from "shared"

const currencyNames = new Intl.DisplayNames(["pt-BR"], { type: "currency" })

export const currencyOptions = CURRENCIES.map((code) => ({
  value: code,
  label: `${code} · ${currencyNames.of(code)}`,
}))
