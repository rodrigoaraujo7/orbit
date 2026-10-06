import { apiRewriteUrl } from "./src/lib/api-origin/index.ts"

export const config = { matcher: ["/api/:path*", "/trpc/:path*"] }

export default function middleware(request: Request) {
  const destination = apiRewriteUrl(request.url, process.env)
  return new Response(null, {
    headers: { "x-middleware-rewrite": destination.href },
  })
}
