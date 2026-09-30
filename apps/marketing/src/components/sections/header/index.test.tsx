import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { buttonVariants } from "ui/button"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getDictionary } from "@/i18n"
import { signInUrl, signUpUrl } from "@/lib/site"
import { Header } from "./index"

const ghostSignIn = buttonVariants({ variant: "ghost", size: "sm" }).split(" ")

afterEach(() => {
  cleanup()
  document.documentElement.style.removeProperty("--marketing-header-height")
  Reflect.deleteProperty(window, "ResizeObserver")
})

describe("Header", () => {
  it("links the sections and the app, with navigation on the right of the logo", () => {
    render(<Header dictionary={getDictionary("en")} locale="en" />)
    expect(screen.getByRole("link", { name: "Projects Manager" })).toHaveAttribute("href", "/en")
    expect(screen.queryByRole("link", { name: "Pains" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "#features")
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute("href", "#how")
    expect(screen.getByRole("link", { name: "Security" })).toHaveAttribute("href", "#security")
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "#faq")

    const nav = screen.getByRole("navigation", { name: "Product" })
    const separator = screen.getByRole("separator")
    const signIn = screen.getByRole("link", { name: "Sign in" })
    const cluster = nav.parentElement
    const openMenu = screen.getByRole("button", { name: "Open menu" })

    expect(cluster).toContainElement(separator)
    expect(cluster).toContainElement(signIn)
    expect(cluster).toHaveClass("ml-auto", "hidden", "lg:flex")
    expect(openMenu.parentElement).toHaveClass("ml-auto", "lg:hidden")
    expect(
      cluster!.compareDocumentPosition(openMenu) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
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

  it("opens the shared drawer from the menu button and closes it from a link", async () => {
    render(<Header dictionary={getDictionary("en")} locale="en" />)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }))

    const drawer = screen.getByRole("dialog", { name: "Menu" })
    expect(drawer).toHaveClass(
      "w-60",
      "rounded-4xl",
      "bg-sidebar/40",
      "text-sidebar-foreground",
      "backdrop-blur-xl",
      "after:hidden",
    )
    expect(drawer).toHaveAttribute("data-swipe-direction", "right")

    const features = screen.getAllByRole("link", { name: "Features" })
    expect(
      features.some((link) => link.getAttribute("href") === "#features" && drawer.contains(link)),
    ).toBe(true)
    const language = within(drawer).getByRole("button", { name: "Language" })
    const getStarted = within(drawer).getByRole("link", { name: "Get started" })
    const signIn = within(drawer).getByRole("link", { name: "Sign in" })
    const navLink = features.find((link) => drawer.contains(link))!
    expect(language).toHaveClass("h-11", "w-full", "hover:bg-sidebar-accent", "text-left")
    expect(navLink).toHaveClass("justify-start", "text-left")
    expect(getStarted).toHaveClass("justify-start", "text-left")
    expect(signIn).toHaveClass("border-border", "justify-start", "text-left")
    expect(
      language.compareDocumentPosition(getStarted) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      getStarted.compareDocumentPosition(signIn) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.queryByRole("menu", { name: "Language" })).not.toBeInTheDocument()

    fireEvent.click(language)
    const languageMenu = screen.getByRole("menu")
    expect(languageMenu).toHaveClass("rounded-xl", "border", "bg-popover", "shadow-lg")
    const english = within(languageMenu).getByRole("menuitem", { name: "English" })
    const portuguese = within(languageMenu).getByRole("menuitem", { name: "Português" })
    expect(english).toHaveAttribute("href", "/en")
    expect(english.querySelector("svg")).toHaveClass("text-primary")
    expect(portuguese).toHaveAttribute("href", "/pt-BR")
    expect(portuguese.querySelector("svg")).toBeNull()

    fireEvent.click(features.find((link) => drawer.contains(link))!)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("publishes the header height and clears it when the header unmounts", () => {
    const disconnect = vi.fn()
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {
        disconnect()
      }
    } as unknown as typeof ResizeObserver

    const view = render(<Header dictionary={getDictionary("en")} locale="en" />)
    expect(document.documentElement.style.getPropertyValue("--marketing-header-height")).toBe("0px")

    view.unmount()
    expect(disconnect).toHaveBeenCalledOnce()
    expect(document.documentElement.style.getPropertyValue("--marketing-header-height")).toBe("")
  })

  it("labels the menu button in Portuguese", async () => {
    render(<Header dictionary={getDictionary("pt-BR")} locale="pt-BR" />)
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }))
    const drawer = screen.getByRole("dialog", { name: "Menu" })
    await userEvent.click(within(drawer).getByRole("button", { name: "Idioma" }))
    const languageMenu = await screen.findByRole("menu")
    const portuguese = within(languageMenu).getByRole("menuitem", { name: "Português" })
    expect(portuguese).toHaveAttribute("href", "/pt-BR")
    expect(portuguese.querySelector("svg")).toHaveClass("text-primary")
    expect(within(languageMenu).getByRole("menuitem", { name: "English" })).toHaveAttribute(
      "href",
      "/en",
    )
  })
})
