import { useReducedMotion } from '@/hooks/use-reduced-motion'

/** Gap between one stacked series starting and the next, in ms. */
const SERIES_STAGGER = 90
const CHART_DURATION = 700

/**
 * Entrance animation for a Recharts series. Call with the series index so a
 * stack grows bottom-up in sequence instead of all at once, and so the whole
 * dashboard shares one timing curve.
 */
export function useChartMotion() {
  const reduced = useReducedMotion()

  return (seriesIndex = 0) => ({
    isAnimationActive: !reduced,
    animationBegin: seriesIndex * SERIES_STAGGER,
    animationDuration: CHART_DURATION,
    animationEasing: 'ease-out' as const,
  })
}

/**
 * Recessive axes: no axis line, no tick marks. The grid already says where the
 * values are; a boxed-in chart just adds ink. `tabular-nums` is inherited by
 * the tick `<text>` so numbers don't jitter as they change.
 */
export const axisProps = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  className: 'tabular-nums',
} as const

/**
 * 2px of surface between adjacent fills — stacked segments read as separate
 * marks instead of one blurred column. Uses the page surface, not a gray.
 */
export const surfaceGap = {
  stroke: 'var(--background)',
  strokeWidth: 2,
} as const
