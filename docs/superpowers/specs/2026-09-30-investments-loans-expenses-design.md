# Investments, loans, and expenses summary - design

Date: 2026-09-30 · Status: approved in discussion, pending spec review
Scope: web (`apps/web`, including `/api/v1`) **and** mobile (`apps/mobile`).

Three independent parts, built and shipped in order A → B → C. Each follows the
house rules: money is integer paisas, new money flows support the budget-period
override (`budgetMonth`/`budgetYear`, "File under this date's budget" checkbox),
funding figures follow the resolved period, and any `/api/v1` shape change lands
in the route handler and the matching mobile datasource in the same change.

---

## A. Investments

### Problem
- Adding money (`addInvestmentContribution`, `addMoneyToCategory`) increments
  `Investment.investedAmount` but not `currentValue`, so every top-up shows as a
  loss of exactly that amount. Deleting a contribution has the mirror bug.
- There is no way to withdraw.
- Every top-up always books an expense; there is no opt-out.
- "Update value" only changes `currentValue` and nothing explains that.

### Data
- `InvestmentContribution` gains `type String @default("DEPOSIT")` -
  `"DEPOSIT" | "WITHDRAWAL"`. `amount` stays positive. Migration: add column;
  existing rows become `DEPOSIT`. No backfill of `currentValue` (not knowable) -
  the user corrects affected investments once with "Update value".
- `Investment.investedAmount` keeps its meaning: total deposited.
- Withdrawn total is derived: sum of `WITHDRAWAL` rows.

### Rules (pure helper, `src/lib/investment-math.ts`, unit tested)
- Deposit `a`: `investedAmount += a`, `currentValue += a`.
- Withdrawal `a`: requires `a <= currentValue`; `currentValue -= a`.
- Deleting a row applies the exact inverse (deposit: both −a; withdrawal:
  `currentValue += a`), and deletes its linked transaction if any.
- Gain = `currentValue + withdrawn − investedAmount`; % = gain / investedAmount
  (0 when investedAmount is 0).

### Ledger entry (optional, `skipTransaction`, default = book it)
- Deposit → EXPENSE, category "Investments", `fundingSource: "INCOME"` (monthly
  income only - no pot funding), description `Investment - <name>`.
- Withdrawal → INCOME, category "Investment Returns" (existing default),
  description `Withdrawal - <name>`.
- Both honour the budget-period override. The deposit dialog shows available
  income for the resolved period (`getExpenseFundingContext(month, year)` /
  `GET /api/v1/expenses/funding-context`), refetched when the checkbox/date changes.

### Surfaces
- Web actions: `addInvestmentContribution` and `addMoneyToCategory` gain
  `skipTransaction`, `budgetMonth`, `budgetYear` and use the helper; new
  `withdrawFromInvestment`; `deleteInvestmentContribution` uses the helper.
- API: `POST /api/v1/investments/[id]/contributions` accepts
  `type`, `skipTransaction`, `budgetMonth`, `budgetYear`; list responses include
  `type` and `withdrawnPaisas`, `gainPaisas` per investment.
- Web UI: per investment **Add money · Withdraw · Update value**. Update value
  gets the hint "Only changes what it's worth today. Doesn't record money in or
  out." Card: Invested, Withdrawn (if > 0), Current value, Gain/loss (amount + %).
  History: deposits `+`, withdrawals `−`, with a badge when an entry was booked.
- Mobile: same three actions on the investments page; Withdraw sheet and the
  add-money sheet use `BookTransactionField` + `BudgetPeriodField`; entity/model
  gain `type`, withdrawn, gain.

---

## B. Loans

### Data
- `LoanPayment` gains `kind String @default("PAYMENT")` -
  `"PAYMENT" | "TOP_UP" | "WRITE_OFF"`. Existing rows become `PAYMENT`.
- `Loan.status` gains `"WRITTEN_OFF"`. Shared constant
  `CLOSED_LOAN_STATUSES = ["PAID", "WRITTEN_OFF"]` in `src/lib/loans/`.

### Rules (pure helper in `src/lib/loans/`, unit tested)
- `principalAmount` = original + all top-ups. `remainingAmount` = principal −
  payments − write-offs.
- Status: remaining 0 and the loan has any `WRITE_OFF` row → `WRITTEN_OFF`; remaining 0 otherwise →
  `PAID`; some repaid → `PARTIALLY_PAID`; else `ACTIVE`. Recomputed after every
  add/delete.
- Top-up on a closed loan reopens it.
- Deleting a top-up is refused if it would make principal < repaid + written off.
- Write-off amount: 1 ≤ amount ≤ remaining; defaults to remaining.
- `offersWriteOffExpense(loan, history)` = `loan.type === "GIVEN" && loan.transactionId === null`
  and no `TOP_UP` in its history booked a transaction (otherwise part of the
  loss is already counted).
  Only then is "Record as expense" shown; otherwise the dialog says "Already
  counted when you created this loan. Nothing new is recorded."

### Ledger entries (optional, default = book it, budget-period override)
- Add to loan: same as loan creation - GIVEN → EXPENSE `Loan to <person>`,
  RECEIVED → INCOME `Loan from <person>`, category "Loan", funded from income.
- Write-off (only when offered): EXPENSE `Written off: <person>`, category "Loan".
- Deleting a history row deletes its linked transaction.

### Closed-loan filters
Replace `status: { not: "PAID" }` with `notIn: CLOSED_LOAN_STATUSES` in
`src/lib/cashflow/data-loader.ts`, `src/lib/financial-position.ts`,
`src/app/api/cron/daily/route.ts`, `getLoans` filters, and the v1 loans route.
Unfulfilled schedules of a written-off loan stop contributing to the projection.

### Surfaces
- Web actions: `addToLoan`, `writeOffLoan`; `deleteLoanPayment` handles all kinds.
  Loans page: **Add to loan** and **Write off** (GIVEN) / **Mark as forgiven**
  (RECEIVED) actions; history shows all kinds; "Paid" tab → "Closed" with a
  "Written off" badge.
- New-loan form: if an active loan exists for the same person (case- and
  whitespace-insensitive) and type, offer "Add to that loan instead".
- API: `POST /api/v1/loans/[id]/top-ups`, `POST /api/v1/loans/[id]/write-off`;
  payment objects include `kind`; loan list exposes `offersWriteOffExpense`.
- Mobile: loan card actions for both; new pages reuse `BookTransactionField`
  and `BudgetPeriodField`; Quick Add Loan shows the same-person prompt.

---

## C. Expenses summary

- Web Expenses: 4th summary card **Available** = `monthlyIncomeAvailable`
  (already passed in). Red "over-allocated" when negative. Grid 2×2 on narrow
  screens, 4 across on wide.
- Mobile Expenses tab: strip **Spent · Budget · Under/Over · Available** for the
  open period, from `GET /api/v1/budget` and
  `GET /api/v1/expenses/funding-context`. "–" when no budget. Refreshes on
  pull-to-refresh and after adding an expense.
- Mobile Income tab: strip **Income this period · Available**.
- Built from `AppCard`, `AppColors`, `AppTextStyles`; no API changes.

---

## Testing
- Vitest: `investment-math`, loan balance/status helper, `offersWriteOffExpense`.
- Web: `tsc --noEmit`, lint, `pnpm test`, `pnpm build`; manual pass of each flow
  against the local database.
- Mobile: `fvm flutter analyze`, `fvm flutter test`, widget test for the summary
  strip (no budget / under / over).

## Out of scope
- Funding investment deposits from a savings pot.
- Per-person loan grouping or a Person entity.
- Backfilling `currentValue` for existing investments.
