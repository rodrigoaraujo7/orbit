import { and, asc, desc, eq, gt, gte, ilike, inArray, lt, lte, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { auditModuleSchema, type AuditChange, type AuditModule } from 'shared'
import { auditLog } from '../db/schema.ts'
import type { Tx } from '../db/with-user.ts'
import { asUser, protectedProcedure, router } from '../trpc/init.ts'

const cursorSchema = z.object({
  createdAt: z.string(),
  id: z.string(),
  module: z.string().optional(),
})

export const listInput = z.object({
  search: z.string().trim().optional(),
  modules: z.array(auditModuleSchema).optional(),
  projectId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  cursor: cursorSchema.nullish(),
  limit: z.number().int().min(1).max(50).default(25),
  sortBy: z.enum(['createdAt', 'module']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

export type AuditListInput = z.infer<typeof listInput>

function bound(value: string, edge: 'start' | 'end') {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${edge === 'start' ? '00:00:00.000Z' : '23:59:59.999Z'}`)
  }
  return new Date(value)
}

function escapeIlike(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

const moduleRank = sql`CASE ${auditLog.module}
  WHEN 'settings' THEN 1
  WHEN 'kanban' THEN 2
  WHEN 'project' THEN 3
  WHEN 'security' THEN 4
  ELSE 5
END`

export async function listAuditLogs(tx: Tx, input: AuditListInput) {
  const limit = input.limit ?? 25
  const sortBy = input.sortBy ?? 'createdAt'
  const sortDir = input.sortDir ?? 'desc'
  const conditions = []

  if (input.modules && input.modules.length > 0) {
    conditions.push(inArray(auditLog.module, input.modules as AuditModule[]))
  }
  if (input.projectId) conditions.push(eq(auditLog.projectId, input.projectId))
  if (input.from) conditions.push(gte(auditLog.createdAt, bound(input.from, 'start')))
  if (input.to) conditions.push(lte(auditLog.createdAt, bound(input.to, 'end')))
  if (input.search) {
    const q = `%${escapeIlike(input.search)}%`
    conditions.push(
      or(
        ilike(auditLog.subjectLabel, q),
        ilike(auditLog.action, q),
        sql`${auditLog.changes}::text ilike ${q}`,
      ),
    )
  }
  if (input.cursor) {
    const createdAt = new Date(input.cursor.createdAt)
    const afterInDateDesc = or(
      lt(auditLog.createdAt, createdAt),
      and(eq(auditLog.createdAt, createdAt), lt(auditLog.id, input.cursor.id)),
    )
    if (sortBy === 'module') {
      const cursorRank =
        input.cursor.module === 'settings'
          ? 1
          : input.cursor.module === 'kanban'
            ? 2
            : input.cursor.module === 'project'
              ? 3
              : input.cursor.module === 'security'
                ? 4
                : 5
      const pastRank =
        sortDir === 'asc' ? sql`${moduleRank} > ${cursorRank}` : sql`${moduleRank} < ${cursorRank}`
      conditions.push(or(pastRank, and(sql`${moduleRank} = ${cursorRank}`, afterInDateDesc)))
    } else if (sortDir === 'asc') {
      conditions.push(
        or(
          gt(auditLog.createdAt, createdAt),
          and(eq(auditLog.createdAt, createdAt), gt(auditLog.id, input.cursor.id)),
        ),
      )
    } else {
      conditions.push(afterInDateDesc)
    }
  }

  const dateOrder =
    sortDir === 'asc'
      ? [asc(auditLog.createdAt), asc(auditLog.id)]
      : [desc(auditLog.createdAt), desc(auditLog.id)]
  const orderBy =
    sortBy === 'module'
      ? [
          sortDir === 'asc' ? asc(moduleRank) : desc(moduleRank),
          desc(auditLog.createdAt),
          desc(auditLog.id),
        ]
      : dateOrder

  const rows = await tx
    .select()
    .from(auditLog)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(...orderBy)
    .limit(limit + 1)

  const extra = rows.length > limit
  const page = extra ? rows.slice(0, limit) : rows
  const last = page[page.length - 1]
  return {
    items: page.map((row: typeof auditLog.$inferSelect) => ({
      id: row.id,
      module: row.module,
      action: row.action,
      subjectId: row.subjectId,
      subjectLabel: row.subjectLabel,
      projectId: row.projectId,
      changes: row.changes as AuditChange[],
      createdAt: row.createdAt.toISOString(),
      ip: row.ip ?? null,
      userAgent: row.userAgent ?? null,
    })),
    nextCursor:
      extra && last
        ? { createdAt: last.createdAt.toISOString(), id: last.id, module: last.module }
        : null,
  }
}

export const auditRouter = router({
  list: protectedProcedure
    .input(listInput)
    .query(({ ctx, input }) => asUser(ctx, (tx) => listAuditLogs(tx, input))),
})
