import { describe, expect, it } from "vitest"
import {
  projectIdInput,
  projectInput,
  projectMoveInput,
  projectUpdateInput,
  toolInput,
} from "./project.ts"
import { validation } from "./messages.ts"

function messages(result: {
  success: boolean
  error?: { issues: { path: PropertyKey[]; message: string }[] }
}) {
  if (result.success || !result.error) return []
  return result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
}

const validTool = {
  id: "aws",
  name: "AWS",
  category: "deploy" as const,
  secrets: [] as { key: string; value: string }[],
}

const validProject = {
  name: "Landing",
  clientId: "contact-1",
  status: "queued" as const,
  startedAt: "2026-03-10",
  deal: { kind: "upfront" as const, amount: 0, currency: "BRL" },
  tools: [] as (typeof validTool)[],
  repo: null,
}

describe("projectInput", () => {
  it("accepts a free project and paid installment with tools", () => {
    expect(projectInput.safeParse({ ...validProject, id: "p1" }).success).toBe(true)
    expect(projectInput.safeParse({ ...validProject, id: "" }).success).toBe(false)
    expect(
      projectInput.safeParse({
        ...validProject,
        deal: { kind: "installment", amount: 18000, installments: 3, currency: "USD" },
        repo: { fullName: "org/app", url: "https://github.com/org/app", workflow: "none" },
        comments: [{ id: "c1", author: "Ada", createdAt: "2026-01-01T00:00", body: "hi" }],
        tools: [
          {
            ...validTool,
            billing: {
              amount: 20,
              cycle: "monthly",
              nextInvoice: "2026-04-01",
              payer: "me",
              currency: "USD",
            },
            secrets: [{ key: "TOKEN", value: "" }],
          },
        ],
      }).success,
    ).toBe(true)
    expect(
      projectInput.safeParse({
        ...validProject,
        deal: { kind: "installment", amount: 0, currency: "BRL" },
      }).success,
    ).toBe(true)
  })

  it("rejects empty client, short name and negative deal amount", () => {
    expect(messages(projectInput.safeParse({ ...validProject, name: "A" }))).toContain(
      `name: ${validation.minChars}`,
    )
    expect(messages(projectInput.safeParse({ ...validProject, clientId: "" }))).toContain(
      `clientId: ${validation.selectContact}`,
    )
    expect(messages(projectInput.safeParse({ ...validProject, clientId: "  " }))).toContain(
      `clientId: ${validation.selectContact}`,
    )
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          deal: { kind: "upfront", amount: -1, currency: "BRL" },
        }),
      ),
    ).toContain(`deal.amount: ${validation.negativeAmount}`)
    expect(
      projectInput.safeParse({ ...validProject, deal: { kind: "upfront", amount: 10 } }).success,
    ).toBe(false)
  })

  it("requires at least 2 installments when the deal is paid", () => {
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          deal: { kind: "installment", amount: 18000, installments: 1, currency: "BRL" },
        }),
      ),
    ).toContain(`deal.installments: ${validation.minInstallments}`)
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          deal: { kind: "installment", amount: 18000, currency: "BRL" },
        }),
      ),
    ).toContain(`deal.installments: ${validation.minInstallments}`)
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          deal: { kind: "installment", amount: 18000, installments: 1.5, currency: "BRL" },
        }),
      ),
    ).toContain(`deal.installments: ${validation.minInstallments}`)
  })

  it("rejects installment counts above the cap on create and update", () => {
    const overCap = {
      ...validProject,
      deal: { kind: "installment" as const, amount: 1, installments: 2147483647, currency: "BRL" },
    }
    expect(messages(projectInput.safeParse(overCap))).toContain(
      `deal.installments: ${validation.maxInstallments}`,
    )
    expect(messages(projectUpdateInput.safeParse({ ...overCap, id: "p1" }))).toContain(
      `deal.installments: ${validation.maxInstallments}`,
    )
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          deal: { kind: "installment", amount: 1, installments: 25, currency: "BRL" },
        }),
      ),
    ).toContain(`deal.installments: ${validation.maxInstallments}`)
    expect(
      projectInput.safeParse({
        ...validProject,
        deal: { kind: "installment", amount: 1, installments: 24, currency: "BRL" },
      }).success,
    ).toBe(true)
    expect(
      projectUpdateInput.safeParse({
        ...validProject,
        id: "p1",
        deal: { kind: "installment", amount: 1, installments: 24, currency: "BRL" },
      }).success,
    ).toBe(true)
  })

  it("rejects malformed repos and empty comments", () => {
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          repo: {
            fullName: "just-a-name",
            url: "https://github.com/just-a-name",
            workflow: "none",
          },
        }),
      ),
    ).toContain(`repo.fullName: ${validation.repoFormat}`)
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          repo: {
            fullName: "just-a-name",
            url: "https://github.com/org/app",
            workflow: "none",
          },
        }),
      ),
    ).toContain(`repo.fullName: ${validation.repoFormat}`)
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          repo: {
            fullName: "https://github.com/org/app",
            url: "https://github.com/org/app",
            workflow: "none",
          },
        }),
      ),
    ).toContain(`repo.fullName: ${validation.repoFormat}`)
    expect(
      projectInput.safeParse({
        ...validProject,
        repo: { fullName: "org/app", url: "https://github.com/org/app", workflow: "pending" },
      }).success,
    ).toBe(false)
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          repo: { fullName: "org/app", url: "javascript:alert(1)", workflow: "none" },
        }),
      ),
    ).toContain(`repo.url: ${validation.repoUrl}`)
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          repo: {
            fullName: "org/app",
            url: "data:text/html,<script>alert(1)</script>",
            workflow: "none",
          },
        }),
      ),
    ).toContain(`repo.url: ${validation.repoUrl}`)
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          repo: { fullName: "org/app", url: "http://github.com/org/app", workflow: "none" },
        }),
      ),
    ).toContain(`repo.url: ${validation.repoUrl}`)
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          repo: { fullName: "org/app", url: "https://github.com/other/repo", workflow: "none" },
        }),
      ),
    ).toContain(`repo.url: ${validation.repoUrl}`)
    expect(
      projectInput.safeParse({
        ...validProject,
        repo: { fullName: "org/app", url: "https://github.com/org/app", workflow: "none" },
      }).success,
    ).toBe(true)
    expect(
      messages(
        projectInput.safeParse({
          ...validProject,
          comments: [{ id: "c1", author: "Ada", createdAt: "2026-01-01T00:00", body: "  " }],
        }),
      ).some((message) => message.startsWith("comments.0.body:")),
    ).toBe(true)
    expect(
      projectInput.safeParse({
        ...validProject,
        comments: [{ id: "c1", body: "hi" }],
      }).success,
    ).toBe(false)
  })
})

describe("toolInput", () => {
  it("requires a tool id, name, category and invoice date when billed", () => {
    expect(
      toolInput.safeParse({ ...validTool, secrets: [{ key: "TOKEN", value: "" }] }).success,
    ).toBe(true)
    expect(messages(toolInput.safeParse({ ...validTool, id: "" }))).toContain(
      `id: ${validation.selectTool}`,
    )
    expect(messages(toolInput.safeParse({ ...validTool, name: "A" }))).toContain(
      `name: ${validation.enterToolName}`,
    )
    expect(messages(toolInput.safeParse({ ...validTool, category: "infra" }))).toContain(
      `category: ${validation.selectCategory}`,
    )
    expect(
      messages(toolInput.safeParse({ ...validTool, secrets: [{ key: "", value: "x" }] })),
    ).toContain(`secrets.0.key: ${validation.enterKey}`)
    expect(
      messages(
        toolInput.safeParse({
          ...validTool,
          billing: { amount: 20, cycle: "monthly", nextInvoice: "", payer: "me", currency: "BRL" },
        }),
      ),
    ).toContain(`billing.nextInvoice: ${validation.enterInvoiceDate}`)
    expect(
      messages(
        toolInput.safeParse({
          ...validTool,
          billing: {
            amount: -5,
            cycle: "monthly",
            nextInvoice: "2026-04-01",
            payer: "me",
            currency: "BRL",
          },
        }),
      ),
    ).toContain(`billing.amount: ${validation.negativeAmount}`)
    expect(
      toolInput.safeParse({
        ...validTool,
        billing: { amount: 0, cycle: "monthly", nextInvoice: "", payer: "me", currency: "BRL" },
      }).success,
    ).toBe(true)
    expect(
      toolInput.safeParse({
        ...validTool,
        billing: { amount: 20, cycle: "monthly", nextInvoice: "2026-04-01", payer: "me" },
      }).success,
    ).toBe(false)
  })
})

describe("project ids", () => {
  it("requires a non-empty id on update, move and delete", () => {
    expect(projectUpdateInput.safeParse({ ...validProject, id: "p1" }).success).toBe(true)
    expect(projectUpdateInput.safeParse(validProject).success).toBe(false)
    expect(projectIdInput.safeParse({ id: "" }).success).toBe(false)
    expect(projectMoveInput.safeParse({ id: "p1", status: "queued", index: 0 }).success).toBe(true)
    expect(projectMoveInput.safeParse({ id: "  ", status: "queued", index: 0 }).success).toBe(false)
  })
})
