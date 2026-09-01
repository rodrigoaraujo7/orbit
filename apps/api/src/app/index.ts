import { Hono } from "hono"
import { cors } from "hono/cors"
import { secureHeaders } from "hono/secure-headers"
import { bodyLimit } from "hono/body-limit"
import { trustedWebOrigins } from "../web-origin/index.ts"

const corsOrigins = [...trustedWebOrigins, "https://dash.better-auth.com"]

export const app = new Hono()

app.use(
  "*",
  cors({
    origin: corsOrigins,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
)
app.use("*", secureHeaders())
app.use("*", bodyLimit({ maxSize: 1024 * 1024 }))

app.get("/health", (c) => c.json({ ok: true }))

app.notFound((c) => c.json({ error: "not_found" }, 404))
