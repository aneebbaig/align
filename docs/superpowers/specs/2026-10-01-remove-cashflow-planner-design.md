# Remove the old Cash-Flow Planner - design

Date: 2026-10-01 · Status: approved in discussion, pending spec review
Scope: web (`apps/web`, including `/api/v1`) **and** mobile (`apps/mobile`).
Follows: sub-project 2 of `2026-09-30-planner-design.md`. The new standalone
Planner replaces the old forecast; this removes the old one entirely.

## Decisions

- Remove the old planner in both apps, including per-loan repayment plans.
- **Drop the tables** (no export, no keep-for-later): the owner confirmed any
  production rows in them can go. Real transactions they booked stay.
- **Investment suggestion** keeps a loan term: "loans due this month" = the
  remaining amount on **borrowed** (`RECEIVED`), **open** loans whose
  `dueDate` falls in the current budget month.
- **Bell "loan due" alerts**: open loans (lent or borrowed) whose `dueDate` is
  within the next 7 days, gated by the existing `notifyLoanDue` preference.

## Removed

### Database (one hand-written migration)
- Tables: `recurring_income_occurrences`, `recurring_incomes`,
  `planned_expenses`, `loan_schedules`.
- `users` columns: `cashflowHorizonMonths`, `cashflowLeadTimeDays`.
- Prisma: models `RecurringIncome`, `RecurringIncomeOccurrence`,
  `PlannedExpense`, `LoanSchedule`, and their back-relations on `User`,
  `Category`, `Currency`, `Transaction`, `Loan`, `LoanPayment`.

### Web
- `src/actions/cashflow.ts` (projection, month summary, upcoming-due alerts,
  loan schedules, recurring incomes, planned expenses).
- `src/lib/cashflow/` - adapter, data-loader, scheduler, golden demo/scenario,
  types, and their tests. **Except** the investment-suggestion maths, which
  moves to `src/lib/investments/suggestion.ts` (+ its test) unchanged apart
  from defining its own `Money` type.
- Routes: `/api/v1/cashflow`, `/api/v1/recurring-income/**`,
  `/api/v1/planned-expenses/**`, `/api/v1/loans/[id]/schedules/**`.
- `linkScheduleId` on loan payments (web action + v1 route).
- `linkPlannedExpenseId` / `linkRecurringIncomeId` on `createTransaction` and
  the transaction form; the expense-delete hook in
  `/api/v1/expenses/[id]` that reset a linked planned expense.
- UI: dashboard `cashflow-summary-card`, `planned-expenses-card` on Expenses,
  `recurring-income-card` on Income, the "Repayment Plan" section and
  "Add schedule" / "Record installment" on loans, and Settings → cash-flow
  horizon / alert lead time.
- `prisma/seed-demo.ts`: stops creating recurring incomes, planned expenses,
  and loan schedules.

### Mobile
- `lib/features/cashflow/` entirely (datasource, entities, providers, pages,
  widgets) and its `ApiConstants`.
- The cash-flow card on the dashboard; `PlannedExpensesSection` on the
  Expenses tab; `RecurringIncomeSection` on the Income tab.
- Loans: the repayment-plan section on the loan card, `add_schedule_page.dart`,
  schedule datasource calls and entity, and `linkSchedule` in
  `RecordPaymentPage`.

## Reworked

### Loans due this month (investment suggestion)
Pure helper `loansDueThisMonth(loans, month, year): number` in
`src/lib/investments/suggestion.ts`:
sum of `remainingAmount` for loans with `type === "RECEIVED"`, status not in
`CLOSED_LOAN_STATUSES`, and a `dueDate` whose local month/year equal the given
budget month/year. `getInvestmentSuggestion` loads the user's open loans and
passes the result as `obligationsDue` (the field name and API shape are kept).

### Bell alerts
Pure helper `upcomingLoanAlerts(loans, today, days = 7)` in
`src/lib/loans/alerts.ts`: open loans with a `dueDate` from today through
today + 7 days, sorted soonest first, each with `daysUntil`. The notifications
action uses it when `notifyLoanDue` is on; messages keep the current wording
("Rs X to/from <person> due today/tomorrow/on d MMM"), "to" for borrowed,
"from" for lent.

## Testing
- Vitest: `computeInvestmentSuggestion` tests (moved), `loansDueThisMonth`
  (type, status, month boundary, no due date), `upcomingLoanAlerts` (window
  edges, closed loans excluded, ordering).
- Web: typecheck, lint, tests, build; migration applied, no drift on the local
  and a fresh database.
- Mobile: analyze, tests (`build_runner` re-run).
- A repo-wide scan finds no remaining references to the removed names
  (`RecurringIncome`, `PlannedExpense`, `LoanSchedule`, `cashflow`,
  `linkSchedule`, `linkPlannedExpenseId`, `linkRecurringIncomeId`,
  `cashflowHorizon`, `cashflowLeadTime`) outside migrations and historical
  docs under `docs/superpowers/`.

## Docs
README (feature list), web README (Cash-Flow Planner row, money-flow notes),
mobile README (screens, routes, structure, gotchas), ARCHITECTURE, HANDOFF
(close the pending item; note the dropped tables).

## Out of scope
- Any change to the new Planner.
- The daily email (`/api/cron/daily`) - it already reads loan `dueDate`
  directly and keeps its current behaviour.
