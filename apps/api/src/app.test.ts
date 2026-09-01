import { describe, expect, it } from 'vitest'
import { app } from './app.ts'

describe('app', () => {
  it('serves /health with secure headers', async () => {
    const health = await app.request('/health')
    expect(health.status).toBe(200)
    expect(await health.json()).toEqual({ ok: true })
    expect(health.headers.get('x-content-type-options')).toBe('nosniff')
    expect(health.headers.get('x-frame-options')).toBeTruthy()
  })

  it('returns a JSON 404', async () => {
    const missing = await app.request('/nope')
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ error: 'not_found' })
  })

  it('answers CORS preflight from the web origin', async () => {
    const response = await app.request('/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    })
    expect(response.status).toBeLessThan(500)
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })
})
