import { afterEach, describe, expect, it, vi } from "vitest"
import { INSECURE_BETTER_AUTH_SECRET } from "../auth/secret/index.ts"
import { INVALID_AUTH_TRUSTED_ORIGIN } from "../auth/trusted-origins/index.ts"

const { serve, mountApi, applySchema, createDb } = vi.hoisted(() => ({
  serve: vi.fn((opts: { port: number }, cb: (info: { port: number }) => void) => {
    cb({ port: opts.port })
    return { close: vi.fn() }
  }),
  mountApi: vi.fn(),
  applySchema: vi.fn().mockResolvedValue(undefined),
  createDb: vi.fn(() => ({ client: {} })),
}))

vi.mock("@hono/node-server", () => ({ serve }))
vi.mock("../mount/index.ts", () => ({ mountApi }))
vi.mock("../db/client/index.ts", () => ({ createDb, applySchema, getDb: vi.fn() }))

import { start } from "./index.ts"

describe("start", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    serve.mockClear()
    mountApi.mockClear()
    createDb.mockClear()
    applySchema.mockClear()
  })

  it("throws without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "")
    await expect(start()).rejects.toThrow(/missing env DATABASE_URL/)
  })

  it("throws when DATABASE_URL is blank", async () => {
    vi.stubEnv("DATABASE_URL", "   ")
    await expect(start()).rejects.toThrow(/missing env DATABASE_URL/)
    expect(createDb).not.toHaveBeenCalled()
  })

  it("throws without BETTER_AUTH_SECRET", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test")
    delete process.env.BETTER_AUTH_SECRET
    await expect(start()).rejects.toThrow(/missing env BETTER_AUTH_SECRET/)
    expect(createDb).not.toHaveBeenCalled()
  })

  it("throws when BETTER_AUTH_SECRET is the known insecure default", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test")
    vi.stubEnv("BETTER_AUTH_SECRET", INSECURE_BETTER_AUTH_SECRET)
    await expect(start()).rejects.toThrow(/known insecure default/)
    expect(createDb).not.toHaveBeenCalled()
  })

  it("throws when AUTH_TRUSTED_ORIGIN is a wildcard", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test")
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    vi.stubEnv("AUTH_TRUSTED_ORIGIN", "https://*.ngrok-free.app")
    await expect(start()).rejects.toThrow(INVALID_AUTH_TRUSTED_ORIGIN)
    expect(createDb).not.toHaveBeenCalled()
  })

  it("warns without a Better Auth API key and listens", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test")
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    vi.stubEnv("BETTER_AUTH_API_KEY", "   ")
    delete process.env.PORT
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    await start()
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^missing BETTER_AUTH_API_KEY/))
    expect(createDb).toHaveBeenCalled()
    expect(applySchema).toHaveBeenCalled()
    expect(mountApi).toHaveBeenCalled()
    expect(serve).toHaveBeenCalledWith(
      expect.objectContaining({ port: 3000 }),
      expect.any(Function),
    )
    expect(log).toHaveBeenCalledWith("api listening on 3000")
    warn.mockRestore()
    log.mockRestore()
  })

  it("warns about a weak Better Auth API key", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test")
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    vi.stubEnv("BETTER_AUTH_API_KEY", "key")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "log").mockImplementation(() => {})
    await start()
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^weak BETTER_AUTH_API_KEY/))
    warn.mockRestore()
  })

  it("honours an explicit port and stays quiet with a strong key", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test")
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    vi.stubEnv("BETTER_AUTH_API_KEY", "ba-infra-3f9c1d7e5a2b8046acde1975")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "log").mockImplementation(() => {})
    await start({ port: 3100 })
    expect(warn).not.toHaveBeenCalled()
    expect(serve).toHaveBeenCalledWith(
      expect.objectContaining({ port: 3100 }),
      expect.any(Function),
    )
    warn.mockRestore()
  })
})
