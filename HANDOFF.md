# Handoff - project status

Written at the end of a session that made the Android app work against any
server, put screenshots in the README, and disconnected this repo from any
hosting. Read this before picking the repo back up.

## Where things stand

**Web**: healthy. `main` is the release branch. This repo is not connected to
any hosting provider - no deployment integration, no environments, no deploy
statuses. Anyone running the app deploys their own copy;
[apps/web/DEPLOYMENT.md](apps/web/DEPLOYMENT.md) is the guide.

**Mobile**: v1.2.0 is the latest release (signed APK on GitHub Releases,
Obtainium-trackable). The APK no longer has a server URL compiled in: the app
asks for one on first launch, validates it, and stores it. One published build
now works for anybody self-hosting.

**Demo**: none, deliberately. A hosted demo was scoped twice and dropped twice -
the second time in favour of README screenshots, which now exist. If it ever
comes back, the cheap version (one shared database, reset hourly by cron) is the
one to build; per-visitor ephemeral sandboxes were priced and judged not worth
it for this audience.

## CI and releases

Four workflows, all in `.github/workflows/`. Everything runs here; nothing in
this repo deploys anything.

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `guard.yml` | push to `main`, every PR | Fails the build if a personal identifier or an AI-assistant reference appears in any tracked file. Greps file contents, not commit messages. |
| `web-ci.yml` | `apps/web/**` changes | Typecheck, lint, vitest, `next build`. |
| `mobile-ci.yml` | `apps/mobile/**` changes | `flutter pub get`, codegen, `flutter analyze`, `flutter test`. |
| `mobile-release.yml` | `apps/mobile/**` push to `main`, or manual | Bumps SemVer from Conventional Commits, tags, builds a signed release APK, publishes it as a GitHub Release. |

Release notes on `mobile-release.yml`:

- The bump comes from Conventional Commits: `feat:` minor, `fix:` patch,
  `BREAKING` major. No `feat`/`fix` since the last tag means no release.
- It needs a baseline tag to bump from. A fresh fork has none, so the first
  release has to be minted once via `workflow_dispatch` (which builds whatever
  version is in `pubspec.yaml`); the auto-bump takes over after that.
- Signing comes from the `KEYSTORE_BASE64`, `STORE_PASSWORD`, `KEY_PASSWORD`,
  and `KEY_ALIAS` secrets. **Losing the keystore means never being able to
  update the app** - back it up outside this repo.
- The APK is built with no server URL baked in, and a step asserts the launcher
  label is still "Align" (a branding regression shipped once before).
- Obtainium tracks this repo's Releases, filtering on `app-release.apk`.

`apps/web/scripts/vercel-ignore.sh` is there for anyone hosting the web app on
Vercel: it skips builds for branches other than `main`, and for `main` pushes
with no `apps/web` diff since that project's last deploy. A docs-only or
mobile-only push legitimately does not rebuild.

## What shipped this session

1. **This repo stopped being a deployment target** - the hosting
   integration was removed, along with the GitHub environments and deployment
   records it had created. The Deployments tab is empty and stays that way.
2. **Runtime server URL in the Android app** - the pending item from
   the last handoff, now done:
   - `apps/mobile/lib/core/network/server_url.dart` holds the configured origin
     (`serverUrlProvider`), seeded in `main()` from secure storage before the
     first frame so the router's first redirect already knows whether the app is
     set up. `normaliseServerUrl()` accepts a bare host, an explicit scheme and
     port, a pasted `/api/v1` URL, trailing slashes, query strings.
   - `server_probe.dart` validates against `/api/health` before saving, so a
     typo is caught at setup instead of surfacing later as a login failure.
   - `features/server_setup/` is the screen. It gates the app when no URL is
     stored, and Settings reopens it as `?change=1` to switch servers (which
     clears the bearer token - it belongs to the old server).
   - `--dart-define=API_BASE_URL` and the repo secret behind it are gone.
   - `usesCleartextTraffic="true"` in the manifest: self-hosters commonly run
     http on their own network. The setup screen warns when the URL is http.
3. **Screenshots + a demo seed** - `pnpm seed:demo`
   (`apps/web/prisma/seed-demo.ts`) builds a fictional household with six months
   of history; the six README screenshots are captured from it. It deletes every
   user first, so it refuses a non-local `DATABASE_URL` unless
   `DEMO_SEED_ALLOW_REMOTE=yes`.
4. **Two real bugs fixed on the way:**
   - `middleware.ts` required a session cookie on `/api/health`, so the mobile
     setup screen would have rejected every correct URL as "behind another
     login". `/api/health` is now in `PUBLIC_PREFIXES`.
   - `prisma/seed.ts` created users with `hashedPassword` but no credential
     `account` row. better-auth signs in against that row (`lib/auth.ts`
     configures the bcrypt verify), so **every seeded login was rejected** -
     including the one the README hands a new self-hoster. Both seeds create it
     now.
5. **Flutter pinned to the stable channel** - `.fvmrc` tracks `stable`, and both
   mobile workflows moved 3.44.4 -> 3.47.1 to match what it resolves to.
   Always use `fvm flutter` / `fvm dart`: a system Flutter older than
   `pubspec.lock` silently downgrades the lockfile and produces analyzer errors
   in code you never touched.

## Pending / not done

1. **`/api/cron/daily`** (the daily digest email) still is not wired to anything
   that calls it. It will never fire on its own; it needs a native Vercel Cron
   Job or an external pinger. Carried over from the last handoff, still open.
2. **Existing installs need the server URL once.** Updating to v1.2.0 keeps app
   data (same signing key), but the URL key was never written by older builds,
   so the first launch after the update shows the setup screen. Expected, not a
   bug.
3. **Screenshots go stale.** They live in `docs/screenshots/` and are captured by
   hand from a `seed:demo` database. Any real UI change makes them wrong, and
   nothing checks that.

## Repo facts worth knowing

- Web and mobile are two clients of one backend. A mobile feature usually needs
  its `/api/v1` route on the web side first, not just mobile-side work.
- Money is an integer in the currency's smallest unit (paisas) everywhere - over
  the wire, in the database, in both apps. Never a float.
- `pnpm seed` creates categories and logins only; `pnpm seed:demo` creates a full
  fictional household and is what the screenshots come from. The demo seed is
  destructive and refuses non-local databases.
- The leak guard is the backstop for keeping personal identifiers and local notes
  out of the repo, but it only sees tracked file contents. Keep commit messages
  and branch names clean by hand.
