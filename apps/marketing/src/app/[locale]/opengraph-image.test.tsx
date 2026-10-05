import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const imageResponse = vi.hoisted(() =>
  vi.fn(function ImageResponse(this: { element: unknown }, element: unknown) {
    this.element = element
  }),
)

vi.mock("next/og", () => ({
  ImageResponse: imageResponse,
}))

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found")
  },
}))

import robots from "@/app/robots"
import sitemap from "@/app/sitemap"
import OpenGraphImage, { alt, contentType, OgCard, size } from "./opengraph-image"
import { robotsConfig, sitemapEntries } from "@/lib/seo"

describe("sitemap and robots routes", () => {
  it("serves the shared entries", () => {
    expect(sitemap()).toEqual(sitemapEntries())
    expect(robots()).toEqual(robotsConfig())
  })
})

describe("open graph image", () => {
  it("renders the card copy", () => {
    render(<OgCard title="Projects Manager" description="One account." />)
    expect(screen.getByText("Projects Manager")).toBeInTheDocument()
    expect(screen.getByText("One account.")).toBeInTheDocument()
    expect(size).toEqual({ width: 1200, height: 630 })
    expect(contentType).toBe("image/png")
    expect(alt).toBe("Projects Manager")
  })

  it("builds an image response for a locale and rejects unknown ones", async () => {
    const response = await OpenGraphImage({ params: Promise.resolve({ locale: "pt-BR" }) })
    expect(response).toBeInstanceOf(imageResponse)
    expect(imageResponse).toHaveBeenCalledWith(expect.anything(), size)
    await expect(OpenGraphImage({ params: Promise.resolve({ locale: "fr" }) })).rejects.toThrow(
      "not-found",
    )
  })
})
