import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Invoice } from "@/data/projects"
import { InvoicesTable } from "./index"
import { renderWithProviders } from "@/test/render"

afterEach(() => {
  cleanup()
})

const invoices: Invoice[] = [
  {
    id: "i1",
    referenceMonth: "2026-02",
    amount: 1000,
    status: "paid",
    paymentMethod: "pix",
    generatedAt: "2026-02-01",
    paidAt: "2026-02-10T12:00",
    payerName: "Ada",
    hasAttachment: true,
    currency: "BRL",
  },
  {
    id: "i2",
    amount: 500,
    status: "pending",
    generatedAt: "2026-03-01",
    payerName: "Ada",
    hasAttachment: false,
    currency: "BRL",
  },
  {
    id: "i3",
    referenceMonth: "2026-04",
    amount: 700,
    status: "overdue",
    paymentMethod: "boleto",
    generatedAt: "2026-04-01",
    payerName: "Ada",
    hasAttachment: false,
    currency: "BRL",
  },
]

describe("InvoicesTable", () => {
  it("renders rows, menus and filter callbacks", async () => {
    const user = userEvent.setup()
    const onStatusChange = vi.fn()
    const onMonthFromChange = vi.fn()
    const onMonthToChange = vi.fn()
    renderWithProviders(
      <InvoicesTable
        invoices={invoices}
        status="all"
        monthFrom=""
        monthTo=""
        onStatusChange={onStatusChange}
        onMonthFromChange={onMonthFromChange}
        onMonthToChange={onMonthToChange}
        isPending={false}
        isFetching={false}
      />,
    )
    expect(screen.getByText("One-time payment")).toBeInTheDocument()
    expect(screen.getByText("Not set")).toBeInTheDocument()
    await user.click(screen.getAllByRole("button", { name: "More actions" })[0]!)
    expect(await screen.findByText("Share invoice")).toBeInTheDocument()
    expect(screen.getByText("View attachment")).toBeInTheDocument()
    await user.click(screen.getByText("Share invoice"))
    await user.click(screen.getAllByRole("button", { name: "More actions" })[0]!)
    await user.click(await screen.findByText("View attachment"))
    await user.click(screen.getAllByRole("button", { name: "More actions" })[1]!)
    expect(await screen.findByText("Attach invoice")).toBeInTheDocument()
    await user.click(screen.getByText("Generate boleto"))
    await user.click(screen.getAllByRole("button", { name: "More actions" })[2]!)
    await user.click(await screen.findByText("Generate pix"))
    await user.click(screen.getAllByRole("button", { name: "More actions" })[0]!)
    await user.click(await screen.findByText("Change status"))
    await user.click(screen.getAllByRole("combobox")[0]!)
    await user.click(await screen.findByRole("option", { name: "Paid" }))
    expect(onStatusChange).toHaveBeenCalledWith("paid")

    const from = screen.getByRole("button", { name: "From" })
    await user.click(from)
    const jan = (await screen.findAllByRole("button")).find((button) => /^jan/i.test(button.textContent ?? ""))
    await user.click(jan!)
    expect(onMonthFromChange).toHaveBeenCalled()
    const to = screen.getByRole("button", { name: "To" })
    await user.click(to)
    await user.click((await screen.findAllByRole("button")).find((button) => /^feb/i.test(button.textContent ?? ""))!)
    expect(onMonthToChange).toHaveBeenCalled()

    await user.click(screen.getByRole("columnheader", { name: /Reference/ }).querySelector("button")!)
    await user.click(screen.getByRole("columnheader", { name: /Amount/ }).querySelector("button")!)
    await user.click(screen.getByRole("columnheader", { name: /Method/ }).querySelector("button")!)
    await user.click(screen.getByRole("columnheader", { name: /Status/ }).querySelector("button")!)
  })

  it("shows a skeleton while pending", () => {
    const { container } = renderWithProviders(
      <InvoicesTable
        invoices={[]}
        status="all"
        monthFrom=""
        monthTo=""
        onStatusChange={vi.fn()}
        onMonthFromChange={vi.fn()}
        onMonthToChange={vi.fn()}
        isPending
        isFetching
      />,
    )
    expect(container.querySelector(".animate-pulse")).toBeTruthy()
  })

  it("shows the empty message", () => {
    renderWithProviders(
      <InvoicesTable
        invoices={[]}
        status="pending"
        monthFrom="2026-01"
        monthTo="2026-02"
        onStatusChange={vi.fn()}
        onMonthFromChange={vi.fn()}
        onMonthToChange={vi.fn()}
        isPending={false}
        isFetching
      />,
    )
    expect(screen.getByText("No invoices match these filters.")).toBeInTheDocument()
  })
})
