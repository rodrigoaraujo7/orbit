import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { Features } from "./index"

describe("Features", () => {
  it("names the studio tools", () => {
    render(<Features dictionary={getDictionary("en")} />)
    expect(screen.getByRole("heading", { name: "Everything the studio needs" })).toBeInTheDocument()
    for (const name of [
      "Kanban pipeline",
      "Invoices and a payment ruler",
      "Finance dashboard",
      "Encrypted tool secrets",
      "GitHub Actions on the project",
      "Audit log",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument()
    }
  })
})
