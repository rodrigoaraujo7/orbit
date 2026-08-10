/**
 * Self-check de `paginate` (ver pagination.ts). Roda com: pnpm check:pagination
 */
import { paginate } from "./pagination.ts"

const assert = {
  deepEqual(actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`esperado ${e}, recebido ${a}`)
  },
}

const items = Array.from({ length: 25 }, (_, i) => i + 1)

// página 1 de 3 (25 itens, 10 por página)
assert.deepEqual(paginate(items, 1, 10), {
  pageItems: items.slice(0, 10),
  pageCount: 3,
  page: 1,
})

// última página, parcial
assert.deepEqual(paginate(items, 3, 10), {
  pageItems: items.slice(20, 25),
  pageCount: 3,
  page: 3,
})

// página além do total clampa pra última existente
assert.deepEqual(paginate(items, 99, 10), {
  pageItems: items.slice(20, 25),
  pageCount: 3,
  page: 3,
})

// página abaixo de 1 clampa pra 1
assert.deepEqual(paginate(items, 0, 10), {
  pageItems: items.slice(0, 10),
  pageCount: 3,
  page: 1,
})

// lista vazia: 1 página vazia, nunca zero páginas
assert.deepEqual(paginate([], 1, 10), { pageItems: [], pageCount: 1, page: 1 })

console.log("pagination: todos os checks passaram")
