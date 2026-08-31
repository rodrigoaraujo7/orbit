import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { OTHER_TOOL_ID } from "@/data/tool-catalog"
import { ToolSelect } from "./tool-select"
import { renderWithProviders } from "@/test/render"

afterEach(() => {
  cleanup()
})

describe("ToolSelect", () => {
  it("shows a placeholder and catalog groups", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onValueChange = vi.fn()
    const { rerender } = renderWithProviders(<ToolSelect value="" onValueChange={onValueChange} />)
    expect(screen.getByText("Select a tool")).toBeInTheDocument()
    await user.click(screen.getByRole("combobox"))
    const vercel = await screen.findByRole("option", { name: /Vercel/, hidden: true })
    await user.click(vercel)
    expect(onValueChange).toHaveBeenCalledWith("vercel")
    rerender(<ToolSelect value="vercel" onValueChange={onValueChange} />)
    expect(screen.getAllByText("Vercel").length).toBeGreaterThan(0)
  })

  it("labels the other tool and falls back to the raw id", () => {
    const { rerender } = renderWithProviders(
      <ToolSelect value={OTHER_TOOL_ID} onValueChange={vi.fn()} />,
    )
    expect(screen.getByText("Other")).toBeInTheDocument()
    rerender(<ToolSelect value="unknown-tool" onValueChange={vi.fn()} />)
    expect(screen.getByText("unknown-tool")).toBeInTheDocument()
  })
})
