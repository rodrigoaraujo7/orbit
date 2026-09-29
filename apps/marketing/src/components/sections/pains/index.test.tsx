import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { Pains } from "./index"

describe("Pains", () => {
  it("lists the four gaps the product closes", () => {
    render(<Pains dictionary={getDictionary("en")} />)
    expect(
      screen.getByRole("heading", { name: "The work is scattered. The money is too." }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Clients and projects live in spreadsheets" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Invoices go out and then go quiet" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Tool credentials end up in chat" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Work and revenue never share a view" }),
    ).toBeInTheDocument()
  })
})
