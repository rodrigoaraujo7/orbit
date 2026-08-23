/**
 * Self-check of Kanban page filters (search, client, startedAt month range).
 * Run with: pnpm check:kanban-filter
 */
import type { Project } from "../data/projects.ts"
import { emptyKanbanFilters, matchesKanbanFilter } from "./kanban-filter.ts"

const assert = {
  equal(actual: unknown, expected: unknown, what: string) {
    if (actual !== expected) {
      throw new Error(`${what}: expected ${String(expected)}, got ${String(actual)}`)
    }
  },
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Landing Acme",
    clientId: "c1",
    status: "in-development",
    startedAt: "2026-03-10",
    deal: { kind: "upfront", amount: 0 },
    tools: [],
    repo: null,
    ...overrides,
  }
}

const acme = project()
const clientName = "Acme Ltda"

assert.equal(
  matchesKanbanFilter(acme, emptyKanbanFilters, clientName),
  true,
  "filtro vazio deixa passar"
)

assert.equal(
  matchesKanbanFilter(acme, { ...emptyKanbanFilters, search: "landing" }, clientName),
  true,
  "busca casa no nome do projeto"
)

assert.equal(
  matchesKanbanFilter(acme, { ...emptyKanbanFilters, search: "ltda" }, clientName),
  true,
  "busca casa no nome do cliente"
)

assert.equal(
  matchesKanbanFilter(acme, { ...emptyKanbanFilters, search: "outro" }, clientName),
  false,
  "busca que não casa em nada é recusada"
)

assert.equal(
  matchesKanbanFilter(acme, { ...emptyKanbanFilters, clientId: "c1" }, clientName),
  true,
  "cliente certo passa"
)

assert.equal(
  matchesKanbanFilter(acme, { ...emptyKanbanFilters, clientId: "c2" }, clientName),
  false,
  "cliente errado é recusado"
)

assert.equal(
  matchesKanbanFilter(acme, { ...emptyKanbanFilters, monthFrom: "2026-03" }, clientName),
  true,
  "mês de início no bound inferior passa"
)

assert.equal(
  matchesKanbanFilter(acme, { ...emptyKanbanFilters, monthFrom: "2026-04" }, clientName),
  false,
  "começou antes do bound inferior é recusado"
)

assert.equal(
  matchesKanbanFilter(acme, { ...emptyKanbanFilters, monthTo: "2026-03" }, clientName),
  true,
  "mês de início no bound superior passa"
)

assert.equal(
  matchesKanbanFilter(acme, { ...emptyKanbanFilters, monthTo: "2026-02" }, clientName),
  false,
  "começou depois do bound superior é recusado"
)

assert.equal(
  matchesKanbanFilter(
    acme,
    { search: "acme", clientId: "c1", monthFrom: "2026-01", monthTo: "2026-06" },
    clientName
  ),
  true,
  "os três filtros juntos ainda passam"
)

assert.equal(
  matchesKanbanFilter(acme, { ...emptyKanbanFilters, search: "  LANDING  " }, clientName),
  true,
  "busca ignora maiúsculas e espaços nas pontas"
)

console.log("kanban-filter: all checks passed")
