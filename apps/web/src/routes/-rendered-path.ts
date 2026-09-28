const ROOT_ROUTE_ID = "__root__"

export type RenderedMatch = {
  pathname?: string
  routeId?: string
}

/**
 * The address bar updates before the matched page does. Keep the mounted
 * private page's path until that page is gone, so the shell does not drop
 * its providers while the old page is still on screen.
 */
export function renderedPathname(
  locationPathname: string,
  status: string | undefined,
  matches: Array<RenderedMatch> | undefined,
  isPublicPath: (path: string) => boolean,
) {
  if (status !== "pending" || !matches?.length) return locationPathname
  const leaf = matches[matches.length - 1]
  const rendered = leaf?.pathname
  if (!rendered || leaf.routeId === ROOT_ROUTE_ID) return locationPathname
  if (!isPublicPath(rendered) && isPublicPath(locationPathname)) return rendered
  return locationPathname
}

/** A not-found or error match is only final once the navigation has settled. */
export function showStopScreen(
  status: string | undefined,
  isNotFound: boolean,
  isRouteError: boolean,
) {
  return status !== "pending" && (isNotFound || isRouteError)
}
