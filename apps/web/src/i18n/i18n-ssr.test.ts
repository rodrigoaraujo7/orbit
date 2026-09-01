// @vitest-environment node
import { describe, expect, it } from 'vitest'
import i18n, { getLocale } from './index.ts'

describe('i18n without a window', () => {
  it('falls back to the default locale', async () => {
    expect(getLocale() === 'en-US' || getLocale() === 'pt-BR').toBe(true)
    expect(i18n.isInitialized).toBe(true)
    await i18n.changeLanguage('pt-BR')
    await i18n.changeLanguage('en-US')
    i18n.emit('languageChanged', 'not-a-locale')
  })
})
