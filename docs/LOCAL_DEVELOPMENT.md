# Running Align locally

The one guide for getting Align running on your own machine, start to finish.
Deploying it somewhere is a separate, later step: [apps/web/DEPLOYMENT.md](../apps/web/DEPLOYMENT.md).

Align is two apps. `apps/web` is the website **and** the backend (it owns the
database and serves the `/api/v1` API). `apps/mobile` is an Android app that only
talks to that backend. So the order is always: **database → web app → (optionally)
mobile app.** If you only want the website, stop after step 3.

---

## 1. Install the tools

| For | You need |
|---|---|
| Web app | Node 20+, [pnpm](https://pnpm.io) (version pinned in `apps/web/package.json` → `packageManager`; `corepack enable` picks it up), Docker (for the local database) |
| Mobile app | [fvm](https://fvm.app/documentation/getting-started/installation), the Android SDK (Android Studio is the easy way), JDK 17 |

No Docker? Any Postgres works, including a free [Neon](https://neon.tech) branch - put
its URL in `DATABASE_URL` in step 2 and skip the `docker compose` command.

## 2. Start the database and configure the web app

Everything web-side runs from `apps/web`:

```bash
cd apps/web
docker compose up -d db          # Postgres 17 on localhost:5434 (user/pass/db: align/align/align_dev)
cp .env.example .env.local
```

Edit `.env.local`. For a local setup you only need to fill in a few things:

```env
DATABASE_URL="postgresql://align:align@localhost:5434/align_dev"
DATABASE_URL_UNPOOLED="postgresql://align:align@localhost:5434/align_dev"
AUTH_SECRET="<output of: openssl rand -base64 32>"
BETTER_AUTH_SECRET="<another: openssl rand -base64 32>"
USER1_EMAIL="you@example.com"     # your login
USER1_PASSWORD="<8+ characters>"
```

Everything else in the file is optional (a second user, Gmail alerts, the cron
secret, renaming the app). `.env.local` is gitignored - never commit it.

## 3. Install, create the tables, and run the web app

```bash
pnpm install
pnpm exec prisma generate        # builds the database client into src/generated/
pnpm exec prisma migrate dev     # creates all tables
pnpm seed                        # default categories + your login(s)
pnpm dev                         # http://localhost:3000
```

Sign in with `USER1_EMAIL` / `USER1_PASSWORD`. The seed always creates a second
user too; if you left `USER2_*` empty it uses `member@example.com` with a random
password that it prints **once** - note it down, or set `USER2_PASSWORD` before seeding.

Re-running `pnpm seed` is safe; it doesn't wipe anything.

### Optional: fill it with demo data

A fresh install is empty, which makes it hard to see what the screens are for.
`pnpm seed:demo` builds a fictional household - six months of income and spending,
budgets, savings pots, investments, loans, plans, projects, and lists. It's what
the README screenshots are taken from.

```bash
pnpm seed:demo                   # then sign in as demo@example.com / demo12345
```

**It deletes every user first** (and all their data). It refuses to run against
anything but a local database unless you set `DEMO_SEED_ALLOW_REMOTE=yes` - never
point it at a database you care about. Change the login with `DEMO_EMAIL`,
`DEMO_PASSWORD`, `DEMO_NAME`.

## 4. Run the mobile app (optional)

Keep `pnpm dev` running - the phone app needs it. In a second terminal:

```bash
cd apps/mobile
fvm install stable && fvm use stable       # once; .fvmrc tracks the stable channel
fvm flutter pub get
fvm dart run build_runner build --delete-conflicting-outputs
fvm flutter run                            # with an emulator running or a phone plugged in
```

Always go through `fvm` - a system `flutter` older than `pubspec.lock` silently
downgrades the lockfile and causes analyzer errors in code you didn't touch.

On first launch the app asks for your **server address**. What to type depends on
where the app is running:

| App running on | Server address |
|---|---|
| Android emulator | `http://10.0.2.2:3000` (the emulator's name for your computer) |
| Phone over USB | Run `adb reverse tcp:3000 tcp:3000`, then use `http://localhost:3000` |
| Phone on the same Wi-Fi | `http://<your computer's LAN IP>:3000` (`pnpm dev` prints it as "Network") |

The app checks the address against `/api/health` before saving it, then shows the
login screen - use the same login as the website. You can change the server later
in Settings.

Re-run the `build_runner` command whenever you change a provider, model, or
anything with an annotation.

---

## Alternative: run the whole web app in Docker

If you just want to *use* Align locally (not work on the code), Docker can run the
database and the web app together - no Node or pnpm needed:

```bash
cd apps/web
cp .env.docker.example .env      # set AUTH_SECRET, BETTER_AUTH_SECRET, USER1_PASSWORD
docker compose up --build        # http://localhost:3000
```

Migrations run automatically and (with `SEED_ON_START=true`) your `USER1_*` login is
created. This uses the same database container and port as step 2, and the same
port 3000 as `pnpm dev`, so don't run both at once.

---

## Day to day

| Task | Command (from `apps/web`) |
|---|---|
| Start the database | `docker compose up -d db` |
| Stop it (data is kept) | `docker compose stop db` |
| Wipe the database completely | `docker compose down -v` - then redo step 3 |
| Browse the data | `pnpm exec prisma studio` |
| After pulling new migrations | `pnpm exec prisma generate && pnpm exec prisma migrate dev` |

Before opening a PR, run the checks CI runs - listed in
[CONTRIBUTING.md](../CONTRIBUTING.md#before-you-push).

## When something goes wrong

| Symptom | Fix |
|---|---|
| `Cannot find module '.../generated/prisma'` | Run `pnpm exec prisma generate`. |
| `prisma migrate dev` asks *"Enter a name for the new migration"* | On a clean checkout it should never ask - it means `schema.prisma` and the migrations disagree. Press Ctrl+C, don't let it create one, and look at what `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` wants to change. (It only asks on purpose when *you* edited the schema.) |
| Prisma can't connect | Is the database up? `docker compose ps` from `apps/web`. Is `DATABASE_URL` in `.env.local` right? |
| Login says the credentials are wrong | Re-run `pnpm seed` (it creates the login row better-auth checks), and check `USER1_*` in `.env.local`. |
| Docker web container exits with "AUTH_SECRET is not set" | Only the full Docker run needs secrets: `cp .env.docker.example .env` in `apps/web` and fill them in. |
| Port 5434 or 3000 already in use | Something else holds it - stop it, or change the port in `docker-compose.yml` / run `pnpm dev -p 3001`. |
| Mobile setup screen rejects the address | The web app must be running, and the address must be reachable from the phone - see the table in step 4. |
| Analyzer errors in Flutter code you didn't touch | You used a non-`fvm` Flutter. `git checkout apps/mobile/pubspec.lock`, then use `fvm` from then on. |
