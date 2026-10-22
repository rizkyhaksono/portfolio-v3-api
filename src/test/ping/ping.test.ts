import { describe, expect, it } from 'bun:test'

describe('Ping', () => {
  it('returns a minimal liveness body', async () => {
    const res = await fetch(`http://localhost:${Bun.env.PORT}/ping`)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ status: 'ok' })
  }),
    it('handles non-GET requests', async () => {
      const res = await fetch(`http://localhost:${Bun.env.PORT}/ping`, {
        method: 'POST',
      })
      const data = await res.json()

      expect(data).toEqual({
        name: "NOT_FOUND",
        message: "The requested resource was not found.",
      })
    }),
    it('handles unknown routes', async () => {
      const res = await fetch(`http://localhost:${Bun.env.PORT}/unknown-route`)
      const data = await res.json()

      expect(data).toEqual({
        name: "NOT_FOUND",
        message: "The requested resource was not found.",
      })
    })
})