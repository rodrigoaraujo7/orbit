/**
 * Self-check da lógica do schema (parsing de dinheiro, regras condicionais,
 * URL do repo). Roda com: pnpm check:schema
 */
import {
  emptyProjectForm,
  emptyToolForm,
  fromProject,
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

// dealKind "a-vista" + amount "0" (os defaults de emptyProjectForm) já
// representam "grátis" — não existe mais um kind separado pra isso.
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
assert.deepEqual(errorPaths(form({ name: "A", client: "" })), ["name", "client"])

// valor zerado (o default) = projeto grátis, sem exigir cobrança
assert.deepEqual(errorPaths(form()), [])

// valor positivo é válido em qualquer cobrança, zero e vazio também (grátis)
assert.deepEqual(errorPaths(form({ dealKind: "a-vista" })), [])
assert.deepEqual(errorPaths(form({ dealKind: "a-vista", amount: "0" })), [])
assert.deepEqual(errorPaths(form({ dealKind: "a-vista", amount: "7200" })), [])

// parcelado só exige mínimo de 2 parcelas quando é pago (valor > 0)
assert.deepEqual(
  errorPaths(form({ dealKind: "parcelado", amount: "18000", installments: "1" })),
  ["installments"]
)
assert.deepEqual(
  errorPaths(form({ dealKind: "parcelado", amount: "18000", installments: "3" })),
  []
)
// parcelado grátis (valor zerado) não exige parcelas
assert.deepEqual(
  errorPaths(form({ dealKind: "parcelado", amount: "0", installments: "1" })),
  []
)

// formato pt-BR no valor
assert.deepEqual(errorPaths(form({ dealKind: "a-vista", amount: "18.000,50" })), [])
assert.equal(
  toProject(form({ dealKind: "a-vista", amount: "18.000,50" })).deal.amount,
  18000.5
)

// valor do deal inválido ou negativo é erro (mesma regra das ferramentas)
assert.deepEqual(errorPaths(form({ amount: "abc" })), ["amount"])
assert.deepEqual(errorPaths(form({ amount: "-5" })), ["amount"])

// ferramenta: precisa escolher uma do catálogo
assert.deepEqual(
  errorPaths(form({ tools: [tool({ toolId: "" })] })),
  ["tools.0.toolId"]
)
assert.deepEqual(errorPaths(form({ tools: [tool({ toolId: "aws" })] })), [])

// "Outra" exige nome livre
assert.deepEqual(
  errorPaths(form({ tools: [tool({ toolId: "outra" })] })),
  ["tools.0.customName"]
)
assert.deepEqual(
  errorPaths(
    form({ tools: [tool({ toolId: "outra", customName: "TOTVS Protheus" })] })
  ),
  []
)

// valor zerado (o default), vazio ou "0,00" = grátis, sem exigir cobrança
assert.deepEqual(errorPaths(form({ tools: [tool()] })), [])
assert.deepEqual(errorPaths(form({ tools: [tool({ amount: "" })] })), [])
assert.deepEqual(errorPaths(form({ tools: [tool({ amount: "0,00" })] })), [])

// com valor, a data da fatura passa a ser obrigatória
assert.deepEqual(
  errorPaths(form({ tools: [tool({ amount: "340,50" })] })),
  ["tools.0.nextInvoice"]
)
assert.deepEqual(
  errorPaths(
    form({ tools: [tool({ amount: "340,50", nextInvoice: "2026-09-05" })] })
  ),
  []
)

// valor inválido ou negativo é erro
assert.deepEqual(
  errorPaths(form({ tools: [tool({ amount: "abc" })] })),
  ["tools.0.amount"]
)
assert.deepEqual(
  errorPaths(form({ tools: [tool({ amount: "-5" })] })),
  ["tools.0.amount"]
)

// ferramenta zerada não gera billing
assert.equal(toProject(form({ tools: [tool()] })).tools[0].billing, undefined)

// secret pela metade é erro; billing só existe quando é paga
assert.deepEqual(
  errorPaths(
    form({
      tools: [tool({ toolId: "aws", secrets: [{ key: "API_KEY", value: "" }] })],
    })
  ),
  ["tools.0.secrets.0.value"]
)

const paidTool = toProject(
  form({
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
  currency: "BRL",
  cycle: "mensal",
  nextInvoice: "2026-09-05",
  payer: "cliente",
})

// "Outra" usa o nome livre e cai na categoria other, sem billing
const otherTool = toProject(
  form({ tools: [tool({ toolId: "outra", customName: "TOTVS Protheus" })] })
).tools[0]
assert.equal(otherTool.name, "TOTVS Protheus")
assert.equal(otherTool.category, "other")
assert.equal(otherTool.billing, undefined)

// repo: vazio passa, formato inválido falha, "owner/repo" vira fullName
assert.deepEqual(errorPaths(form({ repoPath: "" })), [])
assert.deepEqual(errorPaths(form({ repoPath: "só-um-nome" })), ["repoPath"])
assert.deepEqual(errorPaths(form({ repoPath: "user/repo" })), [])
assert.deepEqual(
  toProject(form({ repoPath: "user/repo/" })).repo,
  { fullName: "user/repo", url: "https://github.com/user/repo", workflow: "none" }
)

// cola a URL inteira sem querer: prefixo é tolerado e removido
assert.deepEqual(
  errorPaths(form({ repoPath: "https://github.com/user/repo" })),
  []
)
assert.deepEqual(
  toProject(form({ repoPath: "https://github.com/user/repo" })).repo,
  { fullName: "user/repo", url: "https://github.com/user/repo", workflow: "none" }
)

// projeto sem repo fica null; conta vazia vira undefined; deal grátis é
// "a-vista" com valor zero, não um kind separado
const created = toProject(form({ tools: [tool({ toolId: "vercel" })] }))
assert.equal(created.repo, null)
assert.equal(created.tools[0].account, undefined)
assert.deepEqual(created.deal, { kind: "a-vista", amount: 0, currency: "BRL" })

// edição: mantém o id existente e, se o repo não mudou, o status de workflow
const original = toProject(
  form({ repoPath: "user/repo", tools: [tool({ toolId: "vercel" })] })
)
original.repo = { ...original.repo!, workflow: "success" }
const edited = toProject(fromProject(original), original)
assert.equal(edited.id, original.id)
assert.equal(edited.repo?.workflow, "success")

// edição trocando o repo: workflow volta a "none"
const editedRepo = toProject(
  { ...fromProject(original), repoPath: "outro/repo" },
  original
)
assert.equal(editedRepo.repo?.fullName, "outro/repo")
assert.equal(editedRepo.repo?.workflow, "none")

// edição não pode inflar valor com centavos — fromProject→toProject de um
// valor fracionado precisa fechar o roundtrip (regressão: String(340.5) dava
// "340.5", que o parser lia como "3405" por causa do ponto decimal)
const fractional = toProject(
  form({
    dealKind: "a-vista",
    amount: "18000,50",
    tools: [tool({ toolId: "aws", amount: "340,50", nextInvoice: "2026-09-05" })],
  })
)
const fractionalEdited = toProject(fromProject(fractional), fractional)
assert.equal(fractionalEdited.deal.amount, 18000.5)
assert.equal(fractionalEdited.tools[0].billing?.amount, 340.5)

console.log("project-schema: todos os checks passaram")
