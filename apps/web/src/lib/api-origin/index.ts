export const PRODUCTION_API_ORIGIN = "https://api-production-b70f.up.railway.app"

type ApiOriginEnv = {
  VERCEL_ENV?: string
  VERCEL_GIT_PULL_REQUEST_ID?: string
}

/**
 * Where `/api` and `/trpc` are proxied to. A PR preview talks to the API of
 * its own Railway PR environment; everything else talks to production.
 *
 * Railway names a PR environment `orbit-pr-<N>` and gives the `api`
 * service the domain `api-<environment>.up.railway.app`, so the URL follows
 * from the PR number alone. A branch previewed before its PR is opened has no
 * PR number yet and falls back to production.
 */
export function apiOrigin(env: ApiOriginEnv): string {
  const pullRequest = env.VERCEL_GIT_PULL_REQUEST_ID?.trim()
  if (env.VERCEL_ENV === "preview" && pullRequest) {
    return `https://api-orbit-pr-${pullRequest}.up.railway.app`
  }
  return PRODUCTION_API_ORIGIN
}

/** Same path and query, on the API host. */
export function apiRewriteUrl(requestUrl: string, env: ApiOriginEnv): URL {
  const { pathname, search } = new URL(requestUrl)
  return new URL(`${pathname}${search}`, apiOrigin(env))
}
