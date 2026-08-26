#!/usr/bin/env bash
# Vercel "Ignored Build Step" for the web app.
#
# This is a monorepo with a Flutter app living alongside the Next.js app.
# Mobile-only commits (version bumps, CI tweaks, etc.) shouldn't trigger a
# web deploy, but they can land between two real web deploys - a naive
# HEAD^..HEAD check would only look at the latest commit and miss that.
# Diffing against VERCEL_GIT_PREVIOUS_SHA (the last deployed commit for this
# project + branch) correctly covers everything since the last real deploy.
#
# Vercel convention: exit 0 => skip build, exit 1 => build.
set -u

# Personal project, no preview deployments - only main ever deploys.
if [ "${VERCEL_GIT_COMMIT_REF:-}" != "main" ]; then
  echo "Branch '${VERCEL_GIT_COMMIT_REF:-unknown}' is not main — skipping build."
  exit 0
fi

# No known previous deploy (first build, or the var isn't available): build.
[ -z "${VERCEL_GIT_PREVIOUS_SHA:-}" ] && exit 1

# The previous SHA may be missing from Vercel's shallow clone; try to fetch it.
# If this fails the diff below errors out and we fall through to a build.
git fetch --depth=1 origin "$VERCEL_GIT_PREVIOUS_SHA" >/dev/null 2>&1 || true

# cwd is the project Root Directory (apps/web), so "." scopes the diff to it.
if git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- . 2>/dev/null; then
  echo "No apps/web changes since $VERCEL_GIT_PREVIOUS_SHA — skipping build."
  exit 0
fi

echo "apps/web changed since $VERCEL_GIT_PREVIOUS_SHA — building."
exit 1
