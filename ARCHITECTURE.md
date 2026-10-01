# Architecture

Two apps, one backend. The Next.js web app owns the database and serves a REST API; the Flutter Android app is just a client that calls it.

```
  Flutter Android  ── REST /api/v1 (bearer token) ──▶  Next.js (web + API)
                                                              │ Prisma
                                                              ▼
                                                         PostgreSQL (Neon)
```

The phone app has no database of its own. It keeps the server address and the auth token in secure storage (Android keystore).

## The web app

Standard Next.js App Router. The parts worth knowing:

- `src/app/(app)/` is the signed-in UI. Server components fetch through server actions and hand data to client components.
- `src/app/api/v1/` is the REST API the phone uses. Every route checks a bearer token through `requireBearerAuth`.
- `src/actions/` is the web UI's data layer. Every query is scoped by the session's `userId`.
- `src/lib/` holds the shared bits: `prisma`, the token/session helpers, `utils`, `constants`.
- `prisma/` is the schema, migrations, and seed script.

Auth is [better-auth](https://www.better-auth.com), configured in `src/lib/auth.ts`, and works two ways for the two clients. The web pages use a cookie session (`getUserId`, `requireUser`). The API uses an `Authorization: Bearer` header via better-auth's bearer plugin (`requireBearerAuth`). Both resolve to the same session. Optional TOTP two-factor comes from better-auth's `twoFactor` plugin, and its secrets are encrypted with `BETTER_AUTH_SECRET` (falling back to `AUTH_SECRET`). The `totp*` columns on `users` are left over from an older hand-rolled 2FA and are unused.

Worth repeating from the contributing guide: route `params` are async here, so `await params` in every handler. When in doubt, mirror an existing route in `src/app/api/v1/`.

## The money rules

This is the part to understand before changing anything financial. The whole app runs on a zero-based model: money can't appear or move without a declared source.

- Income only enters through the income page, and it raises that month's "ready to assign".
- Every expense is funded from something real: monthly income or a savings pot. A pot-funded expense deducts from the pot and writes a ledger row in the same transaction. Editing or deleting one reverses the old movement first.
- Pots hold a separate balance per currency. Putting money in requires a source (income, or a transfer from another pot), and it's checked against what income is actually left. Transfers move both sides in one transaction. There's no standalone withdraw; you spend from a pot by making an expense funded by it.
- Investments track what you put in and what they're worth. Adding money raises both; withdrawing lowers only the current value, and gain counts what was taken out (current + withdrawn − invested). Either can book an expense/income entry, or not.
- A loan's history holds repayments, top-ups ("Add to loan"), and write-offs. A write-off books an expense only for money lent "track only" (the loan and every top-up) - otherwise part of the loss was already counted when it was lent. `PAID` and `WRITTEN_OFF` loans are closed and drop out of forecasts and reminders.
- You can't delete income if doing so would leave that month's income-funded expenses and deposits underwater.
- All money is stored as integers in the smallest unit (paisas, the currency times 100). No floats.
- Currencies are household-defined (Settings → Currencies). One is the base (PKR by default) that every total is reported in; the rest carry a rate to it. `/api/cron/daily` refreshes the USD rate from a free public endpoint, but only if something schedules that route (see `apps/web/DEPLOYMENT.md`); otherwise rates are set by hand.

Migrations are plain SQL under `prisma/migrations/`, reviewed by hand. Run `prisma migrate dev` locally; production runs `prisma migrate deploy` on deploy. The models are commented inline in `schema.prisma`.

## The planner

The Planner (`/planner`) is deliberately cut off from the ledger: it never reads or writes transactions, pots, loans, or investments. It stores only inputs - settings (start month, length, starting cash, its own USD rate), lines with "from this month on" steps and one-month overrides, and one-off goals - and `src/lib/planner/compute.ts` builds the table on every read. Months are stored as `year * 12 + (month - 1)`. The web page and `GET /api/v1/planner` return the same serialized shape, so both apps render identical numbers.

## The mobile app

Flutter, organised as clean-architecture slices. Each feature under `lib/features/<name>/` has its own data, domain, and presentation layers:

```
data/datasources/    Dio calls
data/models/         freezed models with fromJson
data/repositories/   implementations of the domain interfaces
domain/entities/     plain Dart
domain/repositories/ interfaces
presentation/pages/
presentation/providers/   Riverpod codegen
presentation/widgets/
```

State is Riverpod 3 with codegen. Reads use `FutureProvider`; mutations call the datasource straight from the page (see the note in CONTRIBUTING about why). Networking is a Dio client with an interceptor that attaches the token and logs out on a 401. Routing is GoRouter with a splash-screen auth gate. The shared widgets, theme tokens, and extensions live under `core/`.

## The API contract

The phone depends on `/api/v1`. If you change an endpoint's shape, update both the route handler in `apps/web` and the matching `*_datasource.dart` in `apps/mobile`. Responses are wrapped: `{ "data": ... }` when it works, `{ "error": "..." }` with a status code when it doesn't.
