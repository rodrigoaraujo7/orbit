/**
 * Self-check of project change history.
 * Run with: pnpm check:project-history
 */
import type { Project, Tool } from "../data/projects.ts"
import {
  formatHistoryEntry,
  projectChanges,
  recordProjectHistory,
  withProjectHistory,
} from "./project-history.ts"

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
    status: "queued",
    startedAt: "2026-01-10",
    deal: { kind: "upfront", amount: 0 },
    tools: [],
    repo: null,
    ...overrides,
  }
}

function tool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: "aws",
    name: "AWS",
    category: "other",
    secrets: [],
    ...overrides,
  }
}

function fields(
  entries: { field: string; from: string; to: string }[]
) {
  return entries.map(({ field, from, to }) => ({ field, from, to }))
}

assert.deepEqual(
  projectChanges(project(), project()),
  [],
  "sem mudança → sem histórico"
)

assert.deepEqual(
  projectChanges(
    project(),
    project({ comments: [{ id: "c1", author: "A", createdAt: "2026-08-20T10:00", body: "oi" }] })
  ),
  [],
  "comentário não entra no histórico"
)

assert.deepEqual(
  projectChanges(
    project({ repo: { fullName: "a/b", url: "https://github.com/a/b", workflow: "none" } }),
    project({ repo: { fullName: "a/b", url: "https://github.com/a/b", workflow: "success" } })
  ),
  [],
  "workflow do GitHub Actions não entra no histórico"
)

assert.deepEqual(
  projectChanges(project(), project({ status: "in-development" })),
  [{ field: "status", from: "queued", to: "in-development" }],
  "status gera uma linha"
)

assert.deepEqual(
  projectChanges(project(), project({ name: "Novo nome" })),
  [{ field: "name", from: "Projeto", to: "Novo nome" }],
  "nome gera uma linha"
)

assert.deepEqual(
  projectChanges(project({ description: "antes" }), project({ description: "depois" })),
  [{ field: "description", from: "antes", to: "depois" }],
  "descrição gera uma linha"
)

assert.deepEqual(
  projectChanges(project(), project({ description: "" })),
  [],
  "descrição vazia e ausente são a mesma coisa"
)

assert.deepEqual(
  projectChanges(project(), project({ clientId: "c2" })),
  [{ field: "clientId", from: "c1", to: "c2" }],
  "cliente gera uma linha"
)

assert.deepEqual(
  projectChanges(
    project(),
    project({ deal: { kind: "installment", amount: 18000, installments: 3, currency: "BRL" } })
  ),
  [{ field: "deal", from: "Grátis", to: "18000 BRL em 3x" }],
  "valor gera uma linha"
)

assert.deepEqual(
  projectChanges(project(), project({ tools: [tool()] })),
  [{ field: "tools", from: "—", to: "AWS" }],
  "ferramenta adicionada gera uma linha"
)

assert.deepEqual(
  projectChanges(
    project({ tools: [tool({ secrets: [{ key: "TOKEN", value: "old" }] })] }),
    project({ tools: [tool({ secrets: [{ key: "TOKEN", value: "new" }] })] })
  ),
  [{ field: "tools", from: "AWS", to: "AWS" }],
  "mudança de secret gera linha sem vazar o valor"
)

assert.deepEqual(
  projectChanges(
    project({ repo: null }),
    project({ repo: { fullName: "a/b", url: "https://github.com/a/b", workflow: "none" } })
  ),
  [{ field: "repo", from: "—", to: "a/b" }],
  "repositório gera uma linha"
)

assert.deepEqual(
  fields(projectChanges(project(), project({ name: "Novo", status: "paused" }))),
  [
    { field: "name", from: "Projeto", to: "Novo" },
    { field: "status", from: "queued", to: "paused" },
  ],
  "várias mudanças viram várias linhas"
)

const stamped = withProjectHistory(
  project({ history: [{ id: "h0", at: "2026-08-01T09:00", field: "name", from: "X", to: "Projeto" }] }),
  project({
    history: [{ id: "h0", at: "2026-08-01T09:00", field: "name", from: "X", to: "Projeto" }],
    status: "in-development",
  }),
  "2026-08-20T10:00"
)
assert.equal(stamped.history?.length, 2, "acumula no histórico existente")
assert.equal(stamped.history?.[1]?.field, "status", "nova linha no fim")
assert.equal(stamped.history?.[1]?.at, "2026-08-20T10:00", "usa o timestamp injetado")
assert.equal(stamped.status, "in-development", "mantém o projeto novo")

const commentsOnly = withProjectHistory(
  project(),
  project({ comments: [{ id: "c1", author: "A", createdAt: "2026-08-20T10:00", body: "oi" }] }),
  "2026-08-20T10:00"
)
assert.deepEqual(commentsOnly.comments, [
  { id: "c1", author: "A", createdAt: "2026-08-20T10:00", body: "oi" },
], "comentário continua no projeto")
assert.equal(commentsOnly.history, undefined, "comentário não cria history")

const recorded = recordProjectHistory(
  [project({ id: "a" }), project({ id: "b", status: "in-development" })],
  [project({ id: "b", status: "paused" }), project({ id: "a", status: "queued" })],
  "2026-08-20T11:00"
)
const a = recorded.find((p) => p.id === "a")
const b = recorded.find((p) => p.id === "b")
assert.equal(a?.history, undefined, "reorder/mesmo status não gera histórico")
assert.equal(b?.history?.length, 1, "status pelo kanban gera histórico")
assert.deepEqual(
  fields(b?.history ?? []),
  [{ field: "status", from: "in-development", to: "paused" }],
  "a linha é do projeto que mudou"
)

assert.equal(
  formatHistoryEntry({
    id: "h1",
    at: "2026-08-20T10:00",
    field: "status",
    from: "queued",
    to: "in-development",
  }),
  "Status: Na fila → Em desenvolvimento",
  "status usa o rótulo em português"
)
assert.equal(
  formatHistoryEntry({
    id: "h2",
    at: "2026-08-20T10:00",
    field: "name",
    from: "A",
    to: "B",
  }),
  "Nome: A → B",
  "nome mostra de → para"
)
assert.equal(
  formatHistoryEntry({
    id: "h3",
    at: "2026-08-20T10:00",
    field: "description",
    from: "longa demais para o log",
    to: "outra",
  }),
  "Descrição atualizada",
  "descrição não despeja o texto"
)

console.log("project-history: all checks passed")
