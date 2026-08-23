import { contactsRouter } from "../routers/contacts.ts"
import { credentialsRouter } from "../routers/credentials.ts"
import { invoicesRouter, paymentsRouter } from "../routers/invoices.ts"
import { projectsRouter } from "../routers/projects.ts"
import { toolsRouter } from "../routers/tools.ts"
import { router } from "./init.ts"

export const appRouter = router({
  contacts: contactsRouter,
  projects: projectsRouter,
  tools: toolsRouter,
  invoices: invoicesRouter,
  payments: paymentsRouter,
  credentials: credentialsRouter,
})

export type AppRouter = typeof appRouter
