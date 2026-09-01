import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { emptyFilters, type DashboardFilters, type DashboardOptions } from "shared"
import { FiltersBar } from "./index"
import { filterDrawer, renderWithProviders } from "@/test/render"

afterEach(() => {
  cleanup()
})

const options: DashboardOptions = {
  clients: [
    { id: "c1", name: "Ada" },
    { id: "c2", name: "Bo" },
  ],
  projects: [
    { id: "p1", name: "Portal", clientId: "c1" },
    { id: "p2", name: "Shop", clientId: "c2" },
  ],
  currencies: ["BRL", "USD"],
}

describe("FiltersBar", () => {
  it("clears active filters and applies presets", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const filters: DashboardFilters = {
      ...emptyFilters,
      monthFrom: "2026-01",
      monthTo: "2026-06",
      clientId: "c1",
      projectId: "p1",
      currency: "USD",
    }
    renderWithProviders(<FiltersBar options={options} filters={filters} onChange={onChange} />)

    await user.click(screen.getAllByRole("button", { name: "Clear" })[0]!)
    expect(onChange).toHaveBeenCalledWith(emptyFilters)

    const comboboxes = screen.getAllByRole("combobox")
    await user.click(comboboxes[0]!)
    await user.click(await screen.findByRole("option", { name: "This year" }))
    expect(onChange).toHaveBeenCalled()

    await user.click(comboboxes[0]!)
    await user.click(await screen.findByRole("option", { name: "All time" }))

    await user.click(comboboxes[0]!)
    await user.click(await screen.findByRole("option", { name: "12 months" }))
  })

  it("clears a project that does not belong to the selected client", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(
      <FiltersBar
        options={options}
        filters={{ ...emptyFilters, clientId: "", projectId: "p2" }}
        onChange={onChange}
      />,
    )
    const clientSelect = screen.getAllByRole("combobox").find((el) => el.textContent?.includes("All clients"))
    expect(clientSelect).toBeTruthy()
    await user.click(clientSelect!)
    await user.click(await screen.findByRole("option", { name: "Ada" }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ clientId: "c1", projectId: "" }))
  })

  it("keeps the project when it belongs to the client", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(
      <FiltersBar
        options={options}
        filters={{ ...emptyFilters, clientId: "", projectId: "p1" }}
        onChange={onChange}
      />,
    )
    const clientSelect = screen.getAllByRole("combobox").find((el) => el.textContent?.includes("All clients"))
    await user.click(clientSelect!)
    await user.click(await screen.findByRole("option", { name: "Ada" }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ clientId: "c1", projectId: "p1" }))
  })

  it("updates project and currency and clears from the drawer", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(
      <FiltersBar
        options={options}
        filters={{ ...emptyFilters, monthFrom: "2026-01", monthTo: "2026-06", currency: "USD" }}
        onChange={onChange}
      />,
    )
    const comboboxes = screen.getAllByRole("combobox")
    const projectSelect = comboboxes.find((el) => el.textContent?.includes("All projects"))
    await user.click(projectSelect!)
    await user.click(await screen.findByRole("option", { name: "Portal" }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ projectId: "p1" }))

    const currencySelect = comboboxes.find((el) => el.textContent?.includes("USD"))
    await user.click(currencySelect!)
    await user.click(await screen.findByRole("option", { name: "BRL" }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ currency: "BRL" }))

    await user.click(screen.getByRole("button", { name: "Filter" }))
    const drawer = filterDrawer()
    await user.click(drawer.getAllByRole("combobox").find((el) => el.textContent?.includes("All clients"))!)
    await user.click(await screen.findByRole("option", { name: "Ada" }))
    await user.click(drawer.getAllByRole("combobox").find((el) => el.textContent?.includes("All projects"))!)
    await user.click(await screen.findByRole("option", { name: "Portal" }))
    await user.click(drawer.getAllByRole("combobox").find((el) => /BRL|USD/.test(el.textContent ?? ""))!)
    await user.click(await screen.findByRole("option", { name: "BRL" }))
    await user.click(drawer.getByRole("button", { name: "Clear" }))
    expect(onChange).toHaveBeenCalledWith(emptyFilters)
  })

  it("updates the custom month range", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(
      <FiltersBar options={options} filters={emptyFilters} onChange={onChange} />,
    )
    await user.click(screen.getAllByRole("button", { name: "Period start month" })[0]!)
    const jan = (await screen.findAllByRole("button")).find((button) => /^jan/i.test(button.textContent ?? ""))
    await user.click(jan!)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ monthFrom: expect.stringMatching(/^\d{4}-01$/) }))

    await user.click(screen.getAllByRole("button", { name: "Period end month" })[0]!)
    const feb = (await screen.findAllByRole("button")).find((button) => /^feb/i.test(button.textContent ?? ""))
    await user.click(feb!)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ monthTo: expect.stringMatching(/^\d{4}-02$/) }))
  })
})
