import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { renderWithProviders } from "@/test/render"
import enUS from "@/i18n/en-US.json"
import ptBR from "@/i18n/pt-BR.json"

import { LoadingScreen } from "./index"

const indexHtml = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../../index.html"),
  "utf8",
)

afterEach(() => {
  cleanup()
})

describe("LoadingScreen", () => {
  it("holds the viewport with the brand while the app is opening", () => {
    renderWithProviders(<LoadingScreen />)
    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-busy", "true")
    expect(status).toHaveTextContent("Projects Manager")
    expect(status).toHaveTextContent("Opening your workspace…")
    expect(status.querySelector("[class*='animate-spin']")).toBeTruthy()
  })

  it("replaces the spinner with the failure message", () => {
    renderWithProviders(<LoadingScreen message="Could not load the data." />)
    const alert = screen.getByRole("alert")
    expect(alert).not.toHaveAttribute("aria-busy")
    expect(alert).toHaveTextContent("Could not load the data.")
    expect(alert.querySelector("[class*='animate-spin']")).toBeNull()
  })

  it("keeps the pre-React splash copy aligned with both catalogs", () => {
    expect(indexHtml).toContain(enUS.common.openingWorkspace)
    expect(indexHtml).toContain(ptBR.common.openingWorkspace)
    expect(indexHtml).toContain(enUS.auth.brand)
    expect(indexHtml).toContain('id="boot"')
    expect(indexHtml).toContain('role="status"')
  })
})
