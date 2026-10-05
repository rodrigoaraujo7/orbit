import type { Metadata, MetadataRoute } from "next"
import { getDictionary, LOCALES, type Locale } from "@/i18n"
import { SITE_URL } from "./site"

const languages = {
  en: "/en",
  "pt-BR": "/pt-BR",
  "x-default": "/en",
} as const

const absoluteLanguages = {
  en: `${SITE_URL}/en`,
  "pt-BR": `${SITE_URL}/pt-BR`,
  "x-default": `${SITE_URL}/en`,
} as const

export function buildMetadata(locale: Locale): Metadata {
  const dictionary = getDictionary(locale)
  return {
    metadataBase: new URL(SITE_URL),
    title: dictionary.meta.title,
    description: dictionary.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages,
    },
    openGraph: {
      title: dictionary.meta.title,
      description: dictionary.meta.description,
      url: `/${locale}`,
      siteName: dictionary.meta.title,
      locale: locale === "pt-BR" ? "pt_BR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: dictionary.meta.title,
      description: dictionary.meta.description,
    },
  }
}

export function sitemapEntries(): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    alternates: { languages: absoluteLanguages },
  }))
}

export function robotsConfig(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

export function softwareJsonLd(locale: Locale) {
  const dictionary = getDictionary(locale)
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: dictionary.meta.title,
    description: dictionary.meta.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/${locale}`,
    inLanguage: locale,
  }
}
