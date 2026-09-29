"use client"

import dynamic from "next/dynamic"

export function loadGrainient() {
  return import("ui/grainient")
}

const Grainient = dynamic(loadGrainient, { ssr: false })

export function HeroVisual({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0" role="img" aria-label={label}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--primary),transparent_58%)] opacity-40" />
      <Grainient
        color1="#c03a4a"
        color2="#020202"
        color3="#c03a4a"
        timeSpeed={0.5}
        colorBalance={-0.5}
        warpStrength={1}
        warpFrequency={5}
        warpSpeed={2}
        warpAmplitude={50}
        blendAngle={0}
        blendSoftness={0.05}
        rotationAmount={500}
        noiseScale={2}
        grainAmount={0.1}
        grainScale={2}
        grainAnimated={false}
        contrast={1.3}
        gamma={1}
        saturation={1}
        centerX={0}
        centerY={0}
        zoom={0.9}
      />
    </div>
  )
}
