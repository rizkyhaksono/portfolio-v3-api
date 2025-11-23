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
  })
})