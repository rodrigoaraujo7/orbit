import { describe, expect, it } from 'vitest'
import { cn } from './utils.ts'

describe('cn', () => {
  it('merges tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-red-500', false && 'hidden', 'font-bold')).toContain('font-bold')
  })
})
