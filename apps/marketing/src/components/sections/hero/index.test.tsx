import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { Hero } from "./index"
import { loadLightRays } from "./visual"

describe("Hero", () => {
  it("states the product above the app preview", async () => {
    render(<Hero dictionary={getDictionary("en")} locale="en" />)
    expect(
      screen.getByRole("heading", { level: 1, name: "Manage your software in one place." }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Built for/)).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Get started" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "See how it works" })).not.toBeInTheDocument()
    expect(
      screen.getByRole("figure", { name: "Interactive preview of the Projects Manager app" }),
    ).toHaveTextContent("app.projectsmanager.rodrigoleite.dev")
    await expect(loadLightRays()).resolves.toHaveProperty("default")
  })
})
