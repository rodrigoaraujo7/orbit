import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { renderWithProviders } from "@/test/render"

import { Input } from "./input"

afterEach(() => {
  cleanup()
})

describe("Input", () => {
  it("leaves non-password fields unchanged", () => {
    renderWithProviders(<Input aria-label="Name" />)
    const input = screen.getByLabelText("Name")
    expect(input).not.toHaveAttribute("type", "password")
    expect(screen.queryByRole("button", { name: "Show password" })).not.toBeInTheDocument()
  })

  it("reveals and hides a password field by default", async () => {
    const user = userEvent.setup()
    renderWithProviders(<Input aria-label="Password" type="password" defaultValue="secret" />)
    const input = screen.getByLabelText("Password")
    expect(input).toHaveAttribute("type", "password")

    await user.click(input)
    expect(input).toHaveFocus()
    await user.click(screen.getByRole("button", { name: "Show password" }))
    expect(input).toHaveAttribute("type", "text")
    expect(input).not.toHaveFocus()
    const hide = screen.getByRole("button", { name: "Hide password" })
    expect(hide).toHaveAttribute("aria-pressed", "true")
    expect(hide).not.toHaveFocus()

    hide.focus()
    await user.keyboard("{Enter}")
    expect(input).toHaveAttribute("type", "password")
    expect(hide).toHaveFocus()

    await user.click(screen.getByRole("button", { name: "Show password" }))
    expect(input).toHaveAttribute("type", "text")
    expect(input).not.toHaveFocus()
    expect(screen.getByRole("button", { name: "Hide password" })).not.toHaveFocus()
  })

  it("keeps each password field's visibility independent", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <Input aria-label="First" type="password" />
        <Input aria-label="Second" type="password" />
      </>,
    )
    const [showFirst] = screen.getAllByRole("button", { name: "Show password" })
    await user.click(showFirst!)
    expect(screen.getByLabelText("First")).toHaveAttribute("type", "text")
    expect(screen.getByLabelText("Second")).toHaveAttribute("type", "password")
  })

  it("disables the reveal control with the field", () => {
    renderWithProviders(<Input aria-label="Password" type="password" disabled />)
    expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled()
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password")
  })

  it("can turn the reveal control off", () => {
    renderWithProviders(<Input aria-label="Password" type="password" reveal={false} />)
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password")
    expect(screen.queryByRole("button", { name: "Show password" })).not.toBeInTheDocument()
  })
})
