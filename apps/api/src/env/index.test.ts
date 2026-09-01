import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { env, loadDotEnv, optionalEnv } from "./index.ts"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("loadDotEnv", () => {
  it("is a no-op when the file is missing", () => {
    expect(() => loadDotEnv(join(tmpdir(), "definitely-missing.env"))).not.toThrow()
  })

  it("parses exports, comments, quotes and skips invalid lines without overwriting", () => {
    const dir = mkdtempSync(join(tmpdir(), "dotenv-"))
    const file = join(dir, ".env")
    writeFileSync(
      file,
      [
        "# comment",
        "",
        "export QUOTED=\"hello world\"",
        "SINGLE='one'",
        "PLAIN=plain",
        "NOVALUE",
        "=emptykey",
        "ALREADY=keep",
      ].join("\n"),
    )
    vi.stubEnv("ALREADY", "existing")
    loadDotEnv(file)
    expect(process.env.QUOTED).toBe("hello world")
    expect(process.env.SINGLE).toBe("one")
    expect(process.env.PLAIN).toBe("plain")
    expect(process.env.ALREADY).toBe("existing")
  })
})

describe("env helpers", () => {
  it("returns optional values and throws when required ones are missing", () => {
    vi.stubEnv("PRESENT", "yes")
    expect(optionalEnv("PRESENT")).toBe("yes")
    expect(optionalEnv("ABSENT_FOR_SURE")).toBeUndefined()
    expect(env("PRESENT")).toBe("yes")
    expect(() => env("ABSENT_FOR_SURE")).toThrow(/missing env ABSENT_FOR_SURE/)
  })
})
