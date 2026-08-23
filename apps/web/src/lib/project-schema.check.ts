/**
 * Self-check of the schema logic (money parsing, conditional rules, repo URL).
 * Run with: pnpm check:schema
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

// local assert instead of node:assert — avoids depending on @types/node in a
// file that lives next to browser code.
const assert = {
  deepEqual(actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`expected ${e}, got ${a}`)
  },
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) {
      throw new Error(`expected ${String(expected)}, got ${String(actual)}`)
    }
  },
}

// dealKind "upfront" + amount "0" (the emptyProjectForm defaults) already
// mean "free" — there is no separate kind for it anymore.
function form(overrides: Partial<ProjectFormValues> = {}): ProjectFormValues {
  return { ...emptyProjectForm, name: "Project X", clientId: "contact-x", ...overrides }
}

/** Valid tool by default — each case overrides only what it tests. */
function tool(overrides: Partial<ToolFormValues> = {}): ToolFormValues {
  return { ...emptyToolForm, toolId: "aws", ...overrides }
}

function errorPaths(values: ProjectFormValues) {
  const result = projectSchema.safeParse(values)
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."))
}

// name requires a minimum of 2 chars; clientId just needs to be picked
assert.deepEqual(errorPaths(form({ name: "A", clientId: "" })), ["name", "clientId"])

// isNewContact: clientId is ignored, the new-contact fields are required instead
assert.deepEqual(
  errorPaths(form({ isNewContact: true, clientId: "" })),
  ["newContactName", "newContactPhone", "newContactCompany"]
)
assert.deepEqual(
  errorPaths(
    form({
      isNewContact: true,
      clientId: "",
      newContactName: "Marcelo Tavares",
      newContactPhone: "(11) 98765-4321",
      newContactCompany: "Empresa Ltda",
    })
  ),
  []
)
// email is optional, but must be a valid address when present
assert.deepEqual(
  errorPaths(
    form({
      isNewContact: true,
      clientId: "",
      newContactName: "Marcelo Tavares",
      newContactEmail: "not-an-email",
      newContactPhone: "(11) 98765-4321",
      newContactCompany: "Empresa Ltda",
    })
  ),
  ["newContactEmail"]
)

// zeroed amount (the default) = free project, no billing required
assert.deepEqual(errorPaths(form()), [])

// a positive amount is valid on any deal kind, zero and empty too (free)
assert.deepEqual(errorPaths(form({ dealKind: "upfront" })), [])
assert.deepEqual(errorPaths(form({ dealKind: "upfront", amount: "0" })), [])
assert.deepEqual(errorPaths(form({ dealKind: "upfront", amount: "7200" })), [])

// installment only requires a minimum of 2 installments when paid (amount > 0)
assert.deepEqual(
  errorPaths(form({ dealKind: "installment", amount: "18000", installments: "1" })),
  ["installments"]
)
assert.deepEqual(
  errorPaths(form({ dealKind: "installment", amount: "18000", installments: "3" })),
  []
)
// free installment deal (zeroed amount) requires no installments
assert.deepEqual(
  errorPaths(form({ dealKind: "installment", amount: "0", installments: "1" })),
  []
)

// pt-BR formatted amount
assert.deepEqual(errorPaths(form({ dealKind: "upfront", amount: "18.000,50" })), [])
assert.equal(
  toProject(form({ dealKind: "upfront", amount: "18.000,50" })).deal.amount,
  18000.5
)

// an invalid or negative deal amount is an error (same rule as the tools)
assert.deepEqual(errorPaths(form({ amount: "abc" })), ["amount"])
assert.deepEqual(errorPaths(form({ amount: "-5" })), ["amount"])

// tool: one must be picked from the catalog
assert.deepEqual(
  errorPaths(form({ tools: [tool({ toolId: "" })] })),
  ["tools.0.toolId"]
)
assert.deepEqual(errorPaths(form({ tools: [tool({ toolId: "aws" })] })), [])

// "Outra" requires the free-text name
assert.deepEqual(
  errorPaths(form({ tools: [tool({ toolId: "other" })] })),
  ["tools.0.customName"]
)
assert.deepEqual(
  errorPaths(
    form({ tools: [tool({ toolId: "other", customName: "TOTVS Protheus" })] })
  ),
  []
)

// zeroed (the default), empty or "0,00" amount = free, no billing required
assert.deepEqual(errorPaths(form({ tools: [tool()] })), [])
assert.deepEqual(errorPaths(form({ tools: [tool({ amount: "" })] })), [])
assert.deepEqual(errorPaths(form({ tools: [tool({ amount: "0,00" })] })), [])

// with an amount, the invoice date becomes required
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

// an invalid or negative amount is an error
assert.deepEqual(
  errorPaths(form({ tools: [tool({ amount: "abc" })] })),
  ["tools.0.amount"]
)
assert.deepEqual(
  errorPaths(form({ tools: [tool({ amount: "-5" })] })),
  ["tools.0.amount"]
)

// a zeroed tool produces no billing
assert.equal(toProject(form({ tools: [tool()] })).tools[0].billing, undefined)

// a half-filled secret is an error; billing only exists when paid
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
        payer: "client",
      }),
    ],
  })
).tools[0]
assert.equal(paidTool.name, "AWS")
assert.equal(paidTool.category, "deploy")
assert.deepEqual(paidTool.billing, {
  amount: 340.5,
  currency: "BRL",
  cycle: "monthly",
  nextInvoice: "2026-09-05",
  payer: "client",
})

// "Outra" uses the free-text name and falls into the other category, no billing
const otherTool = toProject(
  form({ tools: [tool({ toolId: "other", customName: "TOTVS Protheus" })] })
).tools[0]
assert.equal(otherTool.name, "TOTVS Protheus")
assert.equal(otherTool.category, "other")
assert.equal(otherTool.billing, undefined)

// repo: empty passes, invalid format fails, "owner/repo" becomes fullName
assert.deepEqual(errorPaths(form({ repoPath: "" })), [])
assert.deepEqual(errorPaths(form({ repoPath: "just-a-name" })), ["repoPath"])
assert.deepEqual(errorPaths(form({ repoPath: "user/repo" })), [])
assert.deepEqual(
  toProject(form({ repoPath: "user/repo/" })).repo,
  { fullName: "user/repo", url: "https://github.com/user/repo", workflow: "none" }
)

// pasting the whole URL by mistake: the prefix is tolerated and stripped
assert.deepEqual(
  errorPaths(form({ repoPath: "https://github.com/user/repo" })),
  []
)
assert.deepEqual(
  toProject(form({ repoPath: "https://github.com/user/repo" })).repo,
  { fullName: "user/repo", url: "https://github.com/user/repo", workflow: "none" }
)

// a project with no repo stays null; an empty account becomes undefined; a
// free deal is "upfront" with a zero amount, not a separate kind
const created = toProject(form({ tools: [tool({ toolId: "vercel" })] }))
assert.equal(created.repo, null)
assert.equal(created.tools[0].account, undefined)
assert.deepEqual(created.deal, { kind: "upfront", amount: 0, currency: "BRL" })

// editing: keeps the existing id and, if the repo did not change, the workflow status
const original = toProject(
  form({ repoPath: "user/repo", tools: [tool({ toolId: "vercel" })] })
)
original.repo = { ...original.repo!, workflow: "success" }
const edited = toProject(fromProject(original), original)
assert.equal(edited.id, original.id)
assert.equal(edited.repo?.workflow, "success")
assert.equal(edited.clientId, "contact-x")

// editing with a different repo: workflow goes back to "none"
const editedRepo = toProject(
  { ...fromProject(original), repoPath: "another/repo" },
  original
)
assert.equal(editedRepo.repo?.fullName, "another/repo")
assert.equal(editedRepo.repo?.workflow, "none")

// editing must not inflate amounts with cents — fromProject→toProject of a
// fractional amount has to close the roundtrip (regression: String(340.5) gave
// "340.5", which the parser read as "3405" because of the decimal point)
const fractional = toProject(
  form({
    dealKind: "upfront",
    amount: "18000,50",
    tools: [tool({ toolId: "aws", amount: "340,50", nextInvoice: "2026-09-05" })],
  })
)
const fractionalEdited = toProject(fromProject(fractional), fractional)
assert.equal(fractionalEdited.deal.amount, 18000.5)
assert.equal(fractionalEdited.tools[0].billing?.amount, 340.5)

// description and comments live outside the form — editing must keep them
original.description = "Nota do kanban"
original.comments = [
  { id: "c1", author: "Rodrigo Araujo", createdAt: "2026-08-01T10:00", body: "Oi" },
]
original.history = [
  { id: "h1", at: "2026-08-01T10:00", field: "name", from: "X", to: original.name },
]
const editedNotes = toProject(fromProject(original), original)
assert.equal(editedNotes.description, "Nota do kanban")
assert.deepEqual(editedNotes.comments, original.comments)
assert.deepEqual(editedNotes.history, original.history)

console.log("project-schema: all checks passed")
