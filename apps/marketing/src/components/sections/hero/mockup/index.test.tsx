import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getDictionary, type Locale } from "@/i18n"
import { AppMockup } from "./index"

function renderMockup(locale: Locale = "en") {
  return render(
    <AppMockup copy={getDictionary(locale).mockup} locale={locale} address="app.example.dev" />,
  )
}

function column(name: string) {
  return screen.getByRole("region", { name })
}

function cards(name: string) {
  return within(column(name)).getAllByRole("listitem")
}

function goTo(name: string) {
  fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name }))
}

function row(name: RegExp) {
  return screen.getByRole("row", { name })
}

describe("AppMockup", () => {
  afterEach(cleanup)

  it("opens on the dashboard inside a browser frame, with no settings section", () => {
    renderMockup()
    const figure = screen.getByRole("figure", {
      name: "Interactive preview of the Projects Manager app",
    })
    expect(figure).toHaveTextContent("app.example.dev")
    expect(figure).not.toHaveTextContent("Try it")
    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByRole("heading", { level: 3, name: "Dashboard" })).toBeInTheDocument()
    expect(
      within(screen.getByRole("navigation"))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Dashboard", "Projects", "Kanban", "Audit"])
  })

  it("renders cards that can be dragged but not clicked open", () => {
    renderMockup()
    goTo("Kanban")
    const card = screen.getByText("Fern docs site").closest("li")!
    expect(card).toHaveAttribute("draggable", "true")
    expect(within(column("Completed")).queryByRole("button")).not.toBeInTheDocument()
    fireEvent.click(card)
    expect(screen.getByRole("button", { name: "Kanban" })).toHaveAttribute("aria-current", "page")
    expect(screen.queryByRole("heading", { name: "Fern docs site" })).not.toBeInTheDocument()
  })

  it("moves a dragged card to the column it is dropped on and logs it", () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date(2026, 8, 29, 14, 5).getTime())
    renderMockup()
    goTo("Kanban")
    const card = screen.getByText("Fern docs site").closest("li")!
    const transfer = { setData: vi.fn(), effectAllowed: "" }

    fireEvent.dragStart(card, { dataTransfer: transfer })
    expect(transfer.setData).toHaveBeenCalledWith("text/plain", "fern")
    fireEvent.dragOver(column("Queued"))
    expect(column("Queued")).toHaveClass("ring-ring")
    fireEvent.dragLeave(column("Queued"))
    expect(column("Queued")).not.toHaveClass("ring-ring")
    fireEvent.dragOver(column("Queued"))
    fireEvent.drop(column("Queued"))
    fireEvent.dragEnd(card)

    expect(cards("Queued")).toHaveLength(3)
    expect(column("Completed")).toHaveTextContent("Drop a project here")

    goTo("Audit")
    const [, first] = screen.getAllByRole("row")
    expect(first).toHaveTextContent(
      "09/29/2026, 02:05 PMKanbanStatus changedCompleted → QueuedFern docs site",
    )
    vi.restoreAllMocks()
  })

  it("ignores a drop that did not start from a card", () => {
    renderMockup()
    goTo("Kanban")
    fireEvent.drop(column("Completed"))
    expect(cards("Completed")).toHaveLength(1)
  })

  it("clears the drop highlight when a drag is cancelled", () => {
    renderMockup()
    goTo("Kanban")
    const card = screen.getByText("Relay API").closest("li")!
    fireEvent.dragStart(card, { dataTransfer: { setData: vi.fn(), effectAllowed: "" } })
    fireEvent.dragOver(column("Completed"))
    expect(column("Completed")).toHaveClass("ring-ring")
    fireEvent.dragEnd(card)
    expect(column("Completed")).not.toHaveClass("ring-ring")
    fireEvent.drop(column("Completed"))
    expect(cards("Queued")).toHaveLength(2)
  })

  it("shows the finance tiles and charts from the real dashboard", () => {
    renderMockup()
    expect(screen.getByRole("heading", { level: 3, name: "Dashboard" })).toBeInTheDocument()

    const tiles = within(screen.getByText("Billed in period").closest("dl")!)
    expect(tiles.getByText("$90,200")).toBeInTheDocument()
    expect(tiles.getByText("$53,700")).toHaveClass("text-success")
    expect(tiles.getByText("$33,400")).toBeInTheDocument()
    expect(tiles.getByText("$3,100")).toHaveClass("text-destructive")
    expect(tiles.getByText("$564")).toBeInTheDocument()
    expect(tiles.queryByText("Only what comes out of your pocket")).not.toBeInTheDocument()

    const revenue = screen.getByRole("region", { name: "Revenue by month" })
    expect(revenue).toHaveTextContent("6 projects · 5 clients · 99% margin")
    expect(
      within(revenue).getByLabelText("July 2026 · Paid: $9,600 · Pending: $0 · Overdue: $3,100"),
    ).toBeInTheDocument()

    const growth = screen.getByRole("region", { name: "Client growth" })
    expect(within(growth).getByLabelText("April 2026: 3")).toBeInTheDocument()
    expect(within(growth).getByLabelText("September 2026: 5")).toBeInTheDocument()

    const profit = screen.getByRole("region", { name: "Profit by project" })
    expect(within(profit).getAllByRole("listitem")[0]).toHaveTextContent("Orbit mobile app$26.9K")

    const ruler = screen.getByRole("region", { name: "Payment ruler" })
    expect(
      within(ruler).getByLabelText("Harbor CRM · July 2026 · $3,100 · Overdue"),
    ).toBeInTheDocument()
    expect(
      within(ruler).getByLabelText("Pulse analytics · September 2026 · $9,000 · Pending"),
    ).toBeInTheDocument()
  })

  it("lists projects with value, tools and GitHub like the real table", () => {
    renderMockup()
    goTo("Projects")
    expect(screen.getByText("6 projects")).toBeInTheDocument()
    expect(within(screen.getByRole("table")).queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(7)

    expect(row(/Atlas storefront/)).toHaveTextContent(
      "Atlas storefrontLumen CoffeeIn development$25,200 in 6xVercelSupabaselumen/atlas-storefront",
    )
    expect(row(/Orbit mobile app/)).toHaveTextContent("$27,000 in 5x")
    expect(row(/Pulse analytics/)).toHaveTextContent(
      "Pulse analyticsBrightlineQueued$9,000 upfrontPostHog—",
    )

    expect(within(row(/Atlas storefront/)).getByText("Vercel")).toHaveAttribute(
      "title",
      "Paid · $20/mo",
    )
    expect(within(row(/Orbit mobile app/)).getByText("Sentry")).toHaveAttribute(
      "title",
      "Free plan",
    )
    expect(
      within(row(/Orbit mobile app/)).getByRole("img", { name: "Running" }),
    ).toBeInTheDocument()
    expect(within(row(/Harbor CRM/)).getByRole("img", { name: "Failing" })).toBeInTheDocument()
    expect(within(row(/Relay API/)).getByRole("img", { name: "Passing" })).toBeInTheDocument()
  })

  it("shows the audit log as the date, module, action and object table", () => {
    renderMockup()
    goTo("Audit")
    expect(screen.getByText("History of actions taken on your account.")).toBeInTheDocument()
    const rows = screen.getAllByRole("row").map((item) => item.textContent)
    expect(rows).toEqual([
      "DateModuleActionObject",
      "09/29/2026, 10:42 AMKanbanStatus changedIn development → In validationHarbor CRM",
      "09/29/2026, 09:15 AMProjectsInvoice statusOrbit mobile app",
      "09/29/2026, 09:02 AMSecurityLogin—",
      "09/28/2026, 05:30 PMSettingsTool createdPostHog",
      "09/27/2026, 02:08 PMProjectsProject createdRelay API",
      "09/27/2026, 01:55 PMSettingsContact createdNorthwind",
    ])
  })

  it("speaks Portuguese and bills in reais for pt-BR", () => {
    renderMockup("pt-BR")
    expect(screen.getByRole("heading", { level: 3, name: "Dashboard" })).toBeInTheDocument()
    goTo("Kanban")
    expect(column("Em desenvolvimento")).toBeInTheDocument()
    goTo("Projetos")
    expect(row(/Relay API/)).toHaveTextContent(/R\$\s4\.400 em 2x/)
    goTo("Auditoria")
    expect(screen.getByRole("row", { name: /Harbor CRM/ })).toHaveTextContent(
      /29\/09\/2026,? 10:42.*Status alterado/,
    )
  })
})
