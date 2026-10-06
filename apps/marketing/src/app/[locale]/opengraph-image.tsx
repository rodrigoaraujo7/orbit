import { ImageResponse } from "next/og"
import { notFound } from "next/navigation"
import { getDictionary, isLocale } from "@/i18n"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Orbit"

export function OgCard({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#121212",
        color: "#fbfbfb",
        padding: "72px",
      }}
    >
      <div style={{ fontSize: 28, letterSpacing: 4, color: "#c45a68" }}>ORBIT</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 72, lineHeight: 1.05 }}>{title}</div>
        <div style={{ fontSize: 32, color: "#b5b5b5", maxWidth: 900 }}>{description}</div>
      </div>
    </div>
  )
}

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dictionary = getDictionary(locale)
  return new ImageResponse(
    <OgCard title={dictionary.meta.title} description={dictionary.meta.description} />,
    size,
  )
}
