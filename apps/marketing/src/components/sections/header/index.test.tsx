import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { signInUrl, signUpUrl } from "@/lib/site"
import { Header } from "./index"

describe("Header", () => {
  it("links the sections, the other locale, and the app", () => {
    render(<Header dictionary={getDictionary("en")} locale="en" />)
    expect(screen.getByRole("link", { name: "Projects Manager" })).toHaveAttribute("href", "/en")
    expect(screen.getByRole("link", { name: "Pains" })).toHaveAttribute("href", "#pains")
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "#features")
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute("href", "#how")
    expect(screen.getByRole("link", { name: "Security" })).toHaveAttribute("href", "#security")
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "#faq")
    const language = screen.getByRole("link", { name: "Language" })
    expect(language).toHaveAttribute("href", "/pt-BR")
    expect(language).toHaveAttribute("hrefLang", "pt-BR")
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", signInUrl())
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", signUpUrl())
  })

  it("offers English when the page is Portuguese", () => {
    render(<Header dictionary={getDictionary("pt-BR")} locale="pt-BR" />)
    expect(screen.getByRole("link", { name: "Idioma" })).toHaveAttribute("href", "/en")
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", signInUrl())
  })
})
