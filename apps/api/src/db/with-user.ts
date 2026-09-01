import { sql } from 'drizzle-orm'

// Drizzle's postgres-js and pglite transaction types don't share a useful
// union. Isolation tests cover the runtime contract.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tx = any

export async function withUser<T>(
  db: { transaction: <R>(fn: (tx: Tx) => Promise<R>) => Promise<R> },
  userId: string,
  fn: (tx: Tx) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role app_runtime`)
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`)
    return fn(tx)
  })
}
