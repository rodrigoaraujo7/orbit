import { apiRewriteUrl } from "./src/lib/api-origin/index.ts"

export const config = { matcher: ["/api/:path*", "/trpc/:path*"] }

export default function middleware(request: Request) {
  const url = apiRewriteUrl(request.url, process.env)
  const headers = new Headers(request.headers)
  headers.delete("host")
  return fetch(url, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
    duplex: "half",
  })
}
