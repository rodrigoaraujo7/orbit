export type PeriodPreset = "today" | "7d" | "30d" | "90d" | "all" | "custom"

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date: Date, count: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + count)
  return next
}

export function periodBounds(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string,
  now = new Date(),
): { from?: string; to?: string } {
  const today = isoDate(now)
  if (preset === "all") return {}
  if (preset === "custom") {
    return {
      from: customFrom || undefined,
      to: customTo || undefined,
    }
  }
  if (preset === "today") return { from: today, to: today }
  const daysBack = preset === "7d" ? 6 : preset === "30d" ? 29 : 89
  return { from: isoDate(addDays(now, -daysBack)), to: today }
}
