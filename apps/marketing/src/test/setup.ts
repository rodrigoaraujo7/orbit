import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

vi.mock("next/font/google", () => ({
  Instrument_Sans: () => ({ variable: "font-sans", className: "font-sans" }),
  Instrument_Serif: () => ({ variable: "font-serif", className: "font-serif" }),
}))

vi.mock("ui/grainient", () => ({
  default: () => null,
}))
