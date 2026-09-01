import { beforeEach, describe, expect, it, vi } from "vitest"

function storage(getItem: () => string | null, setItem: () => void = () => undefined) {
  return {
    getItem,
    setItem,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  } satisfies Storage
}

describe("i18n storage", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("reads a stored locale", async () => {
    vi.stubGlobal(
      "localStorage",
      storage(() => "pt-BR"),
    )
    const { getLocale } = await import("./index.ts")
    expect(getLocale()).toBe("pt-BR")
  })

  it("ignores an unsupported stored locale", async () => {
    vi.stubGlobal(
      "localStorage",
      storage(() => "fr-FR"),
    )
    const { DEFAULT_LOCALE, getLocale } = await import("./index.ts")
    expect(getLocale()).toBe(DEFAULT_LOCALE)
  })

  it("survives blocked storage on read and write", async () => {
    vi.stubGlobal(
      "localStorage",
      storage(
        () => {
          throw new Error("blocked")
        },
        () => {
          throw new Error("blocked")
        },
      ),
    )
    const { DEFAULT_LOCALE, getLocale, default: i18n } = await import("./index.ts")
    expect(getLocale()).toBe(DEFAULT_LOCALE)
    await i18n.changeLanguage("pt-BR")
    expect(getLocale()).toBe("pt-BR")
  })
})
