import { auditRouter } from "../../routers/audit/index.ts"
import { contactsRouter } from "../../routers/contacts/index.ts"
import { credentialsRouter } from "../../routers/credentials/index.ts"
import { dashboardRouter } from "../../routers/dashboard/index.ts"
import { githubRouter } from "../../routers/github/index.ts"
import { invoicesRouter, paymentsRouter } from "../../routers/invoices/index.ts"
import { projectsRouter } from "../../routers/projects/index.ts"
import { toolsRouter } from "../../routers/tools/index.ts"
import { router } from "../init/index.ts"

export const appRouter = router({
  audit: auditRouter,
  contacts: contactsRouter,
  dashboard: dashboardRouter,
  github: githubRouter,
  projects: projectsRouter,
  tools: toolsRouter,
  invoices: invoicesRouter,
  payments: paymentsRouter,
  credentials: credentialsRouter,
})

export type AppRouter = typeof appRouter
