import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { branchWorkflowStatus } from "shared"
import { project } from "../../db/schema/index.ts"
import type { Tx } from "../../db/with-user/index.ts"
import { getRepo, listBranches, listWorkflowRuns, verifyToken } from "../../github/client/index.ts"
import { webhookUrl } from "../../github/hook-url/index.ts"
import { deleteGithubToken, readGithubToken, saveGithubToken } from "../../github/token/index.ts"
import { githubConnectInput, githubProjectInput, githubRunsInput } from "../../input/github.ts"
import { recordAudit } from "../../audit/record/index.ts"
import { asUser, auditCtx, protectedProcedure, router } from "../../trpc/init/index.ts"

const DEFAULT_RUN_LIMIT = 20

async function requireToken(tx: Tx, userId: string) {
  const stored = await readGithubToken(tx, userId)
  if (!stored) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub is not connected" })
  }
  return stored
}

async function requireRepo(tx: Tx, projectId: string) {
  const [row] = await tx.select().from(project).where(eq(project.id, projectId)).limit(1)
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" })
  if (!row.repoFullName) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Project has no repository" })
  }
  return { row, fullName: row.repoFullName }
}

export const githubRouter = router({
  /** Connection state for the settings panel. The token itself never leaves the server. */
  status: protectedProcedure.query(({ ctx }) =>
    asUser(ctx, async (tx) => {
      const stored = await readGithubToken(tx, ctx.userId)
      if (!stored) return { connected: false as const, login: null, webhook: null }
      return {
        connected: true as const,
        login: stored.login,
        webhook: { url: webhookUrl(stored.hookId), secret: stored.hookSecret },
      }
    }),
  ),

  connect: protectedProcedure.input(githubConnectInput).mutation(async ({ ctx, input }) => {
    const { login } = await verifyToken(input.token)
    return asUser(ctx, async (tx) => {
      const { hookId, hookSecret } = await saveGithubToken(tx, ctx.userId, input.token, login)
      await recordAudit(tx, auditCtx(ctx), {
        module: "settings",
        action: "github.connect",
        subjectLabel: login ?? "github",
      })
      return { login, webhook: { url: webhookUrl(hookId), secret: hookSecret } }
    })
  }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await asUser(ctx, async (tx) => {
      await deleteGithubToken(tx, ctx.userId)
      await recordAudit(tx, auditCtx(ctx), {
        module: "settings",
        action: "github.disconnect",
      })
    })
    return { ok: true as const }
  }),

  /** Repository head: default branch plus the branch list behind the select. */
  repo: protectedProcedure.input(githubProjectInput).query(async ({ ctx, input }) => {
    const { token, fullName } = await asUser(ctx, async (tx) => {
      const stored = await requireToken(tx, ctx.userId)
      const { fullName } = await requireRepo(tx, input.projectId)
      return { token: stored.token, fullName }
    })

    const [repo, branches] = await Promise.all([
      getRepo(token, fullName),
      listBranches(token, fullName),
    ])
    return {
      fullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
      isPrivate: repo.isPrivate,
      // A branch deleted on GitHub can still own runs, so never drop the default.
      branches: branches.includes(repo.defaultBranch)
        ? branches
        : [repo.defaultBranch, ...branches],
    }
  }),

  /**
   * Runs for one branch. Reading the default branch also refreshes the cached
   * `repo_workflow`, which is what the projects list badge and its SQL filter
   * read — that column is the only place the status survives a reload.
   */
  runs: protectedProcedure.input(githubRunsInput).query(async ({ ctx, input }) => {
    const { token, fullName } = await asUser(ctx, async (tx) => {
      const stored = await requireToken(tx, ctx.userId)
      const { fullName } = await requireRepo(tx, input.projectId)
      return { token: stored.token, fullName }
    })

    const repo = await getRepo(token, fullName)
    const branch = input.branch || repo.defaultBranch
    const runs = await listWorkflowRuns(token, fullName, branch, input.limit ?? DEFAULT_RUN_LIMIT)
    const workflow = branchWorkflowStatus(runs)
    const isDefaultBranch = branch === repo.defaultBranch

    if (isDefaultBranch) {
      await asUser(ctx, (tx) =>
        tx.update(project).set({ repoWorkflow: workflow }).where(eq(project.id, input.projectId)),
      )
    }

    return { branch, defaultBranch: repo.defaultBranch, isDefaultBranch, workflow, runs }
  }),
})
