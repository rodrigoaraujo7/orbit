import { z } from "zod"

// Imports relativos (e não pelo alias "@/") de propósito: este módulo roda
// também fora do Vite, no self-check com `node --experimental-strip-types`,
// e o Node não resolve o alias.
import type { Deal, Project, Tool } from "../data/projects.ts"
import { OTHER_TOOL_ID, findCatalogTool } from "../data/tool-catalog.ts"

/**
 * Campos numéricos e de data ficam como string porque vêm de `<input>`; a
 * conversão acontece no `superRefine` e no `toProject`.
 */
export const projectSchema = z
  .object({
    name: z.string().trim().min(2, "Informe pelo menos 2 caracteres"),
    client: z.string().trim().min(2, "Informe pelo menos 2 caracteres"),
    clientEmail: z.string().trim(),
    clientPhone: z.string().trim(),
    status: z.enum(["em-desenvolvimento", "fila", "pausado", "concluido"]),
    dealKind: z.enum(["gratis", "a-vista", "parcelado"]),
    amount: z.string().trim(),
    installments: z.string().trim(),
    tools: z.array(
      z.object({
        toolId: z.string().min(1, "Selecione a ferramenta"),
        customName: z.string().trim(),
        account: z.string().trim(),
        amount: z.string().trim(),
        cycle: z.enum(["mensal", "anual", "avulso"]),
        nextInvoice: z.string().trim(),
        payer: z.enum(["eu", "cliente"]),
        secrets: z.array(
          z.object({
            key: z.string().trim().min(1, "Informe a chave"),
            value: z.string().trim().min(1, "Informe o valor"),
          })
        ),
      })
    ),
    // só o "owner/repo" — o prefixo "https://github.com/" é fixo na UI
    repoPath: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    if (values.clientEmail && !z.string().email().safeParse(values.clientEmail).success) {
      ctx.addIssue({
        code: "custom",
        path: ["clientEmail"],
        message: "E-mail inválido",
      })
    }

    if (values.dealKind !== "gratis") {
      const amount = parseAmount(values.amount)
      if (amount == null || amount <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Informe um valor maior que zero",
        })
      }
    }

    if (values.dealKind === "parcelado") {
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

      // Valor zerado = ferramenta grátis. Só o que for lixo ou negativo é erro.
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

      // Cobrança só é exigida quando a ferramenta tem valor.
      if (isToolPaid(tool.amount) && !tool.nextInvoice) {
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
  // começa zerado: sem valor, a ferramenta é tratada como grátis
  amount: "0",
  cycle: "mensal",
  nextInvoice: "",
  payer: "eu",
  secrets: [],
}

export const emptyProjectForm: ProjectFormValues = {
  name: "",
  client: "",
  clientEmail: "",
  clientPhone: "",
  status: "fila",
  dealKind: "a-vista",
  amount: "",
  installments: "",
  tools: [],
  repoPath: "",
}

/** Aceita "18000" e "18.000,50" (formato pt-BR). */
function parseAmount(raw: string): number | null {
  if (!raw) return null
  const normalized = raw.replace(/\./g, "").replace(",", ".")
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/**
 * Ferramenta é paga quando tem valor maior que zero — não existe flag `paid`
 * separada. Schema e UI compartilham esta função pra não divergirem sobre o
 * que conta como "zerado" (vazio, "0" e "0,00" são todos grátis).
 */
export function isToolPaid(amount: string): boolean {
  const value = parseAmount(amount)
  return value != null && value > 0
}

export const GITHUB_PREFIX = "https://github.com/"

/**
 * Valida "owner/repo". Tolerante a colar a URL inteira por engano (o prefixo
 * é removido antes de validar) mesmo a UI só pedindo o caminho.
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
    // billing presente ⟺ valor > 0; não existe campo `paid` separado
    billing: isToolPaid(values.amount)
      ? {
          amount: parseAmount(values.amount) ?? 0,
          cycle: values.cycle,
          nextInvoice: values.nextInvoice,
          payer: values.payer,
        }
      : undefined,
    secrets: values.secrets,
  }
}

/**
 * `existing` presente = edição: mantém o id e, se o repo não mudou, o status
 * de workflow (o form não tem campo pra isso, só a URL/nome).
 */
export function toProject(values: ProjectFormValues, existing?: Project): Project {
  const amount = parseAmount(values.amount) ?? 0

  const deal: Deal =
    values.dealKind === "gratis"
      ? { kind: "gratis" }
      : values.dealKind === "parcelado"
        ? { kind: "parcelado", amount, installments: Number(values.installments) }
        : { kind: "a-vista", amount }

  const repo = values.repoPath ? parseRepo(values.repoPath) : null
  const workflow =
    repo && existing?.repo?.fullName === repo.fullName
      ? existing.repo.workflow
      : "none"

  return {
    id: existing?.id ?? crypto.randomUUID(),
    name: values.name,
    client: values.client,
    clientEmail: values.clientEmail || undefined,
    clientPhone: values.clientPhone || undefined,
    status: values.status,
    deal,
    tools: values.tools.map(toTool),
    repo: repo ? { ...repo, workflow } : null,
  }
}

export function fromProject(project: Project): ProjectFormValues {
  return {
    name: project.name,
    client: project.client,
    clientEmail: project.clientEmail ?? "",
    clientPhone: project.clientPhone ?? "",
    status: project.status,
    dealKind: project.deal.kind,
    amount: project.deal.kind === "gratis" ? "" : String(project.deal.amount ?? ""),
    installments:
      project.deal.kind === "parcelado" ? String(project.deal.installments ?? "") : "",
    tools: project.tools.map((tool) => ({
      toolId: tool.id,
      customName: findCatalogTool(tool.id) ? "" : tool.name,
      account: tool.account ?? "",
      amount: tool.billing ? String(tool.billing.amount) : "0",
      cycle: tool.billing?.cycle ?? "mensal",
      nextInvoice: tool.billing?.nextInvoice ?? "",
      payer: tool.billing?.payer ?? "eu",
      secrets: tool.secrets,
    })),
    repoPath: project.repo?.fullName ?? "",
  }
}
