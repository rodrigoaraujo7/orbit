import { z } from "zod"
import {
  billingCycleSchema,
  dealKindSchema,
  DEFAULT_CURRENCY,
  hasPositiveAmount as hasPositiveAmountWithLocale,
  parseAmount as parseAmountWithLocale,
  payerSchema,
  projectStatusSchema,
} from "shared"

import type { Deal, Project, Tool } from "../data/projects.ts"
import { OTHER_TOOL_ID, findCatalogTool } from "../data/tool-catalog.ts"
import i18n, { getLocale } from "../i18n/index.ts"
import { todayIso } from "./dates.ts"
import { withProjectStatus } from "./project-status.ts"

export function parseAmount(raw: string) {
  return parseAmountWithLocale(raw, getLocale())
}

export function hasPositiveAmount(amount: string) {
  return hasPositiveAmountWithLocale(amount, getLocale())
}

/**
 * Number and date fields stay as strings because they come from `<input>`; the
 * conversion happens in `superRefine` and in `toProject`. Built as a factory so
 * Zod messages follow the active language at parse time.
 */
export function projectSchema() {
  return z
  .object({
    name: z.string().trim().min(2, i18n.t("validation.minChars")),
    clientId: z.string(),
    // when true, clientId is ignored and a Contact is created from the
    // newContact* fields instead — see the create-project-dialog for the
    // actual creation (this schema stays free of registry side effects).
    isNewContact: z.boolean(),
    newContactName: z.string().trim(),
    newContactEmail: z.string().trim(),
    newContactPhone: z.string().trim(),
    newContactCompany: z.string().trim(),
    status: projectStatusSchema,
    dealKind: dealKindSchema,
    amount: z.string().trim(),
    currency: z.string().trim().min(1),
    installments: z.string().trim(),
    tools: z.array(
      z.object({
        toolId: z.string().min(1, i18n.t("validation.selectTool")),
        customName: z.string().trim(),
        account: z.string().trim(),
        amount: z.string().trim(),
        currency: z.string().trim().min(1),
        cycle: billingCycleSchema,
        nextInvoice: z.string().trim(),
        payer: payerSchema,
        secrets: z.array(
          z.object({
            key: z.string().trim().min(1, i18n.t("validation.enterKey")),
            value: z.string().trim().min(1, i18n.t("validation.enterValue")),
          })
        ),
      })
    ),
    // just the "owner/repo" — the "https://github.com/" prefix is fixed in the UI
    repoPath: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    // Contact: either an existing contact is picked, or a new one is filled
    // in inline — same required fields as CreateContactDialog's contactSchema.
    if (!values.isNewContact) {
      if (!values.clientId) {
        ctx.addIssue({
          code: "custom",
          path: ["clientId"],
          message: i18n.t("validation.selectContact"),
        })
      }
    } else {
      if (values.newContactName.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["newContactName"],
          message: i18n.t("validation.minChars"),
        })
      }
      if (!values.newContactPhone) {
        ctx.addIssue({
          code: "custom",
          path: ["newContactPhone"],
          message: i18n.t("validation.enterPhone"),
        })
      }
      if (!values.newContactCompany) {
        ctx.addIssue({
          code: "custom",
          path: ["newContactCompany"],
          message: i18n.t("validation.enterCompany"),
        })
      }
      if (
        values.newContactEmail &&
        !z.string().email().safeParse(values.newContactEmail).success
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["newContactEmail"],
          message: i18n.t("validation.emailInvalid"),
        })
      }
    }

    // Zeroed amount = free project, same rule as the tools — only garbage or
    // negative values are errors.
    const dealAmount = parseAmount(values.amount)
    if (values.amount && dealAmount == null) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: i18n.t("validation.invalidAmount"),
      })
    } else if (dealAmount != null && dealAmount < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: i18n.t("validation.negativeAmount"),
      })
    }

    // Installments only make sense when the project is paid.
    if (values.dealKind === "installment" && hasPositiveAmount(values.amount)) {
      const installments = Number(values.installments)
      if (!Number.isInteger(installments) || installments < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["installments"],
          message: i18n.t("validation.minInstallments"),
        })
      }
    }

    values.tools.forEach((tool, index) => {
      if (tool.toolId === OTHER_TOOL_ID && tool.customName.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["tools", index, "customName"],
          message: i18n.t("validation.enterToolName"),
        })
      }

      // Zeroed amount = free tool. Only garbage or negative values are errors.
      const amount = parseAmount(tool.amount)
      if (tool.amount && amount == null) {
        ctx.addIssue({
          code: "custom",
          path: ["tools", index, "amount"],
          message: i18n.t("validation.invalidAmount"),
        })
      } else if (amount != null && amount < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["tools", index, "amount"],
          message: i18n.t("validation.negativeAmount"),
        })
      }

      // Billing is only required when the tool has an amount.
      if (hasPositiveAmount(tool.amount) && !tool.nextInvoice) {
        ctx.addIssue({
          code: "custom",
          path: ["tools", index, "nextInvoice"],
          message: i18n.t("validation.enterInvoiceDate"),
        })
      }
    })

    if (values.repoPath && parseRepo(values.repoPath) == null) {
      ctx.addIssue({
        code: "custom",
        path: ["repoPath"],
        message: i18n.t("validation.repoFormat"),
      })
    }
  })
}

export type ProjectFormValues = z.infer<ReturnType<typeof projectSchema>>
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
  isNewContact: false,
  newContactName: "",
  newContactEmail: "",
  newContactPhone: "",
  newContactCompany: "",
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

/**
 * Inverse of `parseAmount` — used by `fromProject` to refill the amount field
 * when editing. `String(340.5)` would give "340.5" (decimal point), which
 * `parseAmount` would misread depending on locale and blow the value up;
 * formats with the active locale to close the roundtrip.
 */
function formatAmountInput(value: number): string {
  return value.toLocaleString(getLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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

  return withProjectStatus(
    {
      id: existing?.id ?? crypto.randomUUID(),
      name: values.name,
      clientId: values.clientId,
      status: values.status,
      // Not in the form: a project starts when it is registered, and finishes
      // when its status says so. Both are kept on edit so the timeline the
      // dashboard draws does not jump every time the project is saved.
      startedAt: existing?.startedAt ?? todayIso(),
      endedAt: existing?.endedAt,
      deal,
      tools: values.tools.map(toTool),
      repo: repo ? { ...repo, workflow } : null,
      description: existing?.description,
      comments: existing?.comments,
    },
    values.status
  )
}

export function fromProject(project: Project): ProjectFormValues {
  return {
    name: project.name,
    clientId: project.clientId,
    isNewContact: false,
    newContactName: "",
    newContactEmail: "",
    newContactPhone: "",
    newContactCompany: "",
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
