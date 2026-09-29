"use client"

import dynamic from "next/dynamic"

export function loadLightRays() {
  return import("ui/light-rays")
}

const LightRays = dynamic(loadLightRays, { ssr: false })

export function HeroVisual() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <LightRays
        raysOrigin="top-right"
        raysColor="#c03a4a"
        raysSpeed={0.5}
        lightSpread={1.8}
        rayLength={3.8}
        pulsating={false}
        fadeDistance={3}
        saturation={1}
        followMouse={false}
        mouseInfluence={0}
        noiseAmount={0}
        distortion={0}
      />
    </div>
  )
}
