import { describe, expect, it } from 'vitest'
import { paginate } from './index'

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1)

  it('slices pages and clamps out-of-range requests', () => {
    expect(paginate(items, 1, 10)).toEqual({
      pageItems: items.slice(0, 10),
      pageCount: 3,
      page: 1,
    })
    expect(paginate(items, 3, 10)).toEqual({
      pageItems: items.slice(20, 25),
      pageCount: 3,
      page: 3,
    })
    expect(paginate(items, 99, 10).page).toBe(3)
    expect(paginate(items, 0, 10).page).toBe(1)
    expect(paginate([], 1, 10)).toEqual({ pageItems: [], pageCount: 1, page: 1 })
  })
})
