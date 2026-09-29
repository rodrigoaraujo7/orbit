import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LocaleToggle } from "./locale-toggle"

afterEach(cleanup)

const labels = { "en-US": "English", "pt-BR": "Português" }

describe("LocaleToggle", () => {
  it("shows the current language and slides to the next one on click", () => {
    const onToggle = vi.fn()
    render(
      <LocaleToggle
        locale="en-US"
        order={["en-US", "pt-BR"]}
        labels={labels}
        label="Language"
        onToggle={onToggle}
      />,
    )

    const button = screen.getByRole("button", { name: "Language" })
    expect(button).toHaveClass(
      "h-6",
      "text-xs",
      "gap-1.5",
      "text-muted-foreground",
      "hover:text-foreground",
    )
    expect(button).toHaveTextContent("English")
    expect(button.querySelector(".flex.flex-col")).toHaveStyle({ transform: "translateY(0em)" })

    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
    expect(button.querySelector(".flex.flex-col")).toHaveStyle({
      transform: "translateY(-1.25em)",
    })

    fireEvent.click(button)
    expect(button.querySelector(".flex.flex-col")).toHaveStyle({
      transform: "translateY(-2.5em)",
    })
  })

  it("starts on the second language", () => {
    render(
      <LocaleToggle
        locale="pt-BR"
        order={["en-US", "pt-BR"]}
        labels={labels}
        label="Idioma"
        onToggle={() => undefined}
      />,
    )

    const button = screen.getByRole("button", { name: "Idioma" })
    expect(button).toHaveTextContent("Português")
    expect(button.querySelector(".flex.flex-col")).toHaveStyle({
      transform: "translateY(-1.25em)",
    })
  })

  it("treats an unknown locale as the first language", () => {
    render(
      <LocaleToggle
        locale="fr"
        order={["en-US", "pt-BR"]}
        labels={labels}
        label="Language"
        onToggle={() => undefined}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Language" }).querySelector(".flex.flex-col"),
    ).toHaveStyle({ transform: "translateY(0em)" })
  })

  it("links to another locale without a button", () => {
    render(
      <LocaleToggle
        locale="en"
        order={["en", "pt-BR"]}
        labels={{ en: "English", "pt-BR": "Português" }}
        label="Language"
        href="/pt-BR"
        hrefLang="pt-BR"
      />,
    )

    const link = screen.getByRole("link", { name: "Language" })
    expect(link).toHaveAttribute("href", "/pt-BR")
    expect(link).toHaveAttribute("hrefLang", "pt-BR")
    expect(link).toHaveAttribute("lang", "pt-BR")
    expect(link).toHaveTextContent("English")
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
