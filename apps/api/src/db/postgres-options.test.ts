import { describe, expect, it } from "vitest"
import { postgresClientOptions } from "./postgres-options.ts"

describe("postgresClientOptions", () => {
  it("uses TCP defaults when the URL has a host", () => {
    expect(postgresClientOptions("postgres://localhost:5432/test")).toEqual({ max: 10 })
    expect(postgresClientOptions("postgres://usuario@localhost/projects_manager")).toEqual({
      max: 10,
    })
  })

  it("uses the Ubuntu unix socket when the URL has no host", () => {
    expect(postgresClientOptions("postgres:///projects_manager")).toEqual({
      max: 10,
      host: "/var/run/postgresql",
    })
  })

  it("honors PGHOST for hostless URLs", () => {
    expect(postgresClientOptions("postgres:///projects_manager", { PGHOST: "/tmp" })).toEqual({
      max: 10,
      host: "/tmp",
    })
  })
})
