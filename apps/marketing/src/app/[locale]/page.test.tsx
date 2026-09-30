import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import LocaleLayout, { dynamicParams, generateMetadata, generateStaticParams } from "./layout"
import LocalePage from "./page"

afterEach(() => {
  cleanup()
})

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found")
  },
}))

describe("locale routes", () => {
  it("prerenders both locales and refuses unknown ones", () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([{ locale: "en" }, { locale: "pt-BR" }])
  })

  it("renders the English page with lang on the document", async () => {
    const page = await LocalePage({ params: Promise.resolve({ locale: "en" }) })
    const layout = await LocaleLayout({
      children: page,
      params: Promise.resolve({ locale: "en" }),
    })
    render(layout)
    expect(document.documentElement).toHaveAttribute("lang", "en")
    expect(
      screen.getByRole("heading", { level: 1, name: "Manage your software in one place." }),
    ).toBeInTheDocument()
    for (const name of [
      "Manage your software in one place.",
      "Everything the studio needs",
      "Three steps, then it is your system",
      "Isolated by default",
      "Questions",
      "Put the studio in one place.",
    ]) {
      expect(screen.getByRole("heading", { name }).closest(".marketing-reveal")).not.toBeNull()
    }
    expect(
      screen.queryByRole("heading", { name: "The work is scattered. The money is too." }),
    ).not.toBeInTheDocument()
    expect(document.getElementById("pains")).toBeNull()
    const script = document.querySelector("script[type='application/ld+json']")
    expect(script?.textContent).toContain('"@type":"SoftwareApplication"')
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }) })
    expect(metadata.alternates).toMatchObject({ canonical: "/en" })
  })

  it("renders the Portuguese page", async () => {
    const page = await LocalePage({ params: Promise.resolve({ locale: "pt-BR" }) })
    const layout = await LocaleLayout({
      children: page,
      params: Promise.resolve({ locale: "pt-BR" }),
    })
    render(layout)
    expect(document.documentElement).toHaveAttribute("lang", "pt-BR")
    expect(
      screen.getByRole("heading", { level: 1, name: "Gerencie seu software em um único lugar." }),
    ).toBeInTheDocument()
  })

  it("rejects an unknown locale", async () => {
    await expect(
      LocaleLayout({ children: null, params: Promise.resolve({ locale: "fr" }) }),
    ).rejects.toThrow("not-found")
    await expect(LocalePage({ params: Promise.resolve({ locale: "fr" }) })).rejects.toThrow(
      "not-found",
    )
    await expect(generateMetadata({ params: Promise.resolve({ locale: "fr" }) })).resolves.toEqual(
      {},
    )
  })
})
