import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { Security } from "./index"

describe("Security", () => {
  it("explains isolation, encryption, and the sign-in code", () => {
    render(<Security dictionary={getDictionary("en")} />)
    expect(screen.getByRole("heading", { name: "Isolated by default" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Per-user isolation" })).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Envelope encryption for secrets" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "An email code on every sign-in" }),
    ).toBeInTheDocument()
  })
})
