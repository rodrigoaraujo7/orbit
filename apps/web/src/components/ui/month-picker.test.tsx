import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { MonthPicker } from "./month-picker"
import { renderWithProviders } from "@/test/render"

afterEach(() => {
  cleanup()
})

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <div>
      <MonthPicker value={value} onChange={setValue} placeholder="Pick month" aria-label="Month" />
      <p data-testid="value">{value || "empty"}</p>
    </div>
  )
}

describe("MonthPicker", () => {
  it("shows the placeholder until a month is chosen", async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)
    await user.click(screen.getByRole("button", { name: "Month" }))
    await user.click(screen.getByRole("button", { name: "Next year" }))
    await user.click(screen.getByRole("button", { name: "Previous year" }))
    const jan = await screen.findAllByRole("button")
    const monthButton = jan.find((button) => /^jan/i.test(button.textContent ?? ""))
    expect(monthButton).toBeTruthy()
    await user.click(monthButton!)
    expect(screen.getByTestId("value").textContent).toMatch(/^\d{4}-01$/)
  })

  it("highlights the selected month and can clear it", async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness initial="2026-03" />)
    expect(screen.getByRole("button", { name: "Month" })).toHaveTextContent(/mar/i)
    await user.click(screen.getByRole("button", { name: "Month" }))
    await user.click(await screen.findByRole("button", { name: "Clear" }))
    expect(screen.getByTestId("value")).toHaveTextContent("empty")
  })
})
