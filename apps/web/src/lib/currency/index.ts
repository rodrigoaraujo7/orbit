export { CURRENCIES, DEFAULT_CURRENCY } from 'shared'

import { CURRENCIES } from 'shared'

import { getLocale } from '../../i18n/index.ts'

export function getCurrencyOptions() {
  const locale = getLocale()
  const currencyNames = new Intl.DisplayNames([locale], { type: 'currency' })
  return CURRENCIES.map((code) => ({
    value: code,
    label: `${code} · ${currencyNames.of(code)}`,
  }))
}
