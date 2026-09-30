# Contributing

Thanks for taking a look. This is a monorepo with two apps that share one backend, so read whichever part your change touches.

`apps/web` is the Next.js app and also the REST API under `/api/v1`. It owns the database. `apps/mobile` is the Flutter client that talks to that API with a bearer token. If you change the shape of an API response, you usually need to touch both apps in the same PR.

## Running it locally

Follow [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) - database, web app, demo data, and the Android app, in that order. Always use `fvm flutter` / `fvm dart` for the mobile side.

## Web conventions

This targets a recent Next.js where route handler `params` are async. So handlers look like `{ params }: { params: Promise<{ id: string }> }` and you have to `await params`. If something about routing surprises you, copy an existing handler in `src/app/api/v1/` instead of guessing, and check the docs bundled under `node_modules/next/dist/docs/`.

## Before you push

Run the same checks CI runs for whichever app you touched:

```bash
# apps/web
pnpm exec tsc --noEmit
pnpm run lint
pnpm test
pnpm run build

# apps/mobile
fvm dart run build_runner build --delete-conflicting-outputs
fvm flutter analyze
fvm flutter test
```

## Mobile conventions

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

Branch off `main`, make the change, run the checks above, and open a PR with the template. Keep it to one thing. Update the docs if you changed how something behaves, and don't commit secrets. Only the templates (`apps/web/.env.example`, `apps/web/.env.docker.example`) are tracked; the real `.env` files are ignored.

For anything security-related, don't open a public issue. See [SECURITY.md](SECURITY.md).
