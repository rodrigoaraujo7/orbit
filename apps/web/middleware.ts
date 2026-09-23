import { rewrite } from "@vercel/functions/middleware"

import { apiRewriteUrl } from "./src/lib/api-origin/index.ts"

export const config = { matcher: ["/api/:path*", "/trpc/:path*"] }

export default function middleware(request: Request) {
  return rewrite(apiRewriteUrl(request.url, process.env))
}
