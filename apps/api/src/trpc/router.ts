import { auditRouter } from "../routers/audit.ts"
import { contactsRouter } from "../routers/contacts.ts"
import { credentialsRouter } from "../routers/credentials.ts"
import { invoicesRouter, paymentsRouter } from "../routers/invoices.ts"
import { projectsRouter } from "../routers/projects.ts"
import { toolsRouter } from "../routers/tools.ts"
import { router } from "./init.ts"

export const appRouter = router({
  audit: auditRouter,
  contacts: contactsRouter,
  projects: projectsRouter,
  tools: toolsRouter,
  invoices: invoicesRouter,
  payments: paymentsRouter,
  credentials: credentialsRouter,
})

export type AppRouter = typeof appRouter
