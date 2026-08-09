/**
 * Self-check da lógica do schema (parsing de dinheiro, regras condicionais,
 * URL do repo). Roda com: pnpm check:schema
 */
import {
  emptyProjectForm,
  emptyToolForm,
  projectSchema,
  toProject,
  type ProjectFormValues,
  type ToolFormValues,
} from "./project-schema.ts"

// assert local em vez de node:assert — evita depender de @types/node num
// arquivo que vive junto do código de browser.
const assert = {
  deepEqual(actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`esperado ${e}, recebido ${a}`)
  },
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) {
      throw new Error(`esperado ${String(expected)}, recebido ${String(actual)}`)
    }
  },
}

function form(overrides: Partial<ProjectFormValues> = {}): ProjectFormValues {
  return { ...emptyProjectForm, name: "Projeto X", client: "Cliente Y", ...overrides }
}

/** Ferramenta válida por padrão — cada caso sobrescreve só o que testa. */
function tool(overrides: Partial<ToolFormValues> = {}): ToolFormValues {
  return { ...emptyToolForm, toolId: "aws", ...overrides }
}

function errorPaths(values: ProjectFormValues) {
  const result = projectSchema.safeParse(values)
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."))
}

// nome e cliente obrigatórios com mínimo de 2 chars
assert.deepEqual(
  errorPaths(form({ dealKind: "gratis", name: "A", client: "" })),
  ["name", "client"]
)

// grátis não exige valor nem parcelas
assert.deepEqual(errorPaths(form({ dealKind: "gratis" })), [])

// à vista exige valor > 0
assert.deepEqual(errorPaths(form({ dealKind: "a-vista" })), ["amount"])
assert.deepEqual(errorPaths(form({ dealKind: "a-vista", amount: "0" })), ["amount"])
assert.deepEqual(errorPaths(form({ dealKind: "a-vista", amount: "7200" })), [])

// parcelado exige valor E mínimo de 2 parcelas
assert.deepEqual(
  errorPaths(form({ dealKind: "parcelado", amount: "18000", installments: "1" })),
  ["installments"]
)
assert.deepEqual(
  errorPaths(form({ dealKind: "parcelado", amount: "18000", installments: "3" })),
  []
)

// formato pt-BR no valor
assert.deepEqual(errorPaths(form({ dealKind: "a-vista", amount: "18.000,50" })), [])
assert.equal(
  toProject(form({ dealKind: "a-vista", amount: "18.000,50" })).deal.amount,
  18000.5
)

// ferramenta: precisa escolher uma do catálogo
assert.deepEqual(
  errorPaths(form({ dealKind: "gratis", tools: [tool({ toolId: "" })] })),
  ["tools.0.toolId"]
)
assert.deepEqual(
  errorPaths(form({ dealKind: "gratis", tools: [tool({ toolId: "aws" })] })),
  []
)

// "Outra" exige nome livre
assert.deepEqual(
  errorPaths(form({ dealKind: "gratis", tools: [tool({ toolId: "outra" })] })),
  ["tools.0.customName"]
)
assert.deepEqual(
  errorPaths(
    form({
      dealKind: "gratis",
      tools: [tool({ toolId: "outra", customName: "TOTVS Protheus" })],
    })
  ),
  []
)

// valor zerado (o default), vazio ou "0,00" = grátis, sem exigir cobrança
assert.deepEqual(errorPaths(form({ dealKind: "gratis", tools: [tool()] })), [])
assert.deepEqual(
  errorPaths(form({ dealKind: "gratis", tools: [tool({ amount: "" })] })),
  []
)
assert.deepEqual(
  errorPaths(form({ dealKind: "gratis", tools: [tool({ amount: "0,00" })] })),
  []
)

// com valor, a data da fatura passa a ser obrigatória
assert.deepEqual(
  errorPaths(form({ dealKind: "gratis", tools: [tool({ amount: "340,50" })] })),
  ["tools.0.nextInvoice"]
)
assert.deepEqual(
  errorPaths(
    form({
      dealKind: "gratis",
      tools: [tool({ amount: "340,50", nextInvoice: "2026-09-05" })],
    })
  ),
  []
)

// valor inválido ou negativo é erro
assert.deepEqual(
  errorPaths(form({ dealKind: "gratis", tools: [tool({ amount: "abc" })] })),
  ["tools.0.amount"]
)
assert.deepEqual(
  errorPaths(form({ dealKind: "gratis", tools: [tool({ amount: "-5" })] })),
  ["tools.0.amount"]
)

// ferramenta zerada não gera billing
assert.equal(
  toProject(form({ dealKind: "gratis", tools: [tool()] })).tools[0].billing,
  undefined
)

// secret pela metade é erro; billing só existe quando é paga
assert.deepEqual(
  errorPaths(
    form({
      dealKind: "gratis",
      tools: [tool({ toolId: "aws", secrets: [{ key: "API_KEY", value: "" }] })],
    })
  ),
  ["tools.0.secrets.0.value"]
)

const paidTool = toProject(
  form({
    dealKind: "gratis",
    tools: [
      tool({
        toolId: "aws",
        amount: "340,50",
        nextInvoice: "2026-09-05",
        payer: "cliente",
      }),
    ],
  })
).tools[0]
assert.equal(paidTool.name, "AWS")
assert.equal(paidTool.category, "deploy")
assert.deepEqual(paidTool.billing, {
  amount: 340.5,
  cycle: "mensal",
  nextInvoice: "2026-09-05",
  payer: "cliente",
})

// "Outra" usa o nome livre e cai na categoria other, sem billing
const otherTool = toProject(
  form({
    dealKind: "gratis",
    tools: [tool({ toolId: "outra", customName: "TOTVS Protheus" })],
  })
).tools[0]
assert.equal(otherTool.name, "TOTVS Protheus")
assert.equal(otherTool.category, "other")
assert.equal(otherTool.billing, undefined)

// repo: vazio passa, não-github falha, github vira fullName normalizado
assert.deepEqual(errorPaths(form({ dealKind: "gratis", repoUrl: "" })), [])
assert.deepEqual(errorPaths(form({ dealKind: "gratis", repoUrl: "https://gitlab.com/a/b" })), [
  "repoUrl",
])
assert.deepEqual(errorPaths(form({ dealKind: "gratis", repoUrl: "não é url" })), ["repoUrl"])
assert.deepEqual(
  errorPaths(form({ dealKind: "gratis", repoUrl: "https://github.com/user/repo" })),
  []
)
assert.deepEqual(
  toProject(form({ dealKind: "gratis", repoUrl: "https://github.com/user/repo/" })).repo,
  { fullName: "user/repo", url: "https://github.com/user/repo", workflow: "none" }
)

// projeto sem repo fica null; conta vazia vira undefined
const created = toProject(
  form({ dealKind: "gratis", tools: [tool({ toolId: "vercel" })] })
)
assert.equal(created.repo, null)
assert.equal(created.tools[0].account, undefined)
assert.deepEqual(created.deal, { kind: "gratis" })

console.log("project-schema: todos os checks passaram")
