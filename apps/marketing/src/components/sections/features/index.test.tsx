import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { Features } from "./index"

const TITLES = [
  "Kanban pipeline",
  "Encrypted tool secrets",
  "Invoices and a payment ruler",
  "GitHub Actions on the project",
  "Finance dashboard",
  "Audit log",
]

afterEach(() => {
  cleanup()
})

function card(name: string) {
  return screen.getByRole("heading", { name }).closest("article")!
}

describe("Features", () => {
  it("lays the studio tools out as a numbered bento grid", () => {
    render(<Features dictionary={getDictionary("en")} />)
    expect(screen.getByRole("heading", { name: "Everything the studio needs" })).toBeInTheDocument()

    const articles = screen.getAllByRole("article")
    expect(articles.map((article) => article.querySelector("h3")?.textContent)).toEqual(TITLES)
    articles.forEach((article, index) => {
      expect(article).toHaveClass("bento-card", "group")
      expect(article).toHaveTextContent(String(index + 1).padStart(2, "0"))
      expect(article.querySelector("svg")?.closest("[aria-hidden]")).not.toBeNull()
    })

    expect(card("Kanban pipeline").parentElement).toHaveClass("md:col-span-2")
    expect(card("Finance dashboard").parentElement).toHaveClass("md:col-span-2")
    expect(card("Encrypted tool secrets").parentElement).toHaveClass("lg:row-span-2")
    expect(card("Audit log").parentElement).not.toHaveClass("md:col-span-2", "lg:row-span-2")
  })

  it("follows the pointer with CSS variables and resets them on leave", () => {
    render(<Features dictionary={getDictionary("en")} />)
    const kanban = card("Kanban pipeline")
    kanban.getBoundingClientRect = () => ({ left: 10, top: 20, width: 200, height: 100 }) as DOMRect

    fireEvent.pointerMove(kanban, { clientX: 160, clientY: 45 })
    expect(kanban.style.getPropertyValue("--mx")).toBe("150px")
    expect(kanban.style.getPropertyValue("--my")).toBe("25px")
    expect(kanban.style.getPropertyValue("--px")).toBe("0.5")
    expect(kanban.style.getPropertyValue("--py")).toBe("-0.5")

    fireEvent.pointerLeave(kanban)
    for (const property of ["--mx", "--my", "--px", "--py"]) {
      expect(kanban.style.getPropertyValue(property)).toBe("")
    }
  })

  it("draws each illustration with hover transitions", () => {
    const { container } = render(<Features dictionary={getDictionary("en")} />)
    const part = (name: string) => container.querySelectorAll(`[data-part="${name}"]`)

    expect(part("moving-card")[0]).toHaveClass("group-hover:translate-x-[140px]")
    expect(part("dial")[0]).toHaveClass("group-hover:-rotate-[60deg]")
    expect(part("shackle")[0]).toHaveClass("-translate-y-2", "group-hover:translate-y-0")
    expect(part("password-dot")).toHaveLength(8)
    expect(part("password-dot")[7]).toHaveStyle({ transitionDelay: "420ms" })

    const months = [...part("month")]
    expect(months).toHaveLength(12)
    expect(months.map((month) => month.getAttribute("data-status"))).toEqual([
      ...Array(6).fill("paid"),
      "overdue",
      "pending",
      "pending",
      ...Array(3).fill("future"),
    ])
    expect(part("today")[0]).toHaveClass("group-hover:translate-x-[192px]")

    expect(part("edge")).toHaveLength(5)
    expect(part("job")).toHaveLength(4)
    expect(part("running")[0]).toHaveClass("group-hover:opacity-100")

    expect(part("bar")).toHaveLength(9)
    expect(part("trend")[0]).toHaveAttribute("pathLength", "1")
    expect(part("crosshair")[0]).toHaveStyle({ translate: "calc(var(--px, 0) * 216px) 0" })

    const entries = [...part("entry")]
    expect(entries).toHaveLength(4)
    expect(entries.at(-1)).toHaveClass("group-hover:opacity-0")
    expect(entries[0]).toHaveClass("group-hover:opacity-60")
    expect(part("new-entry")[0]).toHaveClass("opacity-0", "group-hover:opacity-100")
  })

  it("renders the Portuguese copy", () => {
    render(<Features dictionary={getDictionary("pt-BR")} />)
    expect(
      screen.getByRole("heading", { name: "Tudo o que o estúdio precisa" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Segredos de ferramentas criptografados" }),
    ).toBeInTheDocument()
  })
})
