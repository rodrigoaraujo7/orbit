import { describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { appOrigin, signInUrl, signUpUrl, SITE_URL } from "./site"
import { buildMetadata, robotsConfig, sitemapEntries, softwareJsonLd } from "./seo"

describe("site urls", () => {
  it("defaults the app origin and builds auth links", () => {
    expect(SITE_URL).toBe("https://orbit.rodrigoleite.dev")
    const previous = process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(appOrigin()).toBe("https://app.orbit.rodrigoleite.dev")
    expect(signInUrl()).toBe("https://app.orbit.rodrigoleite.dev/login")
    expect(signUpUrl()).toBe("https://app.orbit.rodrigoleite.dev/login?mode=signup")
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.test/"
    expect(appOrigin()).toBe("https://app.example.test")
    expect(signInUrl()).toBe("https://app.example.test/login")
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = previous
  })
})

describe("seo", () => {
  it("builds locale metadata with canonical and hreflang", () => {
    const metadata = buildMetadata("pt-BR")
    expect(metadata.metadataBase?.toString()).toBe(`${SITE_URL}/`)
    expect(metadata.title).toBe(getDictionary("pt-BR").meta.title)
    expect(metadata.description).toBe(getDictionary("pt-BR").meta.description)
    expect(metadata.alternates).toEqual({
      canonical: "/pt-BR",
      languages: {
        en: "/en",
        "pt-BR": "/pt-BR",
        "x-default": "/en",
      },
    })
    expect(metadata.openGraph).toMatchObject({
      url: "/pt-BR",
      locale: "pt_BR",
      siteName: "Orbit",
      type: "website",
    })
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Orbit",
    })
    expect(buildMetadata("en").openGraph).toMatchObject({ locale: "en_US", url: "/en" })
  })

  it("lists both locales in the sitemap and points robots at it", () => {
    expect(sitemapEntries()).toEqual([
      {
        url: `${SITE_URL}/en`,
        alternates: {
          languages: {
            en: `${SITE_URL}/en`,
            "pt-BR": `${SITE_URL}/pt-BR`,
            "x-default": `${SITE_URL}/en`,
          },
        },
      },
      {
        url: `${SITE_URL}/pt-BR`,
        alternates: {
          languages: {
            en: `${SITE_URL}/en`,
            "pt-BR": `${SITE_URL}/pt-BR`,
            "x-default": `${SITE_URL}/en`,
          },
        },
      },
    ])
    expect(robotsConfig()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: `${SITE_URL}/sitemap.xml`,
    })
  })

  it("describes the product as a software application", () => {
    expect(softwareJsonLd("en")).toEqual({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Orbit",
      description: getDictionary("en").meta.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: `${SITE_URL}/en`,
      inLanguage: "en",
    })
    expect(softwareJsonLd("pt-BR").inLanguage).toBe("pt-BR")
    expect(softwareJsonLd("pt-BR").url).toBe(`${SITE_URL}/pt-BR`)
  })
})
