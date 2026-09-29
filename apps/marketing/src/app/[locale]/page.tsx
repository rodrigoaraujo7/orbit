import { notFound } from "next/navigation"
import { Cta } from "@/components/sections/cta"
import { Faq } from "@/components/sections/faq"
import { Features } from "@/components/sections/features"
import { Footer } from "@/components/sections/footer"
import { Header } from "@/components/sections/header"
import { Hero } from "@/components/sections/hero"
import { How } from "@/components/sections/how"
import { Pains } from "@/components/sections/pains"
import { Security } from "@/components/sections/security"
import { getDictionary, isLocale, type Locale } from "@/i18n"
import { softwareJsonLd } from "@/lib/seo"

export function JsonLd({ locale }: { locale: Locale }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd(locale)) }}
    />
  )
}

export default async function LocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dictionary = getDictionary(locale)
  return (
    <>
      <JsonLd locale={locale} />
      <Header dictionary={dictionary} locale={locale} />
      <main>
        <Hero dictionary={dictionary} locale={locale} />
        <Pains dictionary={dictionary} />
        <Features dictionary={dictionary} />
        <How dictionary={dictionary} />
        <Security dictionary={dictionary} />
        <Faq dictionary={dictionary} />
        <Cta dictionary={dictionary} />
      </main>
      <Footer dictionary={dictionary} locale={locale} />
    </>
  )
}
