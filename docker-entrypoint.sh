#!/bin/sh
set -eu

echo "[entrypoint] Running prisma migrate deploy..."
bunx prisma migrate deploy

echo "[entrypoint] Starting portfolio-v3-api on PORT=${PORT:-3121}..."
exec bun src/index.ts
