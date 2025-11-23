import { describe, expect, it } from 'bun:test'

describe('Get All Project', () => {
  it('returns all data with expected shape', async () => {
    const res = await fetch(`http://localhost:${Bun.env.PORT}/v3/project`)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({
      status: 200,
      message: 'Success',
      data: expect.any(Array),
      hasMore: expect.any(Boolean),
      nextCursor: expect.any(String),
    })
  }),
    it('handle unknown routes', async () => {
      const res = await fetch(`http://localhost:${Bun.env.PORT}/v3/unknown-route`)
      const data = await res.json()

      expect(data).toEqual({
        name: "NOT_FOUND",
        message: "The requested resource was not found.",
      })
    }),
    it('handle limit query param', async () => {
      const res = await fetch(`http://localhost:${Bun.env.PORT}/v3/project?limit=2`)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.length).toBe(2)
    }),
    it('handle invalid limit query param', async () => {
      const res = await fetch(`http://localhost:${Bun.env.PORT}/v3/project?limit=invalid`)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.type).toBe('validation')
      expect(data.message).toBe('Expected union value')
      expect(data.property).toBe('/limit')
    })
})
