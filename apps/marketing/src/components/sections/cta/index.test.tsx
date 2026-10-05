import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { signUpUrl } from "@/lib/site"
import { Cta } from "./index"

describe("Cta", () => {
  it("sends people to create an account", () => {
    render(<Cta dictionary={getDictionary("en")} />)
    expect(
      screen.getByRole("heading", { name: "Put the studio in one place." }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", signUpUrl())
  })
})
