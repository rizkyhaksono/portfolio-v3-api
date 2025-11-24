import { describe, expect, it } from "bun:test";

describe('Get Project By ID', () => {
  it('returns project data with expected shape', async () => {
    const res = await fetch(`http://localhost:${Bun.env.PORT}/v3/project/cmiblqb700009umgys5dq4153`)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe(200)
    expect(data).toMatchObject({
      data: {
        id: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        image: expect.any(String),
        projectLink: expect.any(String),
        content: expect.any(String),
        isFeatured: expect.any(Boolean),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      },
    })
    expect(Object.keys(data)).toEqual(['status', 'data'])
  })
})