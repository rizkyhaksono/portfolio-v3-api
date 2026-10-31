FROM oven/bun:1.2-debian

WORKDIR /app

RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY generated ./generated
COPY tsconfig.json ./

# prisma.config.ts requires DATABASE_URL at config load; dummy is fine for generate
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"

RUN bun install --frozen-lockfile \
  && bunx prisma generate

COPY src ./src
COPY lokiLogger.ts ./lokiLogger.ts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3121
EXPOSE 3121

# Run as the image's unprivileged bun user; the app only reads /app.
USER bun

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
