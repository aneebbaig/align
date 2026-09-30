#!/bin/sh
set -e

# Refuse to start without the auth secrets (set them in apps/web/.env).
for var in AUTH_SECRET BETTER_AUTH_SECRET; do
  eval "val=\${$var:-}"
  if [ -z "$val" ]; then
    echo "✖ $var is not set - add it to apps/web/.env (openssl rand -base64 32)"
    exit 1
  fi
done

# Apply migrations, retrying while Postgres finishes coming up.
echo "▶ Applying database migrations..."
n=0
until pnpm prisma migrate deploy; do
  n=$((n + 1))
  if [ "$n" -ge 10 ]; then
    echo "✖ migrations failed after $n attempts"
    exit 1
  fi
  echo "  database not ready — retry $n/10 in 3s..."
  sleep 3
done

# Optional first-run seed (categories + an admin user from USER1_* env vars).
if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "▶ Seeding database..."
  pnpm exec tsx prisma/seed.ts || echo "⚠ seed failed or already applied — continuing"
fi

echo "▶ Starting Align on :${PORT:-3000}"
exec "$@"
