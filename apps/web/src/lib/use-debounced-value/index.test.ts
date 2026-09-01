import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './index'

describe('useDebouncedValue', () => {
  it('updates after the delay', () => {
    vi.useFakeTimers()
    const { result, rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    })
    expect(result.current).toBe('a')
    rerender({ value: 'ab' })
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe('a')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('ab')
    unmount()
    vi.useRealTimers()
  })
})
