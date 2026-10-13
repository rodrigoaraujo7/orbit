import { rewrite } from "@vercel/functions"
import { apiRewriteUrl } from "./src/lib/api-origin/index.ts"
import { forwardedVisitorHeaders } from "./src/lib/visitor-ip/index.ts"

export const config = { matcher: ["/api/:path*", "/trpc/:path*"] }

export default function middleware(request: Request) {
  const destination = apiRewriteUrl(request.url, process.env)
  return rewrite(destination, {
    request: { headers: forwardedVisitorHeaders(request.headers) },
  })
}
