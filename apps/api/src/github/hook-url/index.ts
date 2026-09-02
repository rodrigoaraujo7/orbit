import { optionalEnv } from "../../env/index.ts"
import { webOrigin } from "../../web-origin/index.ts"

export const WEBHOOK_PATH = "/api/github/webhook"

/**
 * Where GitHub should POST deliveries. Defaults to the web origin, since the
 * dev proxy and the usual deploy put web and api behind the same host; set
 * PUBLIC_API_URL when the API answers somewhere else, such as a tunnel opened
 * to reach a local install.
 */
export function webhookUrl(hookId: string) {
  const base = (optionalEnv("PUBLIC_API_URL") ?? webOrigin).replace(/\/+$/, "")
  return `${base}${WEBHOOK_PATH}/${hookId}`
}
