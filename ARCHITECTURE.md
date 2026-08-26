# Architecture

Two apps, one backend. The Next.js web app owns the database and serves a REST API; the Flutter Android app is just a client that calls it.

```
  Flutter Android  ── REST /api/v1 (bearer token) ──▶  Next.js (web + API)
                                                              │ Prisma
                                                              ▼
                                                         PostgreSQL (Neon)
```

The phone app has no database of its own. It stores one thing locally: the auth token, in the Android keystore.

## The web app

Standard Next.js App Router. The parts worth knowing:

- `src/app/(app)/` is the signed-in UI. Server components fetch through server actions and hand data to client components.
- `src/app/api/v1/` is the REST API the phone uses. Every route checks a bearer token through `requireBearerAuth`.
- `src/actions/` is the web UI's data layer. Every query is scoped by the session's `userId`.
- `src/lib/` holds the shared bits: `prisma`, the token/session helpers, `utils`, `constants`.
- `prisma/` is the schema, migrations, and seed script.

Auth works two ways for the two clients. The web pages use a cookie session (`getUserId`, `requireUser`). The API uses an `Authorization: Bearer` header. Both verify the same signed token.

Worth repeating from the contributing guide: route `params` are async here, so `await params` in every handler. When in doubt, mirror an existing route in `src/app/api/v1/`.

## The money rules

This is the part to understand before changing anything financial. The whole app runs on a zero-based model: money can't appear or move without a declared source.

- Income only enters through the income page, and it raises that month's "ready to assign".
- Every expense is funded from something real: monthly income or a savings pot. A pot-funded expense deducts from the pot and writes a ledger row in the same transaction. Editing or deleting one reverses the old movement first.
- Pots hold PKR and USD separately. Putting money in requires a source (income, or a transfer from another pot), and it's checked against what income is actually left. Transfers move both sides in one transaction. There's no standalone withdraw; you spend from a pot by making an expense funded by it.
- You can't delete income if doing so would leave that month's income-funded expenses and deposits underwater. PKR and USD are checked on their own.
- All money is stored as integers in the smallest unit (paisas, the currency times 100). No floats.
- The USD/PKR rate updates itself once a day from a free public endpoint, and you can set it by hand.

Migrations are plain SQL under `prisma/migrations/`, reviewed by hand. Run `prisma migrate dev` locally; production runs `prisma migrate deploy` on deploy. The models are commented inline in `schema.prisma`.

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
