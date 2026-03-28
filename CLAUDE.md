# portfolio-v3-api — Claude Instructions

## Project Overview

REST API backend for a personal portfolio site. Built with **Bun + Elysia.js + Prisma + PostgreSQL**.
Exposes portfolio data (projects, work, education), user auth, AI chat, public chat, and various third-party integrations.

Live API prefix: `/v3`

---

## Tech Stack

| Layer | Tech |
|---|---|
| Runtime | Bun |
| Framework | Elysia.js |
| ORM | Prisma v7 (PostgreSQL) |
| Auth | Lucia v3 + Arctic (OAuth) |
| Storage | MinIO (S3-compatible) |
| AI | Google Gemini (`@google/generative-ai`) |
| Logging | Pino + Loki |
| Validation | Elysia `t` (TypeBox) + Zod (for pagination utils) |
| Testing | `bun:test` (integration tests) |

---

## Architecture

```
src/
  api/
    controller/          # One folder per domain
      tools/             # Third-party integrations (no auth required)
      auth/              # Lucia + OAuth
      project/           # Portfolio CRUD (admin-only writes)
      work/ education/   # Same pattern as project
      user/              # Profile + avatar/banner upload
      ai/                # Gemini AI chat
      public-chat/       # Public message board
      rss/               # RSS feed
    index.ts             # Route registration (.group() per domain)
  libs/                  # Singleton clients (Prisma, Minio, Lucia, Elysia factory)
  models/                # Named Elysia models (t.Object) for reuse across routes
  utils/                 # Pagination, error handler, minio helpers
  constants/             # Custom exceptions, static data
  types/                 # TypeScript interfaces
  test/                  # Integration tests (mirrors controller structure)
  index.ts               # App bootstrap + CORS + docs
```

---

## Code Conventions

### Controller pattern

Every controller is a standalone Elysia instance exported as default:

```typescript
import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

export default createElysia().get(
  "/endpoint",
  async ({ query }: { query: { field: string; optField?: string } }) => {
    // logic
    return { status: 200, message: "Success", data };
  },
  {
    query: t.Object({
      field: t.String(),
      optField: t.Optional(t.String()),
    }),
    detail: { tags: ["TagName"], summary: "Short description" },
  },
);
```

**Always annotate destructured params explicitly** — `({ query }: { query: { ... } })`.
Using `({ query })` without type annotation causes a TypeScript `any` error (strict mode is on).

For routes that use `set` (custom headers):
```typescript
async ({ query, set }: { query: { ... }; set: any }) => { ... }
```

### Response format

```typescript
// Success
{ status: 200, message: "Success", data: T }

// Error (return, don't throw, for recoverable errors)
{ status: 400 | 404, message: "Reason", data: null }

// Throw only for unrecoverable/unexpected errors — error handler catches them
```

### External API calls

Use native `fetch`. Extract helper functions for each API call:

```typescript
async function fetchSomething(param: string): Promise<SomeType> {
  const res = await fetch(`https://api.example.com/${param}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json;
}
```

### Adding a new tool endpoint

1. Create `src/api/controller/tools/getMyTool.ts`
2. Export default from `src/api/controller/tools/index.ts`
3. Register with `.use(getMyTool)` inside the `/tools` group in `src/api/index.ts`
4. Add tests in `src/test/tools/my-tool.test.ts`

For a new domain group (not tools):
1. Create `src/api/controller/myDomain/` with action files + `index.ts`
2. Add a new `.group("/my-domain", ...)` in `src/api/index.ts`

### Auth-protected routes

```typescript
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";

export default createElysia()
  .use(authGuard)   // requires valid session
  .use(adminGuard)  // requires admin role
  .post("/", async ({ body, user }) => { ... })
```

### Pagination (page-based)

```typescript
import { pageBasedPaginationQuerySchema, PageBasedPaginationQuery } from "@/utils/pagination";
import paginationModel from "@/models/pagination.model";

createElysia()
  .use(paginationModel)
  .get("/", async ({ query }: { query: PageBasedPaginationQuery }) => {
    const { page, limit } = pageBasedPaginationQuerySchema.parse(query);
    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      prismaClient.model.count(),
      prismaClient.model.findMany({ skip, take: limit, orderBy: { created_at: "desc" } }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      status: 200, message: "Success", data,
      page, limit, total, totalPages,
      prev: page > 1 ? page - 1 : null,
      next: page < totalPages ? page + 1 : null,
    };
  }, { query: "pagination.page-based.query.model" })
```

---

## Testing

Tests use **Bun's native test runner** (`bun:test`). They are **integration tests** — they require the server to be running on `Bun.env.PORT`.

```bash
bun dev      # start server in one terminal
bun test     # run tests in another terminal
```

Test files live in `src/test/` mirroring the controller structure:
```
src/test/
  ping/ping.test.ts
  project/get-all.test.ts
  tools/leetcode.test.ts
  rss/rss.test.ts
```

Test structure:
```typescript
import { describe, expect, it } from "bun:test";

describe("GET /v3/endpoint", () => {
  it("returns expected shape", async () => {
    const res = await fetch(`http://localhost:${Bun.env.PORT}/v3/endpoint`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({ status: 200, message: "Success" });
  });
});
```

For third-party API tests, always handle the case where the external API is down:
```typescript
if (data.status === 200) {
  expect(data.data).toMatchObject({ ... });
} else {
  // External API may be unavailable — accept graceful error
  expect(data.status).toBe(400);
}
```

---

## Environment Variables

See `.env.example` for the full list. Key required vars:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (default 3121) |
| `PASSWORD_PEPPER` | Bcrypt pepper for password hashing |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth |

Optional integrations: `SPOTIFY_*`, `MINIO_*`, `LOKI_*`, `COINGECKO_API_KEY`, RPC URLs.

---

## Important Notes

- **`strict: true`** is enabled — always type all function parameters explicitly.
- **Path alias**: `@/*` maps to `./src/*`. Never use relative paths like `../../libs/`.
- **No `console.log`** in committed code — use `logger` from `@/libs/lokiLogger`.
- **Prisma IDs** are `String` (cuid), not `number`.
- **Admin-only writes**: `POST/PUT/DELETE` on project, work, education require both `authGuard` + `adminGuard`.
- **CORS**: Allowed origins are configured in `src/index.ts`. Add new origins there, not per-route.
- **Third-party tools**: Add under `/v3/tools` unless the integration is large enough to warrant its own group (e.g. `/v3/spotify`).
- **No new packages** for simple HTTP integrations — use native `fetch`.
