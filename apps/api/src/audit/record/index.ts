import type { AuditChange, AuditModule } from 'shared'
import { auditLog } from '../../db/schema/index.ts'
import type { Tx } from '../../db/with-user/index.ts'

export type AuditCtx = {
  userId: string
  ip?: string | null
  userAgent?: string | null
}

export async function recordAudit(
  tx: Tx,
  ctx: AuditCtx,
  entry: {
    module: AuditModule
    action: string
    subjectId?: string | null
    subjectLabel?: string | null
    projectId?: string | null
    changes?: AuditChange[]
  },
) {
  await tx.insert(auditLog).values({
    id: crypto.randomUUID(),
    userId: ctx.userId,
    module: entry.module,
    action: entry.action,
    subjectId: entry.subjectId ?? null,
    subjectLabel: entry.subjectLabel ?? null,
    projectId: entry.projectId ?? null,
    changes: entry.changes ?? [],
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
  })
}
