import { buildDashboardMetrics, dashboardFiltersSchema, toDashboardFilters } from 'shared'
import { contact } from '../db/schema.ts'
import { asUser, protectedProcedure, router } from '../trpc/init.ts'
import { listProjects } from './projects.ts'

export const dashboardRouter = router({
  metrics: protectedProcedure.input(dashboardFiltersSchema.optional()).query(({ ctx, input }) =>
    asUser(ctx, async (tx) => {
      const projects = await listProjects(tx, ctx.userId)
      const contacts = await tx.select({ id: contact.id, name: contact.name }).from(contact)
      return buildDashboardMetrics(projects, toDashboardFilters(input), contacts)
    }),
  ),
})
