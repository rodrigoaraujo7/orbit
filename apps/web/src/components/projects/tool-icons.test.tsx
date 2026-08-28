import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ToolIcon } from "./tool-icons"
import { renderWithProviders } from "@/test/render"

afterEach(() => {
  cleanup()
})

describe("ToolIcon", () => {
  it("renders catalog icons and the wrench fallback", () => {
    const { container } = renderWithProviders(
      <>
        <ToolIcon id="vercel" className="size-4" />
        <ToolIcon id="aws" />
        <ToolIcon id="not-a-tool" />
      </>,
    )
    expect(container.querySelectorAll("svg").length).toBe(3)
    expect(screen.queryByText("vercel")).toBeNull()
  })
})
