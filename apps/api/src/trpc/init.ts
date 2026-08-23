import { initTRPC, TRPCError } from "@trpc/server"
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch"
import { getAuth } from "../auth.ts"
import { getDb } from "../db/client.ts"
import { withUser, type Tx } from "../db/with-user.ts"

export async function createContext(opts: FetchCreateContextFnOptions) {
  const session = await getAuth().api.getSession({ headers: opts.req.headers })
  return {
    db: getDb(),
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
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" })
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      userId: ctx.user.id,
    },
  })
})

export function asUser<T>(ctx: { db: Context["db"]; userId: string }, fn: (tx: Tx) => Promise<T>) {
  return withUser(ctx.db, ctx.userId, fn)
}
