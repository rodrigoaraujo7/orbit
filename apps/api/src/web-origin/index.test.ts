import { describe, expect, it } from "vitest"
import { webOriginAliases } from "./index.ts"

const loopbackHost = "localhost"
const localOrigin = `http://${loopbackHost}:5173`
const ipv4Origin = "http://127.0.0.1:5173"

describe("webOriginAliases", () => {
  it("pairs localhost with the loopback address and keeps port and protocol", () => {
    expect(webOriginAliases(localOrigin).sort()).toEqual([ipv4Origin, localOrigin].sort())
    expect(webOriginAliases(ipv4Origin).sort()).toEqual([ipv4Origin, localOrigin].sort())
    expect(webOriginAliases("https://localhost").sort()).toEqual(
      ["https://127.0.0.1", "https://localhost"].sort(),
    )
  })

  it("leaves other hosts and invalid values unchanged", () => {
    expect(webOriginAliases("https://app.example.com")).toEqual(["https://app.example.com"])
    expect(webOriginAliases("not a url")).toEqual(["not a url"])
    expect(webOriginAliases("  ")).toEqual([])
  })
})
