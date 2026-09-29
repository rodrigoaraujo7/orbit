import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Emphasis } from "./emphasis"

describe("Emphasis", () => {
  it("renders an italic serif span by default", () => {
    render(<Emphasis>Projects</Emphasis>)
    const el = screen.getByText("Projects")
    expect(el.tagName).toBe("SPAN")
    expect(el).toHaveClass("font-heading", "italic", "font-bold")
  })

  it("switches to the sans face when italic is off", () => {
    render(<Emphasis italic={false}>delete</Emphasis>)
    const el = screen.getByText("delete")
    expect(el).toHaveClass("font-subtitle", "font-bold")
    expect(el).not.toHaveClass("italic")
  })
})
