import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { signUpUrl } from "@/lib/site"
import { Hero } from "./index"
import { loadLightRays } from "./visual"

describe("Hero", () => {
  it("states the product and links to sign-up and the steps", async () => {
    render(<Hero dictionary={getDictionary("en")} />)
    expect(
      screen.getByRole("heading", { level: 1, name: "Run the studio from one place." }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", signUpUrl())
    expect(screen.getByRole("link", { name: "See how it works" })).toHaveAttribute("href", "#how")
    await expect(loadLightRays()).resolves.toHaveProperty("default")
  })
})
