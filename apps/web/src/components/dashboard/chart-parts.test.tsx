import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axisProps, surfaceGap, useChartMotion } from './chart-parts'
import { renderWithProviders } from '@/test/render'

const reduced = vi.hoisted(() => ({ value: false }))

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => reduced.value,
}))

afterEach(() => {
  cleanup()
  reduced.value = false
})

function Probe({ index }: { index?: number }) {
  const motion = useChartMotion()
  return <pre>{JSON.stringify(motion(index))}</pre>
}

describe('chart-parts', () => {
  it('exports axis and gap constants', () => {
    expect(axisProps.tickLine).toBe(false)
    expect(surfaceGap.strokeWidth).toBe(2)
  })

  it('staggers series animation', () => {
    renderWithProviders(<Probe index={2} />)
    expect(screen.getByText(/"animationBegin":180/)).toBeInTheDocument()
    expect(screen.getByText(/"isAnimationActive":true/)).toBeInTheDocument()
  })

  it('disables animation when motion is reduced', () => {
    reduced.value = true
    renderWithProviders(<Probe />)
    expect(screen.getByText(/"isAnimationActive":false/)).toBeInTheDocument()
  })
})
