/**
 * Date spine shared by the invoices and by the dashboard aggregations.
 *
 * Everything is a string ("YYYY-MM-DD" for days, "YYYY-MM" for months) and is
 * parsed by hand, never through `new Date(iso)` — that reads the string as UTC
 * and goes back a day in Brazil's timezone. Same reason `format.ts` parses
 * dates by hand.
 *
 * Relative imports and no browser API on purpose: this module is pulled in by
 * the self-checks that run on `node --experimental-strip-types`.
 */

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

/** Today as "YYYY-MM-DD", in local time. */
export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Now as "YYYY-MM-DDTHH:mm", in local time — comment timestamps. */
export function nowDateTimeIso(): string {
  const now = new Date()
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `${date}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/** "2026-09-05" → "2026-09". Also a no-op on a value that is already a month. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7)
}

/** "2026-11" + 3 → "2027-02". Negative `count` walks backwards. */
export function addMonths(month: string, count: number): string {
  const [year, monthNumber] = month.split("-").map(Number)
  const shifted = new Date(year, monthNumber - 1 + count, 1)
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}`
}

/**
 * Attaches a day to a month, clamping to the month's length — a deal started on
 * the 31st would otherwise produce "2026-04-31", a string that sorts and
 * compares wrong against every other date.
 */
export function dayOfMonth(month: string, day: number): string {
  const [year, monthNumber] = month.split("-").map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  return `${month}-${pad(Math.min(day, lastDay))}`
}

/** Whole months from `from` to `to`, inclusive: ["2026-07", "2026-08", …]. */
export function monthRange(from: string, to: string): string[] {
  if (from > to) return []
  const months: string[] = []
  for (let month = from; month <= to; month = addMonths(month, 1)) {
    months.push(month)
  }
  return months
}

/** Distance in whole months. `monthsBetween("2026-07", "2026-09")` is 2. */
export function monthsBetween(from: string, to: string): number {
  const [fromYear, fromMonth] = from.split("-").map(Number)
  const [toYear, toMonth] = to.split("-").map(Number)
  return (toYear - fromYear) * 12 + (toMonth - fromMonth)
}
