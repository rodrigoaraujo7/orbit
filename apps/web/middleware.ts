export const config = { matcher: ["/api/:path*", "/trpc/:path*"] }

const PRODUCTION_API_ORIGIN = "https://api-production-b70f.up.railway.app"

function previewApiOrigin(env: { VERCEL_ENV?: string; VERCEL_GIT_PULL_REQUEST_ID?: string }) {
  const pullRequest = env.VERCEL_GIT_PULL_REQUEST_ID?.trim()
  // The first deployment of a branch is created before the pull request
  // exists, so this id is empty and `/api` stays on production. A later web
  // deploy, after the pull request is open, receives the id.
  if (env.VERCEL_ENV === "preview" && pullRequest) {
    return `https://api-projects-manager-pr-${pullRequest}.up.railway.app`
  }
  return PRODUCTION_API_ORIGIN
}

export default function middleware(request: Request) {
  const { pathname, search } = new URL(request.url)
  const destination = new URL(`${pathname}${search}`, previewApiOrigin(process.env))
  return new Response(null, {
    headers: { "x-middleware-rewrite": destination.href },
  })
}
