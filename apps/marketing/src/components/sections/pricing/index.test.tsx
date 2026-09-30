import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { signUpUrl } from "@/lib/site"
import { Pricing } from "./index"

afterEach(() => {
  cleanup()
})

function pricingRegion() {
  return screen.getByRole("region", { name: "Simple pricing" })
}

describe("Pricing", () => {
  it("opens on yearly billing with the discounted Pro price", () => {
    render(<Pricing dictionary={getDictionary("en")} />)
    const region = pricingRegion()

    expect(screen.getByRole("heading", { name: "Simple pricing" })).toBeInTheDocument()
    expect(region).toHaveAttribute("id", "pricing")
    expect(screen.getByRole("radio", { name: "Monthly" })).toHaveAttribute("aria-checked", "false")
    expect(screen.getByRole("radio", { name: "Yearly Save 20%" })).toHaveAttribute(
      "aria-checked",
      "true",
    )

    expect(within(region).getByRole("heading", { name: "Free" })).toBeInTheDocument()
    expect(within(region).getByText("$0")).toBeInTheDocument()
    expect(within(region).getByText("Free forever")).toBeInTheDocument()
    expect(within(region).getByText("Up to 2 active projects")).toBeInTheDocument()
    expect(within(region).getByText("Finance dashboard")).toBeInTheDocument()

    expect(within(region).getByRole("heading", { name: "Pro" })).toBeInTheDocument()
    expect(within(region).getByText("$16")).toBeInTheDocument()
    expect(within(region).getByText("$20")).toHaveClass("line-through")
    expect(within(region).getByText("$192 billed yearly")).toBeInTheDocument()
    expect(within(region).getByText("Everything in Free, plus")).toBeInTheDocument()
    expect(within(region).getByText("Unlimited projects and clients")).toBeInTheDocument()
    expect(within(region).getByText("Full audit log")).toBeInTheDocument()

    expect(within(region).getByRole("link", { name: "Get started" })).toHaveAttribute(
      "href",
      signUpUrl(),
    )
    expect(within(region).getByRole("link", { name: "Get Pro" })).toHaveAttribute(
      "href",
      signUpUrl(),
    )
    expect(within(region).getByRole("link", { name: "Get Pro" })).toHaveClass(
      "bg-foreground",
      "text-background",
    )

    const pro = within(region).getByRole("heading", { name: "Pro" }).closest("article")
    const free = within(region).getByRole("heading", { name: "Free" }).closest("article")
    expect(pro?.querySelector(".pricing-wash")).not.toBeNull()
    expect(free?.querySelector(".pricing-wash")).toBeNull()
    expect(pro).not.toHaveAttribute("data-active")
  })

  it("switches to the full monthly price and back with the keyboard", async () => {
    const user = userEvent.setup()
    render(<Pricing dictionary={getDictionary("en")} />)
    const region = pricingRegion()

    await user.click(screen.getByRole("radio", { name: "Monthly" }))
    expect(screen.getByRole("radio", { name: "Monthly" })).toHaveAttribute("aria-checked", "true")
    expect(within(region).getByText("$20")).toBeInTheDocument()
    expect(within(region).queryByText("$16")).not.toBeInTheDocument()
    expect(within(region).queryByText(/billed yearly/)).not.toBeInTheDocument()
    expect(within(region).getByText("$20")).not.toHaveClass("line-through")

    const monthly = screen.getByRole("radio", { name: "Monthly" })
    monthly.focus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("radio", { name: "Yearly Save 20%" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    expect(within(region).getByText("$16")).toBeInTheDocument()
    expect(within(region).getByText("$192 billed yearly")).toBeInTheDocument()

    await user.keyboard("{ArrowLeft}")
    expect(monthly).toHaveAttribute("aria-checked", "true")

    await user.keyboard("a")
    expect(monthly).toHaveAttribute("aria-checked", "true")
  })

  it("renders the Portuguese catalog", () => {
    render(<Pricing dictionary={getDictionary("pt-BR")} />)
    expect(screen.getByRole("heading", { name: "Preços simples" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Anual Economize 20%" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    expect(screen.getByText("Até 2 projetos ativos")).toBeInTheDocument()
    expect(screen.getByText("Projetos e clientes ilimitados")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Assinar Pro" })).toHaveAttribute("href", signUpUrl())
    expect(screen.getByText("$192 cobrados por ano")).toBeInTheDocument()
  })
})
