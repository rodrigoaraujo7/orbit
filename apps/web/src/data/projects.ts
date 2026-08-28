import type { ToolCategory } from "./tool-catalog.ts"

export type ProjectStatus =
  | "queued"
  | "in-development"
  | "paused"
  | "in-validation"
  | "completed"

export type ProjectComment = {
  id: string
  author: string
  /** "YYYY-MM-DDTHH:mm" */
  createdAt: string
  body: string
}

/** Result of the latest GitHub Actions run on the project repo. */
export type WorkflowStatus = "success" | "failure" | "running" | "none"

export type BillingCycle = "monthly" | "yearly" | "one-off"

/** Who pays for the tool. */
export type Payer = "me" | "client"

export type ToolBilling = {
  amount: number
  cycle: BillingCycle
  /** Invoice date, "YYYY-MM-DD" (what <input type="date"> gives back). */
  nextInvoice: string
  payer: Payer
  /** ISO 4217 code, e.g. "USD". Absent = "BRL" (legacy data, no migration). */
  currency?: string
}

/**
 * ponytail: plaintext secret only because the app is still 100% frontend with
 * in-memory state. Once the API lands: encrypt at rest, never log it, and
 * never send the value back to the frontend after saving.
 */
export type Secret = {
  key: string
  value: string
}

export type Tool = {
  /** Catalog id from tool-catalog.ts, or "other" when outside of it. */
  id: string
  name: string
  category: ToolCategory
  /** Account/login used to access this tool on this project. */
  account?: string
  /** Present if — and only if — the tool is paid. */
  billing?: ToolBilling
  secrets: Secret[]
}

export type DealKind = "upfront" | "installment"

/**
 * Amount agreed with the client. No separate "free" kind — same rule as the
 * tools: a zeroed `amount` is what means free (see `isDealFree`).
 */
export type Deal = {
  kind: DealKind
  amount: number
  /** Only relevant when `kind === "installment"`. */
  installments?: number
  /** ISO 4217 code, e.g. "USD". Absent = "BRL" (legacy data, no migration). */
  currency?: string
}

/** Same rule as the form's `isToolPaid`: zeroed (or negative) amount = free. */
export function isDealFree(deal: Deal): boolean {
  return deal.amount <= 0
}

export type Project = {
  id: string
  name: string
  /** References a Contact.id (see data/contacts.ts) — the project's main contact. */
  clientId: string
  status: ProjectStatus
  /**
   * Start date, "YYYY-MM-DD". The anchor of the whole timeline: installments
   * are counted from it (generateInvoices) and a tool only costs money from
   * this month on (dashboard metrics).
   */
  startedAt: string
  /**
   * Only on finished projects — after it the tools stop costing. Absent means
   * the project is still running the meter.
   */
  endedAt?: string
  deal: Deal
  tools: Tool[]
  repo: {
    fullName: string
    url: string
    workflow: WorkflowStatus
  } | null
  /** Shown on the Kanban issue modal; absent = "Sem descrição." */
  description?: string
  comments?: ProjectComment[]
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  queued: "Na fila",
  "in-development": "Em desenvolvimento",
  paused: "Pausado",
  "in-validation": "Em validação",
  completed: "Concluído",
}

/** Kanban column order. */
export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "queued",
  "in-development",
  "paused",
  "in-validation",
  "completed",
]

export const DEAL_KIND_LABEL: Record<DealKind, string> = {
  upfront: "À vista",
  installment: "Parcelado",
}

export const FREE_LABEL = "Grátis"

export type InvoiceStatus = "pending" | "paid" | "overdue"
export type PaymentMethod = "boleto" | "pix"

/** Client invoice — derived from the `deal` via generateInvoices. */
export type Invoice = {
  id: string
  /** "YYYY-MM", present only on installment deals (the installment month). */
  referenceMonth?: string
  amount: number
  status: InvoiceStatus
  paymentMethod?: PaymentMethod
  /** Date the invoice was generated, "YYYY-MM-DD". */
  generatedAt: string
  /** "YYYY-MM-DDTHH:mm", present only when `status === "paid"`. */
  paidAt?: string
  payerName: string
  hasAttachment: boolean
  /** ISO 4217 code, inherited from the project's `deal`. */
  currency: string
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  pending: "Pendente",
  paid: "Paga",
  overdue: "Atrasada",
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  boleto: "Boleto",
  pix: "Pix",
}

export const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "Mensal",
  yearly: "Anual",
  "one-off": "Avulso",
}

export const PAYER_LABEL: Record<Payer, string> = {
  me: "Eu",
  client: "Cliente",
}

export const WORKFLOW_STATUS_LABEL: Record<WorkflowStatus, string> = {
  success: "Passou",
  failure: "Falhou",
  running: "Rodando",
  none: "Sem runs",
}

/** Tooltip text for when the workflow badge shows only the icon. */
export const WORKFLOW_STATUS_TOOLTIP: Record<WorkflowStatus, string> = {
  success: "GitHub Actions passou",
  failure: "GitHub Actions falhou",
  running: "GitHub Actions rodando",
  none: "Sem runs do GitHub Actions",
}

const MY_ACCOUNT = "rodrigo@fastbuilt.com.br"
const MOCK_AUTHOR = "Rodrigo Araujo"

// ponytail: local mock. Swap for a fetch once the API exists — the shape is
// already what the API should return.
export const projects: Project[] = [
  {
    id: "1",
    name: "Portal do Corretor",
    clientId: "contact-1",
    status: "in-development",
    startedAt: "2026-07-08",
    description:
      "Portal para corretores acompanharem propostas, comissões e documentos dos clientes. Integra AWS, Resend e Supabase.",
    comments: [
      {
        id: "c1-1",
        author: MOCK_AUTHOR,
        createdAt: "2026-07-10T09:15",
        body: "Kickoff feito. Cliente mandou o layout do Figma e o acesso ao S3.",
      },
      {
        id: "c1-2",
        author: MOCK_AUTHOR,
        createdAt: "2026-08-02T16:40",
        body: "Falta fechar o fluxo de comissão parcelada antes de subir o deploy de staging.",
      },
    ],
    deal: { kind: "installment", amount: 18000, installments: 3 },
    tools: [
      {
        id: "aws",
        name: "AWS",
        category: "deploy",
        account: MY_ACCOUNT,
        billing: {
          amount: 340.5,
          cycle: "monthly",
          nextInvoice: "2026-09-05",
          payer: "client",
        },
        secrets: [
          { key: "AWS_ACCESS_KEY_ID", value: "AKIAIOSFODNN7EXAMPLE" },
          { key: "AWS_REGION", value: "sa-east-1" },
        ],
      },
      {
        id: "resend",
        name: "Resend",
        category: "communication",
        account: MY_ACCOUNT,
        billing: {
          amount: 20,
          cycle: "monthly",
          nextInvoice: "2026-09-01",
          payer: "me",
        },
        secrets: [{ key: "RESEND_API_KEY", value: "re_123456789_example" }],
      },
      {
        id: "supabase",
        name: "Supabase",
        category: "database",
        account: "rodrigoaraujo7 (GitHub)",
        secrets: [
          { key: "SUPABASE_URL", value: "https://abcd.supabase.co" },
          { key: "SUPABASE_ANON_KEY", value: "eyJhbGciOi_example" },
        ],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/portal-corretor",
      url: "https://github.com/rodrigoaraujo7/portal-corretor",
      workflow: "success",
    },
  },
  {
    id: "2",
    name: "E-commerce Nutri",
    clientId: "contact-2",
    status: "in-validation",
    startedAt: "2026-05-20",
    description:
      "Loja de suplementos com checkout Stripe e catálogo gerenciado pela Camila. Em validação com a cliente depois do último ciclo de QA.",
    comments: [
      {
        id: "c2-1",
        author: MOCK_AUTHOR,
        createdAt: "2026-08-14T11:05",
        body: "Mandei o ambiente de homologação. Aguardando o ok dela no fluxo de cupom.",
      },
    ],
    deal: { kind: "installment", amount: 24500, installments: 5 },
    tools: [
      {
        id: "vercel",
        name: "Vercel",
        category: "deploy",
        account: "rodrigoaraujo7 (GitHub)",
        billing: {
          amount: 20,
          cycle: "monthly",
          nextInvoice: "2026-09-12",
          payer: "me",
        },
        secrets: [],
      },
      {
        id: "stripe",
        name: "Stripe",
        category: "payments",
        account: "financeiro@nutri.com.br (client)",
        billing: {
          amount: 0.99,
          cycle: "one-off",
          nextInvoice: "2026-08-20",
          payer: "client",
        },
        secrets: [
          { key: "STRIPE_SECRET_KEY", value: "sk_test_example" },
          { key: "STRIPE_WEBHOOK_SECRET", value: "whsec_example" },
        ],
      },
      {
        id: "sentry",
        name: "Sentry",
        category: "observability",
        secrets: [{ key: "SENTRY_DSN", value: "https://example@sentry.io/1" }],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/nutri-store",
      url: "https://github.com/rodrigoaraujo7/nutri-store",
      workflow: "failure",
    },
  },
  {
    id: "3",
    name: "App de Agendamento",
    clientId: "contact-3",
    status: "queued",
    startedAt: "2026-08-25",
    description:
      "Agenda online para o Studio Belle, com lembretes por WhatsApp via Twilio. Ainda na fila, começando depois do Portal.",
    deal: { kind: "upfront", amount: 7200 },
    tools: [
      {
        id: "railway",
        name: "Railway",
        category: "deploy",
        account: MY_ACCOUNT,
        billing: {
          amount: 25,
          cycle: "monthly",
          nextInvoice: "2026-09-03",
          payer: "me",
        },
        secrets: [{ key: "DATABASE_URL", value: "postgres://example" }],
      },
      {
        id: "twilio",
        name: "Twilio",
        category: "communication",
        account: "contato@studiobelle.com",
        billing: {
          amount: 80,
          cycle: "monthly",
          nextInvoice: "2026-09-10",
          payer: "client",
        },
        secrets: [
          { key: "TWILIO_ACCOUNT_SID", value: "AC_example" },
          { key: "TWILIO_AUTH_TOKEN", value: "token_example" },
        ],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/agenda-belle",
      url: "https://github.com/rodrigoaraujo7/agenda-belle",
      workflow: "none",
    },
  },
  {
    id: "4",
    name: "Dashboard Logística",
    clientId: "contact-4",
    status: "paused",
    startedAt: "2026-02-05",
    description:
      "Painel de rotas e faturamento da TransRápido. Pausado até o cliente quitar a parcela atrasada.",
    comments: [
      {
        id: "c4-1",
        author: MOCK_AUTHOR,
        createdAt: "2026-06-18T14:20",
        body: "Parei o desenvolvimento. Datadog continua rodando na conta deles.",
      },
      {
        id: "c4-2",
        author: MOCK_AUTHOR,
        createdAt: "2026-07-22T09:00",
        body: "Financeiro cobrou de novo hoje. Sem resposta ainda.",
      },
    ],
    deal: { kind: "installment", amount: 31000, installments: 4 },
    tools: [
      {
        id: "aws",
        name: "AWS",
        category: "deploy",
        account: MY_ACCOUNT,
        billing: {
          amount: 780,
          cycle: "monthly",
          nextInvoice: "2026-09-05",
          payer: "client",
        },
        secrets: [{ key: "AWS_ACCESS_KEY_ID", value: "AKIA_example" }],
      },
      {
        id: "datadog",
        name: "Datadog",
        category: "observability",
        account: "ops@transrapido.com.br (client)",
        billing: {
          amount: 1500,
          cycle: "yearly",
          nextInvoice: "2027-02-01",
          payer: "client",
        },
        secrets: [{ key: "DD_API_KEY", value: "dd_example" }],
      },
      {
        id: "posthog",
        name: "PostHog",
        category: "analytics",
        secrets: [{ key: "POSTHOG_KEY", value: "phc_example" }],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/transrapido-dash",
      url: "https://github.com/rodrigoaraujo7/transrapido-dash",
      workflow: "success",
    },
  },
  {
    id: "5",
    name: "Landing Page Institucional",
    clientId: "contact-5",
    status: "completed",
    startedAt: "2025-09-15",
    description:
      "Site institucional da Advocacia Prado. Entregue em novembro; Plausible continua no ar na minha conta.",
    endedAt: "2025-11-30",
    deal: { kind: "upfront", amount: 3500 },
    tools: [
      { id: "vercel", name: "Vercel", category: "deploy", secrets: [] },
      {
        id: "plausible",
        name: "Plausible",
        category: "analytics",
        account: MY_ACCOUNT,
        billing: {
          amount: 90,
          cycle: "yearly",
          nextInvoice: "2026-11-14",
          payer: "me",
        },
        secrets: [],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/prado-site",
      url: "https://github.com/rodrigoaraujo7/prado-site",
      workflow: "success",
    },
  },
  {
    id: "6",
    name: "API de Integração ERP",
    clientId: "contact-6",
    status: "in-development",
    startedAt: "2026-04-03",
    description:
      "Ponte entre o e-commerce da Distribuidora Norte e o TOTVS Protheus. A parte mais cara da carteira, ainda em desenvolvimento.",
    comments: [
      {
        id: "c6-1",
        author: MOCK_AUTHOR,
        createdAt: "2026-04-08T10:00",
        body: "Kickoff com o time de integração deles. Token do Protheus já está no Railway.",
      },
      {
        id: "c6-2",
        author: MOCK_AUTHOR,
        createdAt: "2026-07-30T18:12",
        body: "Sentry está barulhento no sync noturno. Investigar o timeout do Protheus.",
      },
      {
        id: "c6-3",
        author: MOCK_AUTHOR,
        createdAt: "2026-08-15T08:45",
        body: "CI ainda rodando o último PR de retry.",
      },
    ],
    deal: { kind: "installment", amount: 42000, installments: 6 },
    tools: [
      {
        id: "railway",
        name: "Railway",
        category: "deploy",
        account: "dev@distnorte.com.br (client)",
        billing: {
          amount: 45,
          cycle: "monthly",
          nextInvoice: "2026-09-08",
          payer: "client",
        },
        secrets: [{ key: "DATABASE_URL", value: "postgres://example" }],
      },
      {
        id: "neon",
        name: "Neon",
        category: "database",
        account: MY_ACCOUNT,
        billing: {
          amount: 19,
          cycle: "monthly",
          nextInvoice: "2026-09-02",
          payer: "me",
        },
        secrets: [{ key: "NEON_DATABASE_URL", value: "postgres://example" }],
      },
      {
        id: "sentry",
        name: "Sentry",
        category: "observability",
        account: MY_ACCOUNT,
        billing: {
          amount: 26,
          cycle: "monthly",
          nextInvoice: "2026-09-15",
          payer: "me",
        },
        secrets: [{ key: "SENTRY_DSN", value: "https://example@sentry.io/2" }],
      },
      {
        id: "betterstack",
        name: "Better Stack",
        category: "observability",
        secrets: [],
      },
      {
        id: "other",
        name: "TOTVS Protheus API",
        category: "other",
        account: "integra@distnorte.com.br (client)",
        secrets: [{ key: "PROTHEUS_TOKEN", value: "tk_example" }],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/erp-bridge",
      url: "https://github.com/rodrigoaraujo7/erp-bridge",
      workflow: "running",
    },
  },
  {
    id: "7",
    name: "Sistema de Chamados",
    clientId: "contact-7",
    status: "queued",
    startedAt: "2026-09-10",
    description:
      "Help desk interno da Clínica Vitalis. Ainda sem repositório — começa em setembro.",
    deal: { kind: "upfront", amount: 9800 },
    tools: [
      { id: "supabase", name: "Supabase", category: "database", secrets: [] },
    ],
    repo: null,
  },
  // The only non-BRL deal in the mock — it is what makes the dashboard's
  // currency filter show its work: switching to USD leaves this project alone
  // on screen, and BRL reports it as excluded instead of adding it in.
  {
    id: "9",
    name: "Onboarding SaaS",
    clientId: "contact-9",
    status: "in-development",
    startedAt: "2026-06-15",
    description:
      "Fluxo de onboarding da Northwind Labs, cobrado em USD. Wizard com dicas geradas via OpenAI.",
    deal: { kind: "installment", amount: 9000, installments: 3, currency: "USD" },
    tools: [
      {
        id: "vercel",
        name: "Vercel",
        category: "deploy",
        account: "rodrigoaraujo7 (GitHub)",
        billing: {
          amount: 20,
          cycle: "monthly",
          nextInvoice: "2026-09-12",
          payer: "me",
          currency: "USD",
        },
        secrets: [],
      },
      {
        id: "openai",
        name: "OpenAI",
        category: "ai",
        account: "rodrigo@fastbuilt.com.br",
        billing: {
          amount: 120,
          cycle: "monthly",
          nextInvoice: "2026-09-01",
          payer: "client",
          currency: "USD",
        },
        secrets: [{ key: "OPENAI_API_KEY", value: "sk-proj-example" }],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/northwind-onboarding",
      url: "https://github.com/rodrigoaraujo7/northwind-onboarding",
      workflow: "success",
    },
  },
  {
    id: "8",
    name: "Blog Técnico",
    clientId: "contact-8",
    status: "completed",
    startedAt: "2025-03-02",
    description: "Blog pessoal no Cloudflare Pages. Projeto grátis, já encerrado.",
    endedAt: "2025-06-20",
    deal: { kind: "upfront", amount: 0 },
    tools: [
      { id: "cloudflare", name: "Cloudflare", category: "deploy", secrets: [] },
      { id: "umami", name: "Umami", category: "analytics", secrets: [] },
    ],
    repo: {
      fullName: "rodrigoaraujo7/blog",
      url: "https://github.com/rodrigoaraujo7/blog",
      workflow: "success",
    },
  },
]
