import { NextResponse, type NextRequest } from "next/server"
import { isLocale, negotiateLocale } from "@/i18n"

/** Where to send a path that has no locale prefix. Null means the request can continue. */
export function localeRedirect(pathname: string, acceptLanguage: string | null): string | null {
  const segment = pathname.split("/").filter(Boolean)[0]
  if (segment && isLocale(segment)) return null
  const locale = negotiateLocale(acceptLanguage)
  if (pathname === "/") return `/${locale}`
  return `/${locale}${pathname}`
}

export function proxy(request: NextRequest) {
  const target = localeRedirect(request.nextUrl.pathname, request.headers.get("accept-language"))
  if (!target) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = target
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|.*\\..*).*)"],
}
