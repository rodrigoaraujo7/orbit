import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { How } from "./index"

describe("How", () => {
  it("lists the three steps in order", () => {
    render(<How dictionary={getDictionary("en")} />)
    expect(
      screen.getByRole("heading", { name: "Three steps, then it is your system" }),
    ).toBeInTheDocument()
    const items = screen.getAllByRole("listitem")
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Add a client"),
      expect.stringContaining("Create a project"),
      expect.stringContaining("Track work and billing"),
    ])
  })
})
