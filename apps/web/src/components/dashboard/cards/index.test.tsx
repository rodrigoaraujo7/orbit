import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ChartCard, HeroFigure, NoData, StatRow, StatTile } from "./index"
import { renderWithProviders } from "@/test/render"

const reduced = vi.hoisted(() => ({ value: true }))

vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => reduced.value,
}))

afterEach(() => {
  cleanup()
  reduced.value = true
})

describe("dashboard cards", () => {
  it("renders a hero figure with hint and negative tone", () => {
    renderWithProviders(<HeroFigure value={-10} currency="BRL" hint="vs last month" />)
    expect(screen.getByText("vs last month")).toBeInTheDocument()
    expect(
      screen.getByText((content, element) => element?.tagName === "P" && content.includes("R$")),
    ).toBeTruthy()
  })

  it("renders tiles with and without icons", () => {
    renderWithProviders(
      <StatRow>
        <StatTile label="Billed" value={100} format={(value) => `$${value}`} hint="period" />
        <StatTile
          label="Paid"
          value={40}
          format={(value) => String(value)}
          icon={<span>icon</span>}
          iconClassName="bg-muted"
          tone="success"
          delay={10}
        />
      </StatRow>,
    )
    expect(screen.getByText("Billed")).toBeInTheDocument()
    expect(screen.getByText("Paid")).toBeInTheDocument()
    expect(screen.getByText("period")).toBeInTheDocument()
    expect(screen.getByText("icon")).toBeInTheDocument()
  })

  it("wraps a chart and shows empty copy", () => {
    renderWithProviders(
      <ChartCard
        title="Revenue"
        hint="monthly"
        aside={<span>aside</span>}
        delay={20}
        className="wide"
      >
        <NoData />
      </ChartCard>,
    )
    expect(screen.getByText("Revenue")).toBeInTheDocument()
    expect(screen.getByText("monthly")).toBeInTheDocument()
    expect(screen.getByText("aside")).toBeInTheDocument()
    expect(screen.getByText("Nothing in this period.")).toBeInTheDocument()
    renderWithProviders(<NoData>Custom empty</NoData>)
    expect(screen.getByText("Custom empty")).toBeInTheDocument()
  })

  it("animates count-up when motion is allowed", async () => {
    reduced.value = false
    vi.useFakeTimers()
    renderWithProviders(<HeroFigure value={50} currency="BRL" />)
    await vi.advanceTimersByTimeAsync(800)
    vi.useRealTimers()
  })
})
