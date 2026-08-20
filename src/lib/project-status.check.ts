/**
 * Self-check of status transitions and Kanban grouping.
 * Run with: pnpm check:project-status
 */
import type { Project } from "../data/projects.ts"
import { todayIso } from "./dates.ts"
import {
  columnsEqual,
  groupProjectsByStatus,
  isProjectStatus,
  moveProjectInList,
  placeProjectInColumns,
  projectIdsByStatus,
  projectsFromColumns,
  withProjectStatus,
} from "./project-status.ts"

const assert = {
  equal(actual: unknown, expected: unknown, what: string) {
    if (actual !== expected) {
      throw new Error(`${what}: expected ${String(expected)}, got ${String(actual)}`)
    }
  },
  deepEqual(actual: unknown, expected: unknown, what: string) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`${what}: expected ${e}, got ${a}`)
  },
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Projeto",
    clientId: "c1",
    status: "in-development",
    startedAt: "2026-01-10",
    deal: { kind: "upfront", amount: 0 },
    tools: [],
    repo: null,
    ...overrides,
  }
}

assert.equal(isProjectStatus("in-validation"), true, "status novo é válido")
assert.equal(isProjectStatus("nope"), false, "string qualquer não é status")

const completed = withProjectStatus(project(), "completed")
assert.equal(completed.status, "completed", "marca como concluído")
assert.equal(completed.endedAt, todayIso(), "stampa endedAt com hoje")

const alreadyEnded = withProjectStatus(
  project({ status: "completed", endedAt: "2025-11-30" }),
  "completed"
)
assert.equal(alreadyEnded.endedAt, "2025-11-30", "não sobrescreve endedAt existente")

const reopened = withProjectStatus(
  project({ status: "completed", endedAt: "2025-11-30" }),
  "in-development"
)
assert.equal(reopened.status, "in-development", "reabre o projeto")
assert.equal(reopened.endedAt, undefined, "limpa endedAt ao sair de concluído")

const validating = withProjectStatus(project(), "in-validation")
assert.equal(validating.status, "in-validation", "vai para em validação")
assert.equal(validating.endedAt, undefined, "validação não termina o projeto")

const grouped = groupProjectsByStatus([
  project({ id: "q1", status: "queued" }),
  project({ id: "d1", status: "in-development" }),
  project({ id: "d2", status: "in-development" }),
  project({ id: "v1", status: "in-validation" }),
])
assert.deepEqual(
  grouped.queued.map((p) => p.id),
  ["q1"],
  "agrupa na fila"
)
assert.deepEqual(
  grouped["in-development"].map((p) => p.id),
  ["d1", "d2"],
  "preserva a ordem original na coluna"
)
assert.deepEqual(grouped.paused.map((p) => p.id), [], "coluna vazia fica []")
assert.deepEqual(
  grouped["in-validation"].map((p) => p.id),
  ["v1"],
  "agrupa em validação"
)
assert.deepEqual(grouped.completed.map((p) => p.id), [], "concluído vazio")

const column = [
  project({ id: "a", status: "queued" }),
  project({ id: "b", status: "queued" }),
  project({ id: "c", status: "queued" }),
  project({ id: "d", status: "in-development" }),
]

assert.deepEqual(
  groupProjectsByStatus(moveProjectInList(column, "a", "queued", 2)).queued.map(
    (p) => p.id
  ),
  ["b", "c", "a"],
  "reordena para o fim da mesma coluna"
)
assert.deepEqual(
  groupProjectsByStatus(moveProjectInList(column, "c", "queued", 0)).queued.map(
    (p) => p.id
  ),
  ["c", "a", "b"],
  "reordena para o topo da mesma coluna"
)
assert.deepEqual(
  groupProjectsByStatus(moveProjectInList(column, "a", "queued", 1)).queued.map(
    (p) => p.id
  ),
  ["b", "a", "c"],
  "reordena para o meio da mesma coluna"
)

const toDev = moveProjectInList(column, "a", "in-development", 0)
assert.deepEqual(
  groupProjectsByStatus(toDev).queued.map((p) => p.id),
  ["b", "c"],
  "sai da coluna de origem"
)
assert.deepEqual(
  groupProjectsByStatus(toDev)["in-development"].map((p) => p.id),
  ["a", "d"],
  "entra no índice da coluna de destino"
)
assert.equal(toDev.find((p) => p.id === "a")?.status, "in-development", "muda o status")

const toEmpty = moveProjectInList(column, "d", "paused", 0)
assert.deepEqual(
  groupProjectsByStatus(toEmpty).paused.map((p) => p.id),
  ["d"],
  "coluna vazia recebe o card"
)
assert.equal(
  toEmpty.find((p) => p.id === "d")?.status,
  "paused",
  "status acompanha a coluna vazia"
)

const finished = moveProjectInList(column, "d", "completed", 0)
assert.equal(
  finished.find((p) => p.id === "d")?.endedAt,
  todayIso(),
  "concluir pelo move também stampa endedAt"
)

const ids = projectIdsByStatus(column)
assert.deepEqual(ids.queued, ["a", "b", "c"], "ids por coluna")

const beforeD = placeProjectInColumns(ids, "a", "in-development", "d")
assert.deepEqual(beforeD.queued, ["b", "c"], "sai da origem ao posicionar")
assert.deepEqual(
  beforeD["in-development"],
  ["a", "d"],
  "entra antes do card alvo"
)

const atEnd = placeProjectInColumns(ids, "a", "in-development", null)
assert.deepEqual(atEnd["in-development"], ["d", "a"], "null = vai para o fim")

const sameCol = placeProjectInColumns(ids, "a", "queued", "c")
assert.deepEqual(sameCol.queued, ["b", "a", "c"], "antes de c na mesma coluna")

assert.equal(
  columnsEqual(ids, placeProjectInColumns(ids, "a", "queued", "b")),
  true,
  "inserir antes do vizinho da frente é no-op"
)

const committed = projectsFromColumns(column, beforeD)
assert.equal(committed.find((p) => p.id === "a")?.status, "in-development", "commit aplica o status")
assert.deepEqual(
  groupProjectsByStatus(committed)["in-development"].map((p) => p.id),
  ["a", "d"],
  "commit preserva a ordem das colunas"
)

console.log("project-status: all checks passed")
