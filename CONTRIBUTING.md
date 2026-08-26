# Contributing

Thanks for taking a look. This is a monorepo with two apps that share one backend, so read whichever part your change touches.

`apps/web` is the Next.js app and also the REST API under `/api/v1`. It owns the database. `apps/mobile` is the Flutter client that talks to that API with a bearer token. If you change the shape of an API response, you usually need to touch both apps in the same PR.

## Getting the web app running

You need Node 20 or newer, [pnpm](https://pnpm.io) (the pinned version is in `apps/web/package.json`'s `packageManager` field), and a Postgres database. A free Neon branch is the easiest way to get one.

```bash
cd apps/web
cp .env.example .env.local     # fill in DATABASE_URL, AUTH_SECRET, etc.
pnpm install
pnpm exec prisma migrate dev
pnpm seed
pnpm dev
```

One thing to watch out for: this targets a recent Next.js where route handler `params` are async. So handlers look like `{ params }: { params: Promise<{ id: string }> }` and you have to `await params`. If something about routing surprises you, copy an existing handler in `src/app/api/v1/` instead of guessing, and check the docs bundled under `node_modules/next/dist/docs/`.

Before you push, run the same checks CI runs:

```bash
pnpm exec tsc --noEmit
pnpm run lint
pnpm test
pnpm run build
```

## Demo data

`pnpm seed` creates categories and logins and nothing else, which makes it hard
to see what a screen is meant to look like. `pnpm seed:demo` builds a fictional
household instead - six months of income and spending, budgets, savings pots in
PKR and USD, investments, loans with a repayment schedule, a planner, projects,
and lists. It is what the README screenshots are taken from.

```bash
docker compose up -d db     # or point at any local Postgres
cd apps/web
DATABASE_URL=postgresql://align:align@localhost:5434/align_dev pnpm exec prisma migrate deploy
DATABASE_URL=postgresql://align:align@localhost:5434/align_dev pnpm seed:demo
```

It signs in as `demo@example.com` / `demo12345` (override with `DEMO_EMAIL`,
`DEMO_PASSWORD`, `DEMO_NAME`).

**It deletes every user first**, and everything cascading off them, so it
refuses to run against anything but a local database unless you set
`DEMO_SEED_ALLOW_REMOTE=yes`. Never point it at a database you care about.

## Getting the mobile app running

You need [fvm](https://fvm.app) and the Android toolchain. `apps/mobile/.fvmrc` tracks the stable channel - run `fvm install stable && fvm use stable` once, then prefix every Flutter and Dart command with `fvm`. A system Flutter older than `pubspec.lock` will silently downgrade it.

```bash
cd apps/mobile
fvm flutter pub get
fvm dart run build_runner build
fvm flutter analyze
fvm flutter run
```

On first launch the app asks for a server address - `http://10.0.2.2:3000` is how the Android emulator reaches localhost on your machine. It is validated against `/api/health`, stored in secure storage, and changeable later in Settings. Re-run `build_runner` any time you change a provider, model, or annotation.

A few conventions the mobile code sticks to:

- No barrel files. Import the specific file.
- Use the `App*` widgets in `core/widgets/` (`AppCard`, `AppButton`, and so on) instead of raw Flutter widgets in feature code.
- Nothing hardcoded: the API base is runtime state (`core/network/server_url.dart`), colours come from `AppColors`, text styles from `AppTextStyles`.
- In async notifiers, catch and rethrow by hand. Don't use `AsyncValue.guard`, it swallows the error.
- For CRUD mutations in a page, call the datasource directly with a local loading flag rather than going through a mutation notifier. There's an auto-dispose quirk that otherwise fires a false error toast. Existing pages show the pattern.
- Money is always an `int` in paisas (the currency times 100). Never a double.

## The budget-period pattern

Every transaction (expense, income, loan, loan payment) is filed under a *budget period* (`budgetMonth`/`budgetYear`), not its calendar `date` - a late-month salary and the spending it funds can share next month's budget. New money-moving flows must follow this exactly, in both apps:

- **Support the override.** Accept optional `budgetMonth`/`budgetYear`; when omitted, default to the user's current open period (`getCurrentPeriod()` on web). The UI exposes this as a single checkbox - "File under this date's budget" - that derives month/year from the entry's own date field. Don't add a month/year picker; see `apps/web/src/components/shared/budget-period-override.tsx` (web) and `apps/mobile/lib/core/widgets/budget_period_field.dart` (mobile) for the shared component.
- **Refetch funding figures for the resolved period, not the page's load-time period.** If your flow shows "income available" or a savings-pot balance next to a funding choice, that figure must be recomputed for whichever period the checkbox currently targets - never left over from the page's initial load. See `getExpenseFundingContext(month, year)` (web action) / `GET /api/v1/expenses/funding-context` (mobile) and how `transaction-form.tsx` and `loans-client.tsx` call it reactively on checkbox/date change.
- **Reuse `validateFundingSources`** (`apps/web/src/lib/expenses/funding.ts`) for any new expense-like flow that can draw from income or a savings pot - it's shared by the web actions and the v1 API routes so both surfaces enforce the identical rule.

This was a real bug once: `createLoan` filed its transaction under the *current* period regardless of the loan's own date, while every other creation path already supported the override - and separately, the funding-context number shown in a dropdown didn't follow the checkbox, so it displayed a stale figure for a different month. Both are fixed now; don't reintroduce either shape by copy-pasting an older flow that predates this pattern.

## CI and releases

Every PR runs a leak guard (no personal identifiers in tracked files) plus the
CI for whatever you touched: typecheck, lint, tests, and a build for `apps/web`;
analyze and tests for `apps/mobile`.

Commit prefixes matter on the mobile side. A push to `main` touching
`apps/mobile/**` bumps the version from Conventional Commits - `feat:` minor,
`fix:` patch, `BREAKING` major - then tags it, builds a signed APK, and
publishes a GitHub Release. Anything else (`docs:`, `chore:`, `refactor:`)
produces no release.

## Sending a change

Branch off `main`, make the change, run the checks above, and open a PR with the template. Keep it to one thing. Update the docs if you changed how something behaves, and don't commit secrets. Only `.env.example` is tracked; the real `.env` files are ignored.

For anything security-related, don't open a public issue. See [SECURITY.md](SECURITY.md).
