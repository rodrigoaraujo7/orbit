import { initTRPC, TRPCError } from '@trpc/server'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { getAuth } from '../auth.ts'
import { getDb } from '../db/client.ts'
import { withUser, type Tx } from '../db/with-user.ts'

export async function createContext(opts: FetchCreateContextFnOptions) {
  const session = await getAuth().api.getSession({ headers: opts.req.headers })
  return {
    session,
    user: session?.user ?? null,
    req: opts.req,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      userId: ctx.user.id,
    },
  })
})

export function asUser<T>(ctx: { userId: string }, fn: (tx: Tx) => Promise<T>) {
  return withUser(getDb(), ctx.userId, fn)
}

export function auditCtx(ctx: { userId: string; req: Request }) {
  return {
    userId: ctx.userId,
    ip: ctx.req.headers.get('x-forwarded-for'),
    userAgent: ctx.req.headers.get('user-agent'),
  }
}
