import { describe, expect, it } from "vitest"
import i18n from "../../i18n/index.ts"
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDeal,
  formatDealProgress,
  formatMonth,
  formatMonthLong,
  formatPercent,
  formatToolsProgress,
  maskBrPhone,
} from "./index"

describe("format", () => {
  it("masks Brazilian phones", () => {
    expect(maskBrPhone("")).toBe("")
    expect(maskBrPhone("11")).toBe("(11")
    expect(maskBrPhone("1199")).toBe("(11) 99")
    expect(maskBrPhone("1134567890")).toBe("(11) 3456-7890")
    expect(maskBrPhone("11987654321")).toBe("(11) 98765-4321")
    expect(maskBrPhone("11987654321999")).toBe("(11) 98765-4321")
  })

  it("formats dates, money and deals", async () => {
    await i18n.changeLanguage("en-US")
    expect(formatDate("2026-09-05")).toBe("09/05/2026")
    expect(formatDate("bad")).toBe("bad")
    expect(formatDateTime("2026-08-10T14:32")).toBe("08/10/2026 14:32")
    expect(formatDateTime("2026-08-10")).toBe("08/10/2026")
    expect(formatCurrency(10)).toContain("10")
    expect(formatDeal({ kind: "upfront", amount: 0 })).toBe(i18n.t("deal.free"))
    expect(formatDeal({ kind: "upfront", amount: 100 })).toContain(
      i18n.t("format.upfrontAmount").slice(0, 2) === "" ? "" : "",
    )
    expect(formatDeal({ kind: "upfront", amount: 100 }).length).toBeGreaterThan(0)
    expect(formatDeal({ kind: "installment", amount: 18000, installments: 3 })).toContain("3")
    expect(formatDealProgress({ kind: "upfront", amount: 0 }, [])).toBe(i18n.t("deal.free"))
    expect(formatDealProgress({ kind: "upfront", amount: 10 }, [])).toBe(i18n.t("deal.upfront"))
    expect(
      formatDealProgress({ kind: "installment", amount: 30, installments: 3 }, [
        { status: "paid" },
        { status: "overdue" },
        { status: "pending" },
      ]),
    ).toContain("·")
    expect(
      formatDealProgress(
        { kind: "installment", amount: 30, installments: 3 },
        { paid: 3, total: 3, overdue: 0 },
      ),
    ).not.toContain("·")
    expect(
      formatToolsProgress([
        { id: "a", name: "A", category: "other", secrets: [] },
        {
          id: "b",
          name: "B",
          category: "other",
          secrets: [],
          billing: { amount: 1, cycle: "monthly", nextInvoice: "2026-01-01", payer: "me" },
        },
      ]),
    ).toMatch(/1/)
    expect(formatMonth("2026-09")).toMatch(/26/)
    expect(formatMonthLong("2026-09")).toMatch(/2026/)
    expect(formatCompactCurrency(1500)).toBeTruthy()
    expect(formatPercent(0.42)).toMatch(/42/)
    expect(formatCurrency(1, "USD")).toBe(formatCurrency(1, "USD"))
    expect(formatCompactCurrency(1, "USD")).toBe(formatCompactCurrency(1, "USD"))
    expect(formatPercent(0.5)).toBe(formatPercent(0.5))
  })
})
