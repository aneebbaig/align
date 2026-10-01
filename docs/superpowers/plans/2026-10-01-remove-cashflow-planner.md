# Remove the Old Cash-Flow Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the old cash-flow planner (recurring income, planned expenses, loan repayment schedules, the forecast and its dashboard card) from both apps and the database, keeping the investment suggestion and loan-due bell alerts working through two small new rules.

**Architecture:** First add the two replacement rules as pure, tested helpers and switch their callers over. Then remove all old-planner code while the Prisma models still exist (so each step typechecks). Then drop the models and tables with one hand-written migration. Then the Android side. Then docs and a repo-wide reference scan.

**Tech Stack:** Next.js 16, Prisma 7 + Postgres, Vitest; Flutter via `fvm`, Riverpod codegen.

**Spec:** `docs/superpowers/specs/2026-10-01-remove-cashflow-planner-design.md`

## Global Constraints

- Drop, don't keep: the four tables and two user columns go in one migration; real transactions they booked stay untouched.
- "Loans due this month" = sum of `remainingAmount` of `RECEIVED` loans whose status is not in `CLOSED_LOAN_STATUSES` and whose `dueDate` local month/year equal the current budget month/year.
- Bell loan alerts = open loans (either type) with `dueDate` from today (start of day) through today + 7 days, gated by `notifyLoanDue`; soonest first.
- The new Planner (`src/lib/planner`, `/planner`, `lib/features/planner`) and `/api/cron/daily` are out of scope - don't touch them.
- Migrations are hand-written SQL; after writing: `pnpm exec prisma migrate deploy`, then `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` must print `-- This is an empty migration.` Never let `prisma migrate dev` generate one.
- Mobile: all Flutter/Dart via `fvm`; re-run `fvm dart run build_runner build --delete-conflicting-outputs` after removing providers.
- Commit prefixes stay plain `feat:`/`refactor:`/`docs:` - no `!` or `BREAKING`, which would make the mobile release a major version bump.
- `financial-plan.pdf` (repo root) is personal data - every `git add` uses explicit paths, never `-A`/`.`.
- No file may contain the leak-guard terms (`.github/workflows/guard.yml`).
- Web commands from `apps/web`, mobile from `apps/mobile`.

## Review Focus

1. **A borrowed loan due next month, or one already closed** must not reduce this month's suggestion. Tests: `loansDueThisMonth` cases (Task 1).
2. **A loan due exactly 7 days from now, or due earlier today,** must still alert; one due in 8 days or yesterday must not. Tests: `upcomingLoanAlerts` window edges (Task 1).
3. **Deleting an expense** that a planned expense used to link to must still work after the hook is removed. Check: `/api/v1/expenses/[id]` DELETE smoke (Task 2).
4. **Recording a loan payment** must still work with no `linkScheduleId` anywhere (web action, v1 route, mobile). Check: API smoke (Task 2) + mobile tests (Task 4).
5. **Nothing references a removed model or route** - a stale import compiles nowhere and a stale API path 404s at runtime. Check: repo-wide scan (Task 6).

---

### Task 1: Replacement rules (pure, tested) and their callers

**Files:**
- Move: `apps/web/src/lib/cashflow/investment-suggestion.ts` → `apps/web/src/lib/investments/suggestion.ts`; `apps/web/src/lib/cashflow/investment-suggestion.test.ts` → `apps/web/src/lib/investments/suggestion.test.ts`
- Create: `apps/web/src/lib/loans/alerts.ts`, `apps/web/src/lib/loans/alerts.test.ts`
- Modify: `apps/web/src/actions/savings.ts` (`getInvestmentSuggestion`), `apps/web/src/actions/notifications.ts`

**Interfaces:**
- Produces:
  - `loansDueThisMonth(loans: { type: string; status: string; remainingAmount: number; dueDate: Date | null }[], month: number, year: number): number` (in `@/lib/investments/suggestion`)
  - `computeInvestmentSuggestion` unchanged, now exported from `@/lib/investments/suggestion`
  - `interface LoanAlert { loanId: string; personName: string; type: string; amount: number; dueDate: Date; daysUntil: number }`
  - `upcomingLoanAlerts(loans: { id: string; personName: string; type: string; status: string; remainingAmount: number; dueDate: Date | null }[], today: Date, days?: number): LoanAlert[]` (in `@/lib/loans/alerts`)

- [ ] **Step 1: Move the suggestion maths**

Run: `git mv src/lib/cashflow/investment-suggestion.ts src/lib/investments/suggestion.ts && git mv src/lib/cashflow/investment-suggestion.test.ts src/lib/investments/suggestion.test.ts`

In `src/lib/investments/suggestion.ts` replace `import type { Money } from "./types";` with:

```ts
type Money = number; // integer, smallest unit (paisas)
```

and change its header comment's first lines to say it is the investment-suggestion maths ("Pure math: no DB. src/actions/savings.ts fetches the inputs and calls this."), dropping the reference to `./scheduler.ts`. In `suggestion.test.ts` change the import to `from "./suggestion"`. In `src/actions/savings.ts` change the import to `import { computeInvestmentSuggestion, loansDueThisMonth } from "@/lib/investments/suggestion";`.

- [ ] **Step 2: Write the failing tests**

Append to `src/lib/investments/suggestion.test.ts`:

```ts
describe("loansDueThisMonth", () => {
  const loan = (p: Partial<{ type: string; status: string; remainingAmount: number; dueDate: Date | null }>) => ({
    type: "RECEIVED", status: "ACTIVE", remainingAmount: 1_000, dueDate: new Date(2026, 9, 15), ...p,
  });

  it("sums what's left on borrowed loans due this month", () => {
    expect(loansDueThisMonth([loan({}), loan({ remainingAmount: 500, status: "PARTIALLY_PAID" })], 10, 2026)).toBe(1_500);
  });

  it("ignores money you lent", () => {
    expect(loansDueThisMonth([loan({ type: "GIVEN" })], 10, 2026)).toBe(0);
  });

  it("ignores closed loans", () => {
    expect(loansDueThisMonth([loan({ status: "PAID" }), loan({ status: "WRITTEN_OFF" })], 10, 2026)).toBe(0);
  });

  it("ignores loans due in another month or with no due date", () => {
    expect(loansDueThisMonth([
      loan({ dueDate: new Date(2026, 10, 1) }),
      loan({ dueDate: new Date(2026, 8, 30) }),
      loan({ dueDate: new Date(2025, 9, 15) }),
      loan({ dueDate: null }),
    ], 10, 2026)).toBe(0);
  });

  it("counts the first and last day of the month", () => {
    expect(loansDueThisMonth([loan({ dueDate: new Date(2026, 9, 1) }), loan({ dueDate: new Date(2026, 9, 31, 23, 59) })], 10, 2026)).toBe(2_000);
  });
});
```

and add `loansDueThisMonth` to that file's import.

`src/lib/loans/alerts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { upcomingLoanAlerts } from "./alerts";

const today = new Date(2026, 9, 1, 14, 30); // 1 Oct 2026, mid-afternoon
const loan = (id: string, dueDate: Date | null, p: Partial<{ type: string; status: string; remainingAmount: number }> = {}) => ({
  id, personName: `P-${id}`, type: "RECEIVED", status: "ACTIVE", remainingAmount: 1_000, dueDate, ...p,
});

describe("upcomingLoanAlerts", () => {
  it("includes loans due today through 7 days ahead, soonest first", () => {
    const alerts = upcomingLoanAlerts([
      loan("week", new Date(2026, 9, 8)),
      loan("today", new Date(2026, 9, 1, 9, 0)),
      loan("tomorrow", new Date(2026, 9, 2)),
    ], today);
    expect(alerts.map((a) => [a.loanId, a.daysUntil])).toEqual([["today", 0], ["tomorrow", 1], ["week", 7]]);
  });

  it("excludes loans due in 8 days or already past", () => {
    expect(upcomingLoanAlerts([loan("late", new Date(2026, 9, 9)), loan("past", new Date(2026, 8, 30))], today)).toEqual([]);
  });

  it("excludes closed loans and loans with no due date, but includes lent money", () => {
    const alerts = upcomingLoanAlerts([
      loan("paid", new Date(2026, 9, 2), { status: "PAID" }),
      loan("off", new Date(2026, 9, 2), { status: "WRITTEN_OFF" }),
      loan("none", null),
      loan("lent", new Date(2026, 9, 3), { type: "GIVEN" }),
    ], today);
    expect(alerts.map((a) => a.loanId)).toEqual(["lent"]);
    expect(alerts[0]).toMatchObject({ personName: "P-lent", type: "GIVEN", amount: 1_000, daysUntil: 2 });
  });

  it("respects a custom window", () => {
    expect(upcomingLoanAlerts([loan("w", new Date(2026, 9, 4))], today, 2)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run to see them fail**

Run: `pnpm exec vitest run src/lib/investments src/lib/loans/alerts.test.ts`
Expected: FAIL - `loansDueThisMonth` is not exported; `./alerts` not found. (The moved `computeInvestmentSuggestion` tests still pass.)

- [ ] **Step 4: Implement**

Append to `src/lib/investments/suggestion.ts`:

```ts
// Money owed back this month: what's left on borrowed loans that are still
// open and due in the given budget month. Subtracted before suggesting how
// much to invest, so the suggestion never spends money that has to be repaid.
export function loansDueThisMonth(
  loans: { type: string; status: string; remainingAmount: number; dueDate: Date | null }[],
  month: number,
  year: number,
): number {
  return loans
    .filter((l) => l.type === "RECEIVED" && !isLoanClosed(l.status) && l.dueDate !== null
      && l.dueDate.getMonth() + 1 === month && l.dueDate.getFullYear() === year)
    .reduce((sum, l) => sum + l.remainingAmount, 0);
}
```

with `import { isLoanClosed } from "@/lib/loans/balance";` at the top.

`src/lib/loans/alerts.ts`:

```ts
import { isLoanClosed } from "./balance";

// Loans coming due soon, for the notification bell. Open loans of either type
// with a due date from today through `days` days ahead, soonest first.

export interface LoanAlert {
  loanId: string;
  personName: string;
  type: string; // GIVEN (they owe you) | RECEIVED (you owe them)
  amount: number; // remaining, paisas
  dueDate: Date;
  daysUntil: number; // 0 = today
}

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function upcomingLoanAlerts(
  loans: { id: string; personName: string; type: string; status: string; remainingAmount: number; dueDate: Date | null }[],
  today: Date,
  days = 7,
): LoanAlert[] {
  const start = startOfDay(today).getTime();
  return loans
    .filter((l) => !isLoanClosed(l.status) && l.dueDate !== null)
    .map((l) => {
      const due = l.dueDate as Date;
      return {
        loanId: l.id,
        personName: l.personName,
        type: l.type,
        amount: l.remainingAmount,
        dueDate: due,
        daysUntil: Math.round((startOfDay(due).getTime() - start) / DAY),
      };
    })
    .filter((a) => a.daysUntil >= 0 && a.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
```

- [ ] **Step 5: Run to see them pass**

Run: `pnpm exec vitest run src/lib/investments src/lib/loans/alerts.test.ts`
Expected: PASS.

- [ ] **Step 6: Switch the callers**

In `src/actions/savings.ts`, `getInvestmentSuggestion`:
- Remove `import { getCashflowProjection } from "@/actions/cashflow";`.
- In the `Promise.all`, replace `getCashflowProjection(),` with
  ```ts
      prisma.loan.findMany({
        where: { userId, type: "RECEIVED", status: { notIn: CLOSED_LOAN_STATUSES }, dueDate: { not: null } },
        select: { type: true, status: true, remainingAmount: true, dueDate: true },
      }),
  ```
  and rename the destructured `projection` to `openBorrowedLoans`; import `CLOSED_LOAN_STATUSES` from `@/lib/loans/balance`.
- Replace `const obligationsDue = projection[0]?.dueTotal ?? 0;` with `const obligationsDue = loansDueThisMonth(openBorrowedLoans, month, year);`.
- Update the `InvestmentSuggestion.obligationsDue` comment to `// what's left on borrowed loans due this budget month` and the function's doc comment to "Suggested investment = income − borrowed loans due this month − any unmet emergency-fund buffer, then split by category."

In `src/actions/notifications.ts`:
- Replace `import { getUpcomingDueAlerts } from "@/actions/cashflow";` with `import { prisma } from "@/lib/prisma";` and `import { CLOSED_LOAN_STATUSES } from "@/lib/loans/balance";` and `import { upcomingLoanAlerts } from "@/lib/loans/alerts";`.
- In the `Promise.all`, replace `settings?.notifyLoanDue ? getUpcomingDueAlerts() : Promise.resolve([]),` with:
  ```ts
      settings?.notifyLoanDue
        ? prisma.loan.findMany({
            where: { userId: user.id, status: { notIn: CLOSED_LOAN_STATUSES }, dueDate: { not: null } },
            select: { id: true, personName: true, type: true, status: true, remainingAmount: true, dueDate: true },
          })
        : Promise.resolve([]),
  ```
  and rename the destructured `upcomingDue` to `dueLoans`.
- Replace the "Cash-flow:" loop with:
  ```ts
  // Loans coming due in the next week.
  for (const due of upcomingLoanAlerts(dueLoans, new Date())) {
    const when = due.daysUntil === 0 ? "today" : due.daysUntil === 1 ? "tomorrow" : `on ${format(due.dueDate, "d MMM")}`;
    const direction = due.type === "RECEIVED" ? "to" : "from";
    notifications.push({
      id: `loan-due-${due.loanId}-${due.dueDate.getTime()}`,
      type: due.daysUntil <= 1 ? "warning" : "info",
      message: `${base.symbol} ${(due.amount / 100).toLocaleString()} ${direction} ${due.personName} due ${when}`,
    });
  }
  ```
  (Check `user` is the variable holding the session user in that function - it is `const user = await getServerUser();` at its top.)

- [ ] **Step 7: Typecheck, lint, test**

Run: `pnpm exec tsc --noEmit && pnpm run lint && pnpm test`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/investments src/lib/cashflow src/lib/loans/alerts.ts src/lib/loans/alerts.test.ts src/actions/savings.ts src/actions/notifications.ts
git commit -m "refactor(web): suggestion and loan alerts no longer use the cash-flow forecast"
```

### Task 2: Remove the old planner from the web app

**Files:**
- Delete: `src/actions/cashflow.ts`; `src/lib/cashflow/` (whole folder); `src/app/api/v1/cashflow/`, `src/app/api/v1/recurring-income/`, `src/app/api/v1/planned-expenses/`, `src/app/api/v1/loans/[id]/schedules/`; `src/components/dashboard/cashflow-summary-card.tsx`, `src/components/expenses/planned-expenses-card.tsx`, `src/components/income/recurring-income-card.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/expenses/page.tsx`, `src/app/(app)/income/page.tsx`, `src/components/expenses/expenses-client.tsx`, `src/components/income/income-client.tsx`, `src/components/expenses/transaction-form.tsx`, `src/actions/expenses.ts`, `src/app/api/v1/expenses/[id]/route.ts`, `src/actions/loans.ts`, `src/app/api/v1/loans/route.ts`, `src/app/api/v1/loans/[id]/payments/route.ts`, `src/components/loans/loans-client.tsx`, `src/actions/settings.ts`, `src/components/settings/settings-client.tsx`, `prisma/seed-demo.ts`

**Interfaces:**
- Consumes: Task 1 (no caller of `@/actions/cashflow` or `@/lib/cashflow` remains after it).
- Produces: a web app with no reference to the four old models, `cashflowHorizonMonths`, `cashflowLeadTimeDays`, `linkScheduleId`, `linkPlannedExpenseId`, `linkRecurringIncomeId`. The Prisma models still exist until Task 3.

- [ ] **Step 1: Delete the old planner's own files**

Run: `git rm -rq src/actions/cashflow.ts src/lib/cashflow src/app/api/v1/cashflow src/app/api/v1/recurring-income src/app/api/v1/planned-expenses "src/app/api/v1/loans/[id]/schedules" src/components/dashboard/cashflow-summary-card.tsx src/components/expenses/planned-expenses-card.tsx src/components/income/recurring-income-card.tsx`

- [ ] **Step 2: Pages and their clients**

- `dashboard/page.tsx`: remove the `@/actions/cashflow` and `cashflow-summary-card` imports; remove `cashflowSummary, upcomingDue` from the destructuring and `getCashflowMonthSummary(), getUpcomingDueAlerts(),` from `Promise.all`; remove the `{/* Cash-flow: ... */}` comment and `<CashflowSummaryCard ... />`.
- `expenses/page.tsx`: remove the `getPlannedExpenses` import, `plannedExpenses` from the destructuring and `getPlannedExpenses()` from `Promise.all`, and the `plannedExpenses={plannedExpenses}` prop.
- `expenses-client.tsx`: remove the `PlannedExpensesCard` import, the `interface PlannedExpense { ... }`, the `plannedExpenses` prop (destructuring and type), and the `<PlannedExpensesCard ... />` element (keep its sibling layout intact).
- `income/page.tsx`: remove the `getRecurringIncomes` import, `recurringIncomes` from destructuring and `getRecurringIncomes()` from `Promise.all`, and the `recurringIncomes={recurringIncomes}` prop.
- `income-client.tsx`: remove the `RecurringIncomeCard` import, the `interface RecurringIncome { ... }`, the `recurringIncomes` prop (destructuring and type), and the `<RecurringIncomeCard ... />` element.

- [ ] **Step 3: Expense links**

- `actions/expenses.ts` `createTransaction`: remove the `linkPlannedExpenseId?` / `linkRecurringIncomeId?` fields and their comment; remove the two pre-checks (`if (data.linkPlannedExpenseId) {...}` and `if (data.linkRecurringIncomeId) {...}`); remove the two in-transaction blocks that update `plannedExpense` / create `recurringIncomeOccurrence`.
- `transaction-form.tsx`: remove the `linkPlannedExpenseId?` / `linkRecurringIncomeId?` props and their comment, their destructuring, and the two spread lines that pass them to the action.
- `api/v1/expenses/[id]/route.ts` DELETE: remove the `linkedPlan` lookup and the `if (linkedPlan) { ... }` block, leaving the delete and its 404.

- [ ] **Step 4: Loan schedules**

- `actions/loans.ts`: remove `schedules: { orderBy: { startDate: "asc" } },` from `getLoans`; remove `linkScheduleId?` (and its comment) from `recordPayment`'s input, the `if (data.linkScheduleId) { ... }` pre-check, and the in-transaction `if (data.linkScheduleId) { await tx.loanSchedule.update(...) }`.
- `api/v1/loans/route.ts` GET: remove `schedules: { orderBy: { startDate: "asc" } },` from the select and the `schedules: l.schedules.map(...)` block from the response.
- `api/v1/loans/[id]/payments/route.ts`: remove `linkScheduleId` from the zod schema (and its comment), from the destructuring, the `if (linkScheduleId) { ... }` pre-check, and the in-transaction schedule update.
- `components/loans/loans-client.tsx`:
  - imports: remove `import { createLoanSchedule, deleteLoanSchedule } from "@/actions/cashflow";` and `import { CalendarClock } from "lucide-react";`;
  - remove `interface LoanSchedule { ... }` and `schedules: LoanSchedule[];` from `interface Loan`;
  - state: remove `linkScheduleId`/`setLinkScheduleId`, `scheduleOpen`/`setScheduleOpen`, `scheduleForm`/`setScheduleForm`;
  - remove every `setLinkScheduleId(null);` call and the `...(linkScheduleId ? { linkScheduleId } : {}),` spread in `handlePayment`;
  - remove functions `openRecordInstallment`, `openScheduleDialog`, `handleAddSchedule`, `handleDeleteSchedule`;
  - in `LoanCard`, remove the whole `{!isLoanClosed(loan.status) && ( <div className="mt-3 pt-3 border-t border-border"> ... Repayment Plan ... </div> )}` block (from that opening line through its matching `)}` just before the history section's closing `</div>`);
  - remove the `{/* Add repayment schedule dialog */}` `<Dialog>...</Dialog>` at the end.
- `prisma/seed-demo.ts`: remove the `prisma.loanSchedule.create(...)`, both `prisma.recurringIncome.create(...)` and the `prisma.plannedExpense.createMany(...)` calls with their comments, and any now-unused variables they used.

- [ ] **Step 5: Settings**

- `actions/settings.ts`: remove `cashflowHorizonMonths` and `cashflowLeadTimeDays` from `updateUserSettings`'s input type and from `getUserSettings`'s select (and from any shared-settings object that spreads them).
- `settings-client.tsx`: remove them from the settings interface and the `profile` initial state, and remove the two `<div>` blocks "Cash-flow Projection Window (months)" and "Due-date Warning Lead Time (days)".

- [ ] **Step 6: Typecheck, lint, test, build**

Run: `pnpm exec tsc --noEmit && pnpm run lint && pnpm test && pnpm run build`
Expected: all pass. If `tsc` reports a leftover reference, remove it in the same spirit (no old-planner behaviour survives).

- [ ] **Step 7: Smoke test**

With `pnpm dev`: render `/dashboard`, `/expenses`, `/income`, `/loans`, `/settings` with a signed-in session cookie → 200, no `Application error`. Via the v1 API (bearer token): create an expense then `DELETE /api/v1/expenses/<id>` → 200 (Review Focus 3); create a track-only loan, `POST /api/v1/loans/<id>/payments` `{"amountPaisas":100,"date":"2026-10-01","skipTransaction":true}` → 201 (Review Focus 4); `GET /api/v1/cashflow` → 404. Clean up the test loan and expense.

- [ ] **Step 8: Commit**

```bash
git add -u src prisma/seed-demo.ts
git commit -m "feat(web): remove the old cash-flow planner"
```

(`git add -u` stages modifications and deletions of tracked files only - it can't pick up the untracked PDF.)

### Task 3: Drop the tables and columns

**Files:**
- Modify: `apps/web/prisma/schema.prisma`
- Create: `apps/web/prisma/migrations/20261001150000_remove_cashflow_planner/migration.sql`

- [ ] **Step 1: Schema**

Delete models `LoanSchedule`, `RecurringIncome`, `PlannedExpense`, `RecurringIncomeOccurrence` (with their leading comments and the "Cash-flow / repayment planner" section header comment). Remove these lines:
- `User`: `cashflowHorizonMonths ...`, `cashflowLeadTimeDays ...` (and the "Cash-flow / repayment planner config." comment above them), `recurringIncomes RecurringIncome[]`, `loanSchedules LoanSchedule[]`, `plannedExpenses PlannedExpense[]`.
- `Category`: `plannedExpenses PlannedExpense[]`.
- `Transaction`: `plannedExpenseOf PlannedExpense?`, `recurringIncomeOccurrenceOf RecurringIncomeOccurrence?`.
- `Currency`: `recurringIncomes RecurringIncome[]`.
- `Loan`: `schedules LoanSchedule[]`.
- `LoanPayment`: `fulfillsSchedule LoanSchedule?`.

- [ ] **Step 2: Migration**

`migration.sql`:

```sql
-- Remove the old cash-flow planner (replaced by the standalone Planner).
-- Real transactions these features booked are untouched; only the planner's
-- own rows go.

DROP TABLE "recurring_income_occurrences";
DROP TABLE "recurring_incomes";
DROP TABLE "planned_expenses";
DROP TABLE "loan_schedules";

ALTER TABLE "users" DROP COLUMN "cashflowHorizonMonths",
DROP COLUMN "cashflowLeadTimeDays";
```

(Dropping a table drops its indexes and foreign keys with it.)

- [ ] **Step 3: Apply and check for drift**

Run: `pnpm exec prisma migrate deploy && pnpm exec prisma generate && pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
Expected: last command prints `-- This is an empty migration.`

- [ ] **Step 4: Typecheck, test, build**

Run: `pnpm exec tsc --noEmit && pnpm test && pnpm run build`
Expected: all pass (Task 2 removed every reference).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261001150000_remove_cashflow_planner
git commit -m "feat(web): drop the old cash-flow planner tables"
```

### Task 4: Remove the old planner from the Android app

**Files:**
- Delete: `apps/mobile/lib/features/cashflow/` (whole folder), `apps/mobile/lib/features/loans/presentation/pages/add_schedule_page.dart`
- Modify: `lib/core/constants/api_constants.dart`, `lib/features/dashboard/presentation/pages/dashboard_page.dart`, `lib/features/expenses/presentation/pages/expenses_list_page.dart`, `lib/features/income/presentation/pages/income_list_page.dart`, `lib/features/loans/domain/entities/loan_entity.dart`, `lib/features/loans/data/datasources/loans_datasource.dart`, `lib/features/loans/presentation/pages/loans_page.dart`, `lib/features/loans/presentation/pages/record_payment_page.dart`

- [ ] **Step 1: Delete**

Run: `git rm -rq lib/features/cashflow lib/features/loans/presentation/pages/add_schedule_page.dart`

- [ ] **Step 2: Edits**

- `api_constants.dart`: remove `recurringIncome`, `plannedExpenses`, `cashflow`, `loanSchedules`, `loanScheduleById`, `recurringIncomeById`, `plannedExpenseById`, `plannedExpenseRecord`, `recurringIncomeRecord`.
- `dashboard_page.dart`: remove the `cashflow_summary_card.dart` import and the `const CashflowSummaryCard(),` line (and a spacer directly paired with it, if any).
- `expenses_list_page.dart`: remove the `planned_expenses_section.dart` import; the header `Column` becomes `_ExpensesSummary()` alone - replace the `Column(children: [_ExpensesSummary(), SizedBox(height: 16), PlannedExpensesSection()])` child with `_ExpensesSummary()`.
- `income_list_page.dart`: same for `recurring_income_section.dart` / `RecurringIncomeSection()` → child is `_IncomeSummary()`.
- `loan_entity.dart`: remove `class LoanScheduleEntity { ... }`, the `this.schedules = const [],` constructor param and the `schedules` field.
- `loans_datasource.dart`: remove `linkScheduleId` from `recordPayment` (param and body line), `createSchedule`, `deleteSchedule`, the `schedules:` parse in `_parse`, and `_parseSchedule`.
- `loans_page.dart`: remove the `add_schedule_page.dart` import, `_showAddSchedule`, `_deleteSchedule`; `_showPayment` loses its `linkSchedule` parameter; in both `_LoanCard(...)` constructions remove `onAddSchedule:`, `onDeleteSchedule:`, `onRecordInstallment:`; in `_LoanCard` remove those three fields/params and the whole `if (!loan.isClosed) ...[ ... 'REPAYMENT PLAN' ... ]` block.
- `record_payment_page.dart`: remove the `linkSchedule` field/param and its comment; `_date` initialises from `widget.editPayment?.date ?? DateTime.now()`; the prefill is `widget.editPayment?.amountPaisas ?? widget.loan.remainingPaisas` (update its comment); remove `linkScheduleId: widget.linkSchedule?.id,`.

- [ ] **Step 3: Codegen, analyze, test**

Run: `fvm dart run build_runner build --delete-conflicting-outputs && fvm flutter analyze && fvm flutter test`
Expected: only the pre-existing `analysis_options_deprecated_plugins` warning; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -u lib test
git commit -m "feat(mobile): remove the old cash-flow planner"
```

### Task 5: Docs

**Files:** `README.md`, `ARCHITECTURE.md`, `HANDOFF.md`, `CONTRIBUTING.md`, `apps/web/README.md`, `apps/mobile/README.md`

- [ ] **Step 1: Find every mention**

Run from the repo root: `grep -nE -i "cash-?flow|recurring income|planned expense|repayment (plan|schedule)|record installment|LoanSchedule|projection" README.md ARCHITECTURE.md HANDOFF.md CONTRIBUTING.md apps/web/README.md apps/mobile/README.md apps/web/DEPLOYMENT.md`

- [ ] **Step 2: Edit each hit**

- Root README: the investments/loans bullet drops "with repayment schedules and a forward cash-flow projection".
- Web README: delete the **Cash-Flow Planner** feature row; the Loans row drops "repayment schedules (lump sum or fixed installments, flexible/slidable)"; mentions of planned expenses on Expenses go.
- Mobile README: Expenses/Income tab rows drop the Planned Expenses / Recurring Income sections; Dashboard row drops the cash-flow card; Loans row drops "Repayment Plan" and `AddSchedulePage`/"Record installment"; remove `cashflow/` from the features tree and its routes/screens; gotchas that name `record_payment_page` linkSchedule are updated.
- ARCHITECTURE: any cash-flow/forecast sentences go; the investments bullet keeps its rule.
- CONTRIBUTING: the budget-period section's example list (`createLoan`, `loans-client.tsx`) stays valid; remove only references to planned expenses/recurring income if present.
- HANDOFF: close pending item 0 ("Remove the old Cash-Flow Planner") - replace it with a short "Removed (latest)" note under the Planner section: what was removed, that the migration drops 4 tables + 2 columns on the next deploy, and that the investment suggestion now subtracts borrowed loans due this month and the bell shows loans due within 7 days. Pending item 1 (`/api/cron/daily` not wired) stays.

- [ ] **Step 3: Guard and commit**

Run the "Scan for forbidden strings" grep from `.github/workflows/guard.yml` over the changed files → no matches.

```bash
git add README.md ARCHITECTURE.md HANDOFF.md CONTRIBUTING.md apps/web/README.md apps/mobile/README.md
git commit -m "docs: remove the old cash-flow planner"
```

### Task 6: Full verification

- [ ] **Step 1: Web** - `pnpm exec tsc --noEmit && pnpm run lint && pnpm test && pnpm run build` → pass, 0 lint errors.
- [ ] **Step 2: Schema** - drift empty on the local DB, and on a fresh throwaway DB (`createdb align_verify`, `migrate deploy`, diff, `dropdb --force`).
- [ ] **Step 3: Mobile** - `fvm flutter analyze && fvm flutter test` → only the pre-existing plugin warning; pass.
- [ ] **Step 4: Reference scan (Review Focus 5)** - from the repo root:

```bash
grep -rnE "RecurringIncome|recurringIncome|recurring_income|PlannedExpense|plannedExpense|planned_expense|LoanSchedule|loanSchedule|loan_schedule|linkSchedule|linkPlannedExpenseId|linkRecurringIncomeId|cashflowHorizon|cashflowLeadTime|getCashflow|getUpcomingDue|lib/cashflow|actions/cashflow|features/cashflow|/cashflow'" apps --include='*.ts' --include='*.tsx' --include='*.dart' --include='*.prisma' | grep -v "/generated/\|\.g\.dart"
```

Expected: no output.
- [ ] **Step 5: `git status`** shows only `financial-plan.pdf` untracked.
