import { z } from "zod"

// Relative imports (not the "@/" alias) on purpose: this module also runs
// outside Vite, in the self-check with `node --experimental-strip-types`, and
// Node does not resolve the alias.
import type { Deal, Project, Tool } from "../data/projects.ts"
import { OTHER_TOOL_ID, findCatalogTool } from "../data/tool-catalog.ts"
import { DEFAULT_CURRENCY } from "./currency.ts"

/**
 * Number and date fields stay as strings because they come from `<input>`; the
 * conversion happens in `superRefine` and in `toProject`.
 */
export const projectSchema = z
  .object({
    name: z.string().trim().min(2, "Informe pelo menos 2 caracteres"),
    clientId: z.string().min(1, "Selecione um contato"),
    status: z.enum(["in-development", "queued", "paused", "completed"]),
    dealKind: z.enum(["upfront", "installment"]),
    amount: z.string().trim(),
    currency: z.string().trim().min(1),
    installments: z.string().trim(),
    tools: z.array(
      z.object({
        toolId: z.string().min(1, "Selecione a ferramenta"),
        customName: z.string().trim(),
        account: z.string().trim(),
        amount: z.string().trim(),
        currency: z.string().trim().min(1),
        cycle: z.enum(["monthly", "yearly", "one-off"]),
        nextInvoice: z.string().trim(),
        payer: z.enum(["me", "client"]),
        secrets: z.array(
          z.object({
            key: z.string().trim().min(1, "Informe a chave"),
            value: z.string().trim().min(1, "Informe o valor"),
          })
        ),
      })
    ),
    // just the "owner/repo" — the "https://github.com/" prefix is fixed in the UI
    repoPath: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    // Zeroed amount = free project, same rule as the tools — only garbage or
    // negative values are errors.
    const dealAmount = parseAmount(values.amount)
    if (values.amount && dealAmount == null) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Informe um valor válido",
      })
    } else if (dealAmount != null && dealAmount < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "O valor não pode ser negativo",
      })
    }

    // Installments only make sense when the project is paid.
    if (values.dealKind === "installment" && hasPositiveAmount(values.amount)) {
      const installments = Number(values.installments)
      if (!Number.isInteger(installments) || installments < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["installments"],
          message: "Mínimo de 2 parcelas",
        })
      }
    }

    values.tools.forEach((tool, index) => {
      if (tool.toolId === OTHER_TOOL_ID && tool.customName.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["tools", index, "customName"],
          message: "Informe o nome da ferramenta",
        })
      }

      // Zeroed amount = free tool. Only garbage or negative values are errors.
      const amount = parseAmount(tool.amount)
      if (tool.amount && amount == null) {
        ctx.addIssue({
          code: "custom",
          path: ["tools", index, "amount"],
          message: "Informe um valor válido",
        })
      } else if (amount != null && amount < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["tools", index, "amount"],
          message: "O valor não pode ser negativo",
        })
      }

      // Billing is only required when the tool has an amount.
      if (hasPositiveAmount(tool.amount) && !tool.nextInvoice) {
        ctx.addIssue({
          code: "custom",
          path: ["tools", index, "nextInvoice"],
          message: "Informe a data da fatura",
        })
      }
    })

    if (values.repoPath && parseRepo(values.repoPath) == null) {
      ctx.addIssue({
        code: "custom",
        path: ["repoPath"],
        message: "Use o formato usuario/repositorio",
      })
    }
  })

export type ProjectFormValues = z.infer<typeof projectSchema>
export type ToolFormValues = ProjectFormValues["tools"][number]

export const emptyToolForm: ToolFormValues = {
  toolId: "",
  customName: "",
  account: "",
  // starts zeroed: with no amount, the tool is treated as free
  amount: "0",
  currency: DEFAULT_CURRENCY,
  cycle: "monthly",
  nextInvoice: "",
  payer: "me",
  secrets: [],
}

export const emptyProjectForm: ProjectFormValues = {
  name: "",
  clientId: "",
  status: "queued",
  dealKind: "upfront",
  // starts zeroed: with no amount, the project is treated as free (same rule
  // as the tools)
  amount: "0",
  currency: DEFAULT_CURRENCY,
  installments: "2",
  tools: [],
  repoPath: "",
}

/** Accepts "18000" and "18.000,50" (pt-BR format). */
export function parseAmount(raw: string): number | null {
  if (!raw) return null
  const normalized = raw.replace(/\./g, "").replace(",", ".")
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/**
 * Inverse of `parseAmount` — used by `fromProject` to refill the amount field
 * when editing. `String(340.5)` would give "340.5" (decimal point), which
 * `parseAmount` would read as a thousands separator and blow the value up 10x;
 * formats in pt-BR (decimal comma) to close the roundtrip.
 */
function formatAmountInput(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * A tool/project is paid when it has an amount greater than zero — there is no
 * separate `paid` flag, nor a "free" deal kind. Schema and UI share this
 * function so they cannot disagree on what counts as "zeroed" (empty, "0" and
 * "0,00" are all free).
 */
export function hasPositiveAmount(amount: string): boolean {
  const value = parseAmount(amount)
  return value != null && value > 0
}

export const GITHUB_PREFIX = "https://github.com/"

/**
 * Validates "owner/repo". Tolerates pasting the whole URL by mistake (the
 * prefix is stripped before validating) even though the UI only asks for the path.
 */
function parseRepo(raw: string): { fullName: string; url: string } | null {
  const path = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/\/+$/, "")
  const match = /^([\w.-]+)\/([\w.-]+)$/.exec(path)
  if (!match) return null
  const [, owner, repo] = match
  return { fullName: `${owner}/${repo}`, url: `${GITHUB_PREFIX}${owner}/${repo}` }
}

function toTool(values: ToolFormValues): Tool {
  const catalogTool = findCatalogTool(values.toolId)
  const isOther = values.toolId === OTHER_TOOL_ID

  return {
    id: values.toolId,
    name: isOther ? values.customName : (catalogTool?.name ?? values.toolId),
    category: catalogTool?.category ?? "other",
    account: values.account || undefined,
    // billing present ⟺ amount > 0; there is no separate `paid` field
    billing: hasPositiveAmount(values.amount)
      ? {
          amount: parseAmount(values.amount) ?? 0,
          currency: values.currency,
          cycle: values.cycle,
          nextInvoice: values.nextInvoice,
          payer: values.payer,
        }
      : undefined,
    secrets: values.secrets,
  }
}

/**
 * `existing` present = editing: keeps the id and, if the repo did not change,
 * the workflow status (the form has no field for it, only the URL/name).
 */
export function toProject(values: ProjectFormValues, existing?: Project): Project {
  const amount = parseAmount(values.amount) ?? 0

  const deal: Deal =
    values.dealKind === "installment"
      ? {
          kind: "installment",
          amount,
          installments: Number(values.installments),
          currency: values.currency,
        }
      : { kind: "upfront", amount, currency: values.currency }

  const repo = values.repoPath ? parseRepo(values.repoPath) : null
  const workflow =
    repo && existing?.repo?.fullName === repo.fullName
      ? existing.repo.workflow
      : "none"

  return {
    id: existing?.id ?? crypto.randomUUID(),
    name: values.name,
    clientId: values.clientId,
    status: values.status,
    deal,
    tools: values.tools.map(toTool),
    repo: repo ? { ...repo, workflow } : null,
  }
}

export function fromProject(project: Project): ProjectFormValues {
  return {
    name: project.name,
    clientId: project.clientId,
    status: project.status,
    dealKind: project.deal.kind,
    amount: formatAmountInput(project.deal.amount),
    currency: project.deal.currency ?? DEFAULT_CURRENCY,
    installments: String(project.deal.installments ?? 2),
    tools: project.tools.map((tool) => ({
      toolId: tool.id,
      customName: findCatalogTool(tool.id) ? "" : tool.name,
      account: tool.account ?? "",
      amount: tool.billing ? formatAmountInput(tool.billing.amount) : "0",
      currency: tool.billing?.currency ?? DEFAULT_CURRENCY,
      cycle: tool.billing?.cycle ?? "monthly",
      nextInvoice: tool.billing?.nextInvoice ?? "",
      payer: tool.billing?.payer ?? "me",
      secrets: tool.secrets,
    })),
    repoPath: project.repo?.fullName ?? "",
  }
}
