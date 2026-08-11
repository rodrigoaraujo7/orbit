/**
 * Self-check de ordenação de tabela (ver table-sort.ts).
 * Roda com: pnpm check:table-sort
 */
import { nextSort, sortRows } from "./table-sort.ts"

const assert = {
  deepEqual(actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`esperado ${e}, recebido ${a}`)
  },
}

// ciclo de 3 estados na mesma coluna
assert.deepEqual(nextSort(null, "nome"), { key: "nome", direction: "asc" })
assert.deepEqual(nextSort({ key: "nome", direction: "asc" }, "nome"), {
  key: "nome",
  direction: "desc",
})
assert.deepEqual(nextSort({ key: "nome", direction: "desc" }, "nome"), null)

// trocar de coluna reinicia em asc
assert.deepEqual(nextSort({ key: "nome", direction: "desc" }, "valor"), {
  key: "valor",
  direction: "asc",
})

const rows = [
  { id: "a", nome: "Zeta", valor: 30 },
  { id: "b", nome: "Álvaro", valor: 10 },
  { id: "c", nome: "beta", valor: 20 },
]

// número: asc/desc
assert.deepEqual(
  sortRows(rows, { key: "valor", direction: "asc" }, (r) => r.valor).map((r) => r.id),
  ["b", "c", "a"]
)
assert.deepEqual(
  sortRows(rows, { key: "valor", direction: "desc" }, (r) => r.valor).map((r) => r.id),
  ["a", "c", "b"]
)

// texto: acento entra na ordem do pt-BR e case não separa os grupos
assert.deepEqual(
  sortRows(rows, { key: "nome", direction: "asc" }, (r) => r.nome).map((r) => r.id),
  ["b", "c", "a"]
)

// sem ordenação (ou coluna sem sortValue) devolve a ordem original
assert.deepEqual(sortRows(rows, null, (r) => r.valor).map((r) => r.id), ["a", "b", "c"])
assert.deepEqual(
  sortRows(rows, { key: "valor", direction: "asc" }, undefined).map((r) => r.id),
  ["a", "b", "c"]
)

// não muta o array de entrada
sortRows(rows, { key: "valor", direction: "desc" }, (r) => r.valor)
assert.deepEqual(rows.map((r) => r.id), ["a", "b", "c"])

console.log("table-sort: todos os checks passaram")
