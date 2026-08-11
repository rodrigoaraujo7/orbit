/**
 * Self-check of `paginate` (see pagination.ts). Run with: pnpm check:pagination
 */
import { paginate } from "./pagination.ts"

const assert = {
  deepEqual(actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`expected ${e}, got ${a}`)
  },
}

const items = Array.from({ length: 25 }, (_, i) => i + 1)

// page 1 of 3 (25 items, 10 per page)
assert.deepEqual(paginate(items, 1, 10), {
  pageItems: items.slice(0, 10),
  pageCount: 3,
  page: 1,
})

// last page, partial
assert.deepEqual(paginate(items, 3, 10), {
  pageItems: items.slice(20, 25),
  pageCount: 3,
  page: 3,
})

// a page past the total clamps to the last existing one
assert.deepEqual(paginate(items, 99, 10), {
  pageItems: items.slice(20, 25),
  pageCount: 3,
  page: 3,
})

// a page below 1 clamps to 1
assert.deepEqual(paginate(items, 0, 10), {
  pageItems: items.slice(0, 10),
  pageCount: 3,
  page: 1,
})

// empty list: 1 empty page, never zero pages
assert.deepEqual(paginate([], 1, 10), { pageItems: [], pageCount: 1, page: 1 })

console.log("pagination: all checks passed")
