import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { buttonVariants } from "ui/button"
import { afterEach, describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { signInUrl, signUpUrl } from "@/lib/site"
import { Header } from "./index"

const ghostSignIn = buttonVariants({ variant: "ghost", size: "sm" }).split(" ")

afterEach(() => {
  cleanup()
})

describe("Header", () => {
  it("links the sections and the app, with navigation on the right of the logo", () => {
    render(<Header dictionary={getDictionary("en")} locale="en" />)
    expect(screen.getByRole("link", { name: "Projects Manager" })).toHaveAttribute("href", "/en")
    expect(screen.getByRole("link", { name: "Pains" })).toHaveAttribute("href", "#pains")
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "#features")
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute("href", "#how")
    expect(screen.getByRole("link", { name: "Security" })).toHaveAttribute("href", "#security")
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "#faq")

    const nav = screen.getByRole("navigation", { name: "Product" })
    const separator = screen.getByRole("separator")
    const signIn = screen.getByRole("link", { name: "Sign in" })
    const cluster = nav.parentElement

    expect(cluster).toContainElement(separator)
    expect(cluster).toContainElement(signIn)
    expect(cluster).toHaveClass("ml-auto")
    expect(nav.compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(
      separator.compareDocumentPosition(signIn) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(signIn).toHaveClass(...ghostSignIn)
    expect(signIn).not.toHaveClass("border-border")
    expect(signIn).toHaveAttribute("href", signInUrl())
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", signUpUrl())
  })

  it("opens a language menu and highlights the current locale", () => {
    render(<Header dictionary={getDictionary("en")} locale="en" />)

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    const trigger = screen.getByRole("button", { name: "Language" })
    expect(trigger).toHaveClass("rounded-full")

    fireEvent.click(trigger)
    expect(screen.getByRole("menu", { name: "Language" })).toHaveClass("flex-col", "gap-1")
    const english = screen.getByRole("menuitem", { name: "English" })
    const portuguese = screen.getByRole("menuitem", { name: "Português" })
    expect(english).toHaveAttribute("href", "/en")
    expect(english).toHaveAttribute("aria-current", "page")
    expect(english).toHaveClass("bg-muted")
    expect(portuguese).toHaveAttribute("href", "/pt-BR")
    expect(portuguese).not.toHaveAttribute("aria-current")

    fireEvent.pointerDown(english)
    expect(screen.getByRole("menu")).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  it("highlights Portuguese and offers English from the language menu", () => {
    render(<Header dictionary={getDictionary("pt-BR")} locale="pt-BR" />)

    fireEvent.click(screen.getByRole("button", { name: "Idioma" }))
    expect(screen.getByRole("menuitem", { name: "Português" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByRole("menuitem", { name: "English" })).toHaveAttribute("href", "/en")
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", signInUrl())
  })

  it("shows the header background only after the page scrolls", () => {
    render(<Header dictionary={getDictionary("en")} locale="en" />)
    const header = screen.getByRole("banner")

    expect(header).toHaveClass(
      "bg-transparent",
      "border-transparent",
      "backdrop-blur-[0px]",
      "transition-[background-color,border-color,backdrop-filter]",
      "duration-300",
    )
    expect(header).not.toHaveClass("bg-background/80", "backdrop-blur-md", "border-border/70")

    Object.defineProperty(window, "scrollY", { configurable: true, value: 24 })
    fireEvent.scroll(window)
    expect(header).toHaveClass(
      "border-b",
      "border-border/70",
      "bg-background/80",
      "backdrop-blur-md",
    )
    expect(header).not.toHaveClass("bg-transparent")

    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 })
    fireEvent.scroll(window)
    expect(header).toHaveClass(
      "bg-transparent",
      "border-transparent",
      "backdrop-blur-[0px]",
      "transition-[background-color,border-color,backdrop-filter]",
      "duration-300",
    )
    expect(header).not.toHaveClass("bg-background/80", "backdrop-blur-md", "border-border/70")
  })
})
