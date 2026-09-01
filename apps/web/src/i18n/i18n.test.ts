import { describe, expect, it, vi } from 'vitest'
import { authErrorMessage } from '../lib/auth-errors.ts'
import { formatCurrency, formatDate } from '../lib/format.ts'
import i18n, { DEFAULT_LOCALE, getLocale, isLocale, setLocale } from './index.ts'
import enUS from './en-US.json' with { type: 'json' }
import ptBR from './pt-BR.json' with { type: 'json' }

function flatten(value: unknown, prefix = ''): string[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    )
  }
  return [prefix]
}

describe('i18n catalogs', () => {
  it('keeps en-US and pt-BR key trees in sync', () => {
    expect(DEFAULT_LOCALE).toBe('en-US')
    expect(flatten(enUS).sort()).toEqual(flatten(ptBR).sort())
  })

  it('switches language and formatters', async () => {
    await i18n.changeLanguage('en-US')
    expect(getLocale()).toBe('en-US')
    expect(i18n.t('nav.projects')).toBe('Projects')
    expect(authErrorMessage({ code: 'USER_ALREADY_EXISTS' }, 'fallback')).toBe(
      'This email is already in use',
    )
    expect(authErrorMessage({}, 'fallback')).toBe('fallback')
    expect(i18n.t('common.secretCount', { count: 1 })).toBe('1 secret')
    expect(i18n.t('common.secretCount', { count: 2 })).toBe('2 secrets')
    expect(formatDate('2026-09-05')).toBe('09/05/2026')
    expect(formatCurrency(18000.5, 'USD')).toBe('$18,000.50')

    setLocale('pt-BR')
    await i18n.changeLanguage('pt-BR')
    expect(getLocale()).toBe('pt-BR')
    expect(i18n.t('nav.projects')).toBe('Projetos')
    expect(formatDate('2026-09-05')).toBe('05/09/2026')

    await i18n.changeLanguage('en-US')
    expect(isLocale('en-US')).toBe(true)
    expect(isLocale('fr-FR')).toBe(false)
    i18n.language = 'fr-FR'
    expect(getLocale()).toBe('en-US')
    i18n.emit('languageChanged', 'not-a-locale')
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await i18n.changeLanguage('pt-BR')
    setItem.mockRestore()
    await i18n.changeLanguage('en-US')
  })
})
