import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

export function loadDotEnv(file = join(import.meta.dirname, "../.env")) {
  if (!existsSync(file)) return
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const cut = line.startsWith("export ") ? line.slice(7) : line
    const eq = cut.indexOf("=")
    if (eq <= 0) continue
    const key = cut.slice(0, eq).trim()
    let value = cut.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] ??= value
  }
}

loadDotEnv()

export function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`missing env ${name}`)
  return value
}

export function optionalEnv(name: string) {
  return process.env[name]
}
