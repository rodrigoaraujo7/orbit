import { readFileSync } from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { afterEach, describe, expect, it, vi } from "vitest"
import middleware, { config } from "./middleware"

const webRoot = dirname(fileURLToPath(import.meta.url))

/**
 * `@vercel/node` compiles `middleware.ts` with `apps/web/tsconfig.json` and,
 * when `module` is unset, NodeNext. The deployed file is ESM. A `.ts` import
 * specifier survives that emit unless `rewriteRelativeImportExtensions` is on,
 * and Node then fails to load the helper (`ERR_MODULE_NOT_FOUND`).
 */
function emitMiddlewareForVercel(): string {
  const configPath = `${webRoot}/tsconfig.json`
  const sourcePath = `${webRoot}/middleware.ts`
  const source = readFileSync(sourcePath, "utf8")
  const read = ts.readConfigFile(configPath, ts.sys.readFile)
  const raw = read.config as { compilerOptions?: Record<string, unknown> }
  const compilerOptions: Record<string, unknown> = {
    ...(raw.compilerOptions ?? {}),
    noEmit: false,
    declaration: false,
  }
  if (compilerOptions.module === undefined) {
    compilerOptions.module = "NodeNext"
    compilerOptions.moduleResolution = "NodeNext"
  }
  const parsed = ts.parseJsonConfigFileContent(
    { ...raw, compilerOptions },
    ts.sys,
    webRoot,
    undefined,
    configPath,
  )
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [sourcePath],
    getScriptVersion: () => "1",
    getScriptSnapshot: (fileName) => {
      const text = fileName === sourcePath ? source : ts.sys.readFile(fileName)
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text)
    },
    getCurrentDirectory: () => webRoot,
    getCompilationSettings: () => parsed.options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
  }
  const output = ts.createLanguageService(host).getEmitOutput(sourcePath)
  const javascript = output.outputFiles.find((file) => file.name.endsWith(".js"))
  if (!javascript || output.emitSkipped) {
    throw new Error("middleware emit produced no JavaScript")
  }
  return javascript.text
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("vercel middleware", () => {
  it("only runs for the API and tRPC paths", () => {
    expect(config.matcher).toEqual(["/api/:path*", "/trpc/:path*"])
  })

  it("rewrites a PR preview request to that PR's API", () => {
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_GIT_PULL_REQUEST_ID", "23")
    const request = new Request("https://preview.example.com/trpc/projects.list?batch=1")

    const response = middleware(request)

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://api-orbit-pr-23.up.railway.app/trpc/projects.list?batch=1",
    )
  })

  it("rewrites a production request to the production API", () => {
    vi.stubEnv("VERCEL_ENV", "production")
    vi.stubEnv("VERCEL_GIT_PULL_REQUEST_ID", "")

    const response = middleware(new Request("https://app.example.com/api/auth/session"))

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://api.orbit.rodrigoleite.dev/api/auth/session",
    )
  })

  it("emits a .js import the Node middleware runtime can load", () => {
    const emitted = emitMiddlewareForVercel()

    expect(emitted).toContain('from "./src/lib/api-origin/index.js"')
    expect(emitted).not.toContain("api-origin/index.ts")
  })
})
