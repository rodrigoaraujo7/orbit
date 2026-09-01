import { isRedirect } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { Route } from './index'

describe('index route', () => {
  it('redirects to the dashboard', () => {
    const beforeLoad = Route.options.beforeLoad
    expect(beforeLoad).toBeTypeOf('function')
    try {
      beforeLoad?.({} as never)
      expect.unreachable('expected a redirect')
    } catch (error) {
      expect(isRedirect(error)).toBe(true)
    }
  })
})
