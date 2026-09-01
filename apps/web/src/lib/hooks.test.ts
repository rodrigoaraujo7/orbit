import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './use-debounced-value.ts'
import { useDraftSearch } from './use-draft-search.ts'

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

describe('useDraftSearch', () => {
  it('commits trimmed drafts and syncs from the URL', () => {
    vi.useFakeTimers()
    const commit = vi.fn()
    const { result, rerender } = renderHook(({ url }) => useDraftSearch(url, commit), {
      initialProps: { url: 'acme' as string | undefined },
    })
    expect(result.current[0]).toBe('acme')
    act(() => {
      result.current[1](' ada ')
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(commit).toHaveBeenCalledWith('ada')
    rerender({ url: 'from-url' })
    expect(result.current[0]).toBe('from-url')
    act(() => {
      result.current[1]('   ')
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(commit).toHaveBeenCalledWith(undefined)
    vi.useRealTimers()
  })
})
