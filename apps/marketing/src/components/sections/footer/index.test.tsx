import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { Footer } from "./index"

describe("Footer", () => {
  it("shows the tagline and the current year", () => {
    render(<Footer dictionary={getDictionary("en")} locale="en" />)
    expect(
      screen.getByText(
        "Clients, projects, invoices, and tool credentials for freelance developers.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument()
  })
})
