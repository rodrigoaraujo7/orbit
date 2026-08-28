import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { sampleTool } from "@/test/fixtures"
import { ToolDetails } from "./tool-details"
import { renderWithProviders } from "@/test/render"

const toastAdd = vi.fn()

vi.mock("@/components/ui/toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/toast")>()
  return { ...actual, toast: { add: (...args: unknown[]) => toastAdd(...args) } }
})

afterEach(() => {
  cleanup()
  toastAdd.mockClear()
})

describe("ToolDetails", () => {
  it("renders billing, secrets, copy success and reveal", async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })
    renderWithProviders(<ToolDetails tool={sampleTool} />)
    expect(screen.getAllByText("Vercel").length).toBeGreaterThan(0)
    expect(screen.getByText(/Account:/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reveal" }))
    expect(screen.getByText("secret-value")).toBeInTheDocument()
    await user.click(screen.getByText("secret-value"))
    expect(writeText).toHaveBeenCalledWith("secret-value")
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "success" }))
    await user.click(screen.getByRole("button", { name: "Hide" }))
  })

  it("shows a free badge, missing account and copy errors", async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    })
    renderWithProviders(
      <ToolDetails
        tool={{
          id: "other",
          name: "Custom",
          category: "other",
          secrets: [{ key: "TOKEN", value: "abc" }],
        }}
      />,
    )
    expect(screen.getByText("Free")).toBeInTheDocument()
    expect(screen.getByText("not registered")).toBeInTheDocument()
    await user.click(screen.getByText("••••••••••••"))
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }))
  })
})
