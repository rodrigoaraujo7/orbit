import { describe, expect, it } from 'vitest'
import { TOOL_CATEGORY_LABEL } from './tool-category.ts'

describe('tool categories', () => {
  it('labels every category slug', () => {
    expect(Object.keys(TOOL_CATEGORY_LABEL).sort()).toEqual(
      [
        'ai',
        'analytics',
        'communication',
        'database',
        'deploy',
        'observability',
        'other',
        'payments',
      ].sort(),
    )
    expect(TOOL_CATEGORY_LABEL.deploy).toBe('Deploy & Hosting')
    expect(TOOL_CATEGORY_LABEL.other).toBe('Outra')
  })
})
