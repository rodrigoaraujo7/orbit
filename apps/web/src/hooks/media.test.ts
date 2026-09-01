import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useIsMobile } from './use-mobile.ts'
import { useReducedMotion } from './use-reduced-motion.ts'

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const media = {
    matches,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    }),
    removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    }),
    dispatchEvent: vi.fn(),
  }
  window.matchMedia = vi.fn().mockReturnValue(media)
  return { media, listeners }
}

describe('media hooks', () => {
  it('tracks mobile breakpoint changes', () => {
    const { listeners } = mockMatchMedia(true)
    const { result, unmount } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
    act(() => {
      for (const listener of listeners) listener({ matches: false } as MediaQueryListEvent)
    })
    unmount()
  })

  it('tracks reduced motion', () => {
    const { media, listeners } = mockMatchMedia(false)
    const { result, unmount } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
    act(() => {
      media.matches = true
      for (const listener of listeners) listener({ matches: true } as MediaQueryListEvent)
    })
    expect(result.current).toBe(true)
    unmount()
  })
})
