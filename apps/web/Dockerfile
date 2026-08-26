# syntax=docker/dockerfile:1
# Self-contained image for the Align web app (Next.js 16 + Prisma + Postgres).
# Installs deps, generates the Prisma client and builds; at container start it
# applies migrations (and optionally seeds) then boots the production server.

FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app

# Install dependencies first against the committed lockfile for better caching.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build. A placeholder DATABASE_URL keeps `prisma generate` / `next build`
# happy — no database is contacted at build time; the real URL is injected at
# runtime by docker-compose.
COPY . .
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm prisma generate && pnpm build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["pnpm", "start"]
