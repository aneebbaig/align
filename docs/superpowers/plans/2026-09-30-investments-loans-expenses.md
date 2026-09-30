# Investments, Loans, and Expenses Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix investment value tracking and add withdrawals, add "Add to loan" and loan write-off, and show "Available" on the expenses screens - in both the web app and the Android app.

**Architecture:** Money rules live in small pure TypeScript helpers (`src/lib/investment-math.ts`, `src/lib/loans/balance.ts`) with Vitest tests. Thin DB-layer functions in `src/lib/` apply them inside Prisma transactions and are shared by the web server actions and the `/api/v1` routes. The Flutter app gets matching datasource methods and screens. Two hand-written SQL migrations add one column each.

**Tech Stack:** Next.js 16 (App Router, server actions), Prisma 7 + Postgres, Vitest, Zod; Flutter via `fvm`, Riverpod 3 codegen, Dio.

**Spec:** `docs/superpowers/specs/2026-09-30-investments-loans-expenses-design.md`

## Global Constraints

- Money is integer paisas everywhere (DB, API, both apps). Never floats. Web actions take rupees and convert with `toPaisas`.
- Every new money flow accepts optional `budgetMonth`/`budgetYear`; when omitted it uses the user's open period. UI exposes it only as the "File under this date's budget" checkbox (`BudgetPeriodOverride` on web, `BudgetPeriodField` on mobile).
- Optional ledger entries default to ON and are turned off with `skipTransaction: true` (API/actions) / an unchecked "Also record as …" box (UI).
- An `/api/v1` shape change lands in the route handler and the matching mobile `*_datasource.dart` in the same task.
- Route handler `params` are async: `{ params }: { params: Promise<{ id: string }> }` and `await params`.
- Mobile: no barrel files; use `App*` widgets, `AppColors`, `AppTextStyles`; page mutations call the datasource directly with a local `_loading` flag; no `AsyncValue.guard`; run all Flutter/Dart via `fvm`.
- Re-run `fvm dart run build_runner build --delete-conflicting-outputs` after changing any `@riverpod` provider.
- Migrations are hand-written SQL. After writing one, apply with `pnpm exec prisma migrate deploy` and confirm `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` prints `-- This is an empty migration.` Never let `prisma migrate dev` generate a migration.
- No file may contain the leak-guard terms (AI-assistant names, the owner's personal email). Commit messages use Conventional Commits.
- All web commands run from `apps/web`; all mobile commands from `apps/mobile`.

## Review Focus

1. **Withdrawing more than the current value** - must be refused with a clear message, not produce a negative value. Test: `applyMovement` rejects it (Task 2).
2. **Deleting a deposit after "Update value" lowered the value below that deposit** - current value must clamp at 0, not go negative. Test: `reverseMovement` clamp case (Task 2).
3. **Deleting a top-up when more than that has already been repaid** - must be refused, or principal would drop below what was repaid. Test: `reverseLoanEntry` rejects it (Task 7).
4. **Paying the rest of a loan after a partial write-off** - status must end `WRITTEN_OFF` (history has a write-off), and a written-off loan must disappear from forecasts, net position, and due-date emails. Tests: `loanStatusFor` cases (Task 7); filter changes verified by grep in Task 8.
5. **Same person typed with different case/spacing ("ahmed ", "Ahmed")** - must still trigger the "Add to that loan instead?" prompt. Test: `normalizePersonName` (Task 7).

---

## Part A - Investments

### Task 1: Contribution `type` column

**Files:**
- Modify: `apps/web/prisma/schema.prisma` (model `InvestmentContribution`)
- Create: `apps/web/prisma/migrations/20260930120000_investment_contribution_type/migration.sql`

**Interfaces:**
- Produces: `InvestmentContribution.type: string` (`"DEPOSIT" | "WITHDRAWAL"`, default `"DEPOSIT"`).

- [ ] **Step 1: Add the field to the schema**

In `model InvestmentContribution`, directly under `amount       Int // paisas`, add:

```prisma
  // "DEPOSIT" (money in) | "WITHDRAWAL" (money out). amount is always positive.
  type         String   @default("DEPOSIT")
```

- [ ] **Step 2: Write the migration**

`apps/web/prisma/migrations/20260930120000_investment_contribution_type/migration.sql`:

```sql
-- Contributions can now be withdrawals as well as deposits. Existing rows are
-- all deposits, which is what the default gives them.
ALTER TABLE "investment_contributions" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'DEPOSIT';
```

- [ ] **Step 3: Apply and check for drift**

Run: `pnpm exec prisma migrate deploy && pnpm exec prisma generate && pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
Expected: migration applied; last command prints `-- This is an empty migration.`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260930120000_investment_contribution_type
git commit -m "feat(web): add type to investment contributions"
```

### Task 2: Investment math helper

**Files:**
- Create: `apps/web/src/lib/investment-math.ts`
- Test: `apps/web/src/lib/investment-math.test.ts`

**Interfaces:**
- Produces:
  - `type ContributionType = "DEPOSIT" | "WITHDRAWAL"`
  - `interface InvestmentTotals { investedAmount: number; currentValue: number }`
  - `applyMovement(t: InvestmentTotals, m: { type: ContributionType; amount: number }): InvestmentTotals | { error: string }`
  - `reverseMovement(t: InvestmentTotals, m: { type: ContributionType; amount: number }): InvestmentTotals`
  - `withdrawnTotal(rows: { type: string; amount: number }[]): number`
  - `investmentGain(t: InvestmentTotals, withdrawn: number): { gain: number; gainPct: number }`

- [ ] **Step 1: Write the failing tests**

`apps/web/src/lib/investment-math.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyMovement, investmentGain, reverseMovement, withdrawnTotal } from "./investment-math";

describe("applyMovement", () => {
  it("a deposit raises both invested and current value", () => {
    expect(applyMovement({ investedAmount: 100_000, currentValue: 120_000 }, { type: "DEPOSIT", amount: 50_000 }))
      .toEqual({ investedAmount: 150_000, currentValue: 170_000 });
  });

  it("a withdrawal lowers only the current value", () => {
    expect(applyMovement({ investedAmount: 100_000, currentValue: 120_000 }, { type: "WITHDRAWAL", amount: 20_000 }))
      .toEqual({ investedAmount: 100_000, currentValue: 100_000 });
  });

  it("refuses to withdraw more than the current value", () => {
    expect(applyMovement({ investedAmount: 100_000, currentValue: 120_000 }, { type: "WITHDRAWAL", amount: 120_001 }))
      .toEqual({ error: "You can't withdraw more than the current value" });
  });

  it("allows withdrawing exactly the current value", () => {
    expect(applyMovement({ investedAmount: 100_000, currentValue: 120_000 }, { type: "WITHDRAWAL", amount: 120_000 }))
      .toEqual({ investedAmount: 100_000, currentValue: 0 });
  });

  it("refuses zero, negative and fractional amounts", () => {
    const t = { investedAmount: 0, currentValue: 0 };
    expect(applyMovement(t, { type: "DEPOSIT", amount: 0 })).toEqual({ error: "Amount must be greater than zero" });
    expect(applyMovement(t, { type: "DEPOSIT", amount: -5 })).toEqual({ error: "Amount must be greater than zero" });
    expect(applyMovement(t, { type: "DEPOSIT", amount: 1.5 })).toEqual({ error: "Amount must be greater than zero" });
  });
});

describe("reverseMovement", () => {
  it("undoes a deposit", () => {
    expect(reverseMovement({ investedAmount: 150_000, currentValue: 170_000 }, { type: "DEPOSIT", amount: 50_000 }))
      .toEqual({ investedAmount: 100_000, currentValue: 120_000 });
  });

  it("clamps at zero when the value was marked down below the deposit", () => {
    expect(reverseMovement({ investedAmount: 50_000, currentValue: 30_000 }, { type: "DEPOSIT", amount: 50_000 }))
      .toEqual({ investedAmount: 0, currentValue: 0 });
  });

  it("undoes a withdrawal", () => {
    expect(reverseMovement({ investedAmount: 100_000, currentValue: 100_000 }, { type: "WITHDRAWAL", amount: 20_000 }))
      .toEqual({ investedAmount: 100_000, currentValue: 120_000 });
  });
});

describe("withdrawnTotal", () => {
  it("sums only withdrawals", () => {
    expect(withdrawnTotal([
      { type: "DEPOSIT", amount: 100 },
      { type: "WITHDRAWAL", amount: 30 },
      { type: "WITHDRAWAL", amount: 20 },
    ])).toBe(50);
  });
});

describe("investmentGain", () => {
  it("counts money already withdrawn as part of the return", () => {
    // Put in 100k, took out 30k, now worth 80k -> 10k gain.
    expect(investmentGain({ investedAmount: 100_000, currentValue: 80_000 }, 30_000))
      .toEqual({ gain: 10_000, gainPct: 10 });
  });

  it("is zero percent when nothing was invested", () => {
    expect(investmentGain({ investedAmount: 0, currentValue: 0 }, 0)).toEqual({ gain: 0, gainPct: 0 });
  });

  it("reports a loss", () => {
    expect(investmentGain({ investedAmount: 100_000, currentValue: 90_000 }, 0))
      .toEqual({ gain: -10_000, gainPct: -10 });
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm exec vitest run src/lib/investment-math.test.ts`
Expected: FAIL - cannot resolve `./investment-math`.

- [ ] **Step 3: Implement**

`apps/web/src/lib/investment-math.ts`:

```ts
// Pure money rules for investments - no DB. Invested = total deposited;
// withdrawals only lower the current value, and gain counts what was taken
// out, so taking profits never shows a negative "invested".

export type ContributionType = "DEPOSIT" | "WITHDRAWAL";

export interface InvestmentTotals {
  investedAmount: number; // paisas, total deposited
  currentValue: number; // paisas, what it's worth now
}

interface Movement {
  type: ContributionType;
  amount: number; // paisas, always positive
}

export function applyMovement(t: InvestmentTotals, m: Movement): InvestmentTotals | { error: string } {
  if (!Number.isInteger(m.amount) || m.amount <= 0) return { error: "Amount must be greater than zero" };
  if (m.type === "DEPOSIT") {
    return { investedAmount: t.investedAmount + m.amount, currentValue: t.currentValue + m.amount };
  }
  if (m.amount > t.currentValue) return { error: "You can't withdraw more than the current value" };
  return { investedAmount: t.investedAmount, currentValue: t.currentValue - m.amount };
}

export function reverseMovement(t: InvestmentTotals, m: Movement): InvestmentTotals {
  if (m.type === "DEPOSIT") {
    return {
      investedAmount: Math.max(0, t.investedAmount - m.amount),
      currentValue: Math.max(0, t.currentValue - m.amount),
    };
  }
  return { investedAmount: t.investedAmount, currentValue: t.currentValue + m.amount };
}

export function withdrawnTotal(rows: { type: string; amount: number }[]): number {
  return rows.filter((r) => r.type === "WITHDRAWAL").reduce((s, r) => s + r.amount, 0);
}

export function investmentGain(t: InvestmentTotals, withdrawn: number): { gain: number; gainPct: number } {
  const gain = t.currentValue + withdrawn - t.investedAmount;
  const gainPct = t.investedAmount > 0 ? (gain / t.investedAmount) * 100 : 0;
  return { gain, gainPct };
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm exec vitest run src/lib/investment-math.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/investment-math.ts src/lib/investment-math.test.ts
git commit -m "feat(web): investment deposit/withdrawal maths"
```

### Task 3: Investment DB layer, server actions, and API routes

**Files:**
- Modify: `apps/web/src/lib/investment-contributions.ts`
- Modify: `apps/web/src/actions/savings.ts` (`addInvestmentContribution`, `addMoneyToCategory`, `deleteInvestmentContribution`; add `withdrawFromInvestment`)
- Modify: `apps/web/src/app/api/v1/investments/route.ts` (GET serialisation)
- Modify: `apps/web/src/app/api/v1/investments/[id]/contributions/route.ts`
- Modify: `apps/web/src/app/api/v1/investments/[id]/contributions/[cid]/route.ts`
- Modify: `apps/web/src/app/api/v1/investment-plan/categories/[id]/contributions/route.ts`

**Interfaces:**
- Consumes: Task 2 helpers; `bookContributionTransaction` (existing).
- Produces:
  - `class InvestmentMovementError extends Error`
  - `bookWithdrawalTransaction(tx, { userId, investmentName, amount, date, notes?, period }): Promise<string>`
  - `ensureCategoryInvestment(tx, userId: string, planCategoryId: string): Promise<string | null>` - returns the linked investment id, creating a 0/0 one on first use; `null` if the category isn't the user's.
  - `recordInvestmentMovement(tx, { userId, investmentId, type, amount, date, notes?, period, book }): Promise<string>` - returns the contribution id; throws `InvestmentMovementError`.
  - `deleteContribution(tx, { id, investmentId, type, amount, transactionId })` (now needs `type`).
  - Server actions (rupees in): `addInvestmentContribution(id, MoveInput)`, `withdrawFromInvestment(id, MoveInput)`, `addMoneyToCategory(categoryId, MoveInput)` where `MoveInput = { amount: number; date: string; notes?: string; skipTransaction?: boolean; budgetMonth?: number; budgetYear?: number }`.
  - API: `POST /api/v1/investments/[id]/contributions` body `{ amountPaisas, date, notes?, type?: "DEPOSIT"|"WITHDRAWAL", skipTransaction?, budgetMonth?, budgetYear? }`; `POST /api/v1/investment-plan/categories/[id]/contributions` gains `skipTransaction?, budgetMonth?, budgetYear?`; GET `/api/v1/investments` contributions gain `type`, `hasTransaction`; each investment gains `withdrawnAmountPaisas`, `gainPaisas`; `summary.totalGainPaisas` = sum of per-investment gains.

- [ ] **Step 1: Extend the DB layer**

In `apps/web/src/lib/investment-contributions.ts`, add at the top:

```ts
import { applyMovement, reverseMovement, type ContributionType } from "@/lib/investment-math";
```

Append:

```ts
export class InvestmentMovementError extends Error {}

// Ledger side of "money coming out of an investment" - an INCOME entry in the
// default "Investment Returns" category, mirroring bookContributionTransaction.
export async function bookWithdrawalTransaction(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    investmentName: string;
    amount: number; // paisas
    date: Date;
    notes?: string | null;
    period: { month: number; year: number };
  },
): Promise<string> {
  const { userId, investmentName, amount, date, notes, period } = params;
  const categoryId = await ensureCategory(tx, userId, "Investment Returns");
  const transaction = await tx.transaction.create({
    data: {
      amount,
      type: "INCOME",
      categoryId,
      description: `Withdrawal - ${investmentName}`,
      notes: notes ?? null,
      date,
      budgetMonth: period.month,
      budgetYear: period.year,
      fundingSource: "INCOME",
      tags: "investment",
      userId,
    },
  });
  return transaction.id;
}

// A plan category's linked Investment, created empty (0 invested, 0 value) the
// first time money goes in - the deposit that follows sets both.
export async function ensureCategoryInvestment(
  tx: Prisma.TransactionClient,
  userId: string,
  planCategoryId: string,
): Promise<string | null> {
  const category = await tx.investmentPlanCategory.findFirst({
    where: { id: planCategoryId, plan: { userId } },
    select: { id: true, name: true, investmentType: true },
  });
  if (!category) return null;
  const existing = await tx.investment.findFirst({
    where: { planCategoryId: category.id, userId },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await tx.investment.create({
    data: {
      name: category.name,
      type: category.investmentType ?? "OTHER",
      platform: "",
      investedAmount: 0,
      currentValue: 0,
      purchaseDate: new Date(),
      planCategoryId: category.id,
      userId,
    },
    select: { id: true },
  });
  return created.id;
}

// The one place a deposit or withdrawal is applied: checks the rule, books the
// optional ledger entry, logs the contribution, and updates the cached totals
// - all inside the caller's transaction.
export async function recordInvestmentMovement(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    investmentId: string;
    type: ContributionType;
    amount: number; // paisas
    date: Date;
    notes?: string | null;
    period: { month: number; year: number };
    book: boolean;
  },
): Promise<string> {
  const inv = await tx.investment.findFirst({
    where: { id: params.investmentId, userId: params.userId },
    select: { id: true, name: true, investedAmount: true, currentValue: true },
  });
  if (!inv) throw new InvestmentMovementError("Investment not found");

  const next = applyMovement(inv, { type: params.type, amount: params.amount });
  if ("error" in next) throw new InvestmentMovementError(next.error);

  let transactionId: string | null = null;
  if (params.book) {
    const book = params.type === "DEPOSIT" ? bookContributionTransaction : bookWithdrawalTransaction;
    transactionId = await book(tx, {
      userId: params.userId,
      investmentName: inv.name,
      amount: params.amount,
      date: params.date,
      notes: params.notes,
      period: params.period,
    });
  }

  const contribution = await tx.investmentContribution.create({
    data: {
      investmentId: inv.id,
      type: params.type,
      amount: params.amount,
      date: params.date,
      notes: params.notes ?? null,
      transactionId,
    },
    select: { id: true },
  });
  await tx.investment.update({
    where: { id: inv.id },
    data: { investedAmount: next.investedAmount, currentValue: next.currentValue, lastUpdated: new Date() },
  });
  return contribution.id;
}
```

Replace the existing `deleteContribution` with:

```ts
// Deletes a deposit or withdrawal, its linked Transaction (if it booked one),
// and applies the exact inverse to the investment's cached totals. Caller has
// already verified ownership of the contribution.
export async function deleteContribution(
  tx: Prisma.TransactionClient,
  contribution: { id: string; investmentId: string; type: string; amount: number; transactionId: string | null },
): Promise<void> {
  const inv = await tx.investment.findUniqueOrThrow({
    where: { id: contribution.investmentId },
    select: { investedAmount: true, currentValue: true },
  });
  const next = reverseMovement(inv, { type: contribution.type as ContributionType, amount: contribution.amount });
  await tx.investmentContribution.delete({ where: { id: contribution.id } });
  if (contribution.transactionId) {
    await tx.transaction.delete({ where: { id: contribution.transactionId } });
  }
  await tx.investment.update({
    where: { id: contribution.investmentId },
    data: { investedAmount: next.investedAmount, currentValue: next.currentValue },
  });
}
```

Also update the file's top comment on `bookContributionTransaction` - replace the sentence starting "Callers still create the InvestmentContribution themselves…" with: `recordInvestmentMovement is the normal caller; createInvestment still books its first contribution directly.`

- [ ] **Step 2: Update the server actions**

In `apps/web/src/actions/savings.ts`, change the import from `@/lib/investment-contributions` to:

```ts
import {
  bookContributionTransaction, deleteContribution, deleteContributionTransactionsFor,
  recordInvestmentMovement, ensureCategoryInvestment, InvestmentMovementError,
} from "@/lib/investment-contributions";
import type { ContributionType } from "@/lib/investment-math";
```

Replace the whole `addInvestmentContribution` function with:

```ts
interface MoveInput {
  amount: number; // rupees
  date: string;
  notes?: string;
  // When true, no Expenses/Income entry is booked - the investment's numbers still change.
  skipTransaction?: boolean;
  // Optional budget-period override. When omitted, the user's open period is used.
  budgetMonth?: number;
  budgetYear?: number;
}

function revalidateInvestmentPaths() {
  revalidatePath("/savings");
  revalidatePath("/investments");
  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/dashboard");
}

// Shared by add-money, withdraw and add-money-to-category: resolves the period,
// then applies the movement through recordInvestmentMovement in one transaction.
async function moveInvestmentMoney(
  type: ContributionType,
  target: { investmentId: string } | { planCategoryId: string },
  data: MoveInput,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const period = (data.budgetMonth && data.budgetYear)
      ? { month: data.budgetMonth, year: data.budgetYear }
      : getCurrentPeriod(user.currentBudgetMonth as number | null, user.currentBudgetYear as number | null);
    await prisma.$transaction(async (tx) => {
      const investmentId = "investmentId" in target
        ? target.investmentId
        : await ensureCategoryInvestment(tx, user.id, target.planCategoryId);
      if (!investmentId) throw new InvestmentMovementError("Plan category not found");
      await recordInvestmentMovement(tx, {
        userId: user.id,
        investmentId,
        type,
        amount: toPaisas(data.amount),
        date: new Date(data.date),
        notes: data.notes,
        period,
        book: !data.skipTransaction,
      });
    });
    revalidateInvestmentPaths();
    return { success: true };
  } catch (e) {
    if (e instanceof InvestmentMovementError) return { success: false, error: e.message };
    console.error(`[moveInvestmentMoney:${type}]`, e);
    return { success: false, error: type === "DEPOSIT" ? "Failed to add money" : "Failed to withdraw" };
  }
}

// Logs a top-up against an existing investment, any amount, any time.
export async function addInvestmentContribution(investmentId: string, data: MoveInput): Promise<ActionResult> {
  return moveInvestmentMoney("DEPOSIT", { investmentId }, data);
}

// Takes money out of an investment - lowers its current value.
export async function withdrawFromInvestment(investmentId: string, data: MoveInput): Promise<ActionResult> {
  return moveInvestmentMoney("WITHDRAWAL", { investmentId }, data);
}
```

In `deleteInvestmentContribution`, change the `select` to include `type: true`:

```ts
        select: { id: true, investmentId: true, type: true, amount: true, transactionId: true },
```

and replace its four `revalidatePath` lines with `revalidateInvestmentPaths();`.

Replace the whole `addMoneyToCategory` function (the one starting `// Adds money to a plan category directly`) with:

```ts
// Adds money to a plan category directly - lazily creates the category's
// linked Investment on first use (name/type inherited from the category) so
// "add to plan, then add money" needs no separate SIP-creation form.
export async function addMoneyToCategory(planCategoryId: string, data: MoveInput): Promise<ActionResult> {
  return moveInvestmentMoney("DEPOSIT", { planCategoryId }, data);
}
```

Check that `bookContributionTransaction` is still used in this file (by `createInvestment`); if `pnpm exec tsc --noEmit` reports it unused, leave it - `createInvestment` uses it.

- [ ] **Step 3: Update the add-contribution API route**

Replace the body of `apps/web/src/app/api/v1/investments/[id]/contributions/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";
import { recordInvestmentMovement, InvestmentMovementError } from "@/lib/investment-contributions";

// Add money to (DEPOSIT) or take money out of (WITHDRAWAL) an investment. The
// Expenses/Income entry is optional (skipTransaction) and follows the
// budget-period override like every other money flow.
const createSchema = z.object({
  amountPaisas: z.number().int().positive(),
  date: z.string().min(1),
  notes: z.string().max(1000).optional(),
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]).default("DEPOSIT"),
  skipTransaction: z.boolean().optional(),
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const d = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const period = (d.budgetMonth && d.budgetYear)
      ? { month: d.budgetMonth, year: d.budgetYear }
      : getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear);

    const contributionId = await prisma.$transaction((tx) =>
      recordInvestmentMovement(tx, {
        userId: auth.id,
        investmentId: id,
        type: d.type,
        amount: d.amountPaisas,
        date: new Date(d.date),
        notes: d.notes,
        period,
        book: !d.skipTransaction,
      }),
    );
    return NextResponse.json({ data: { id: contributionId } }, { status: 201 });
  } catch (e) {
    if (e instanceof InvestmentMovementError) {
      const status = e.message === "Investment not found" ? 404 : 422;
      return NextResponse.json({ error: e.message }, { status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Update the delete-contribution API route**

In `apps/web/src/app/api/v1/investments/[id]/contributions/[cid]/route.ts`, change the `select` to:

```ts
        select: { id: true, investmentId: true, type: true, amount: true, transactionId: true },
```

and update the header comment's "decrement the SIP's cached total" to "undo its effect on the investment's totals".

- [ ] **Step 5: Update the plan-category contribution API route**

Replace `apps/web/src/app/api/v1/investment-plan/categories/[id]/contributions/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";
import { ensureCategoryInvestment, recordInvestmentMovement, InvestmentMovementError } from "@/lib/investment-contributions";

// Add money to a plan category directly - lazily creates the category's
// linked Investment on first use (name/type inherited from the category), so
// mobile's "add to plan, then add money" flow needs no separate SIP-creation
// endpoint. Mirrors the web addMoneyToCategory action.
const createSchema = z.object({
  amountPaisas: z.number().int().positive(),
  date: z.string().min(1),
  notes: z.string().max(1000).optional(),
  skipTransaction: z.boolean().optional(),
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const d = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const period = (d.budgetMonth && d.budgetYear)
      ? { month: d.budgetMonth, year: d.budgetYear }
      : getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear);

    const result = await prisma.$transaction(async (tx) => {
      const investmentId = await ensureCategoryInvestment(tx, auth.id, id);
      if (!investmentId) return null;
      const contributionId = await recordInvestmentMovement(tx, {
        userId: auth.id,
        investmentId,
        type: "DEPOSIT",
        amount: d.amountPaisas,
        date: new Date(d.date),
        notes: d.notes,
        period,
        book: !d.skipTransaction,
      });
      return { investmentId, contributionId };
    });

    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) {
    if (e instanceof InvestmentMovementError) return NextResponse.json({ error: e.message }, { status: 422 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Update the GET serialisation**

In `apps/web/src/app/api/v1/investments/route.ts`:

Add the import:

```ts
import { investmentGain, withdrawnTotal } from "@/lib/investment-math";
```

Change `ContributionRow` to:

```ts
interface ContributionRow {
  id: string;
  type: string;
  amount: number;
  date: Date;
  notes: string | null;
  transactionId: string | null;
}
```

Replace `serializeInvestment` with:

```ts
function serializeInvestment(i: InvestmentRow) {
  const withdrawn = withdrawnTotal(i.contributions);
  const { gain } = investmentGain(i, withdrawn);
  return {
    id: i.id,
    name: i.name,
    type: i.type,
    platform: i.platform,
    investedAmountPaisas: i.investedAmount,
    currentValuePaisas: i.currentValue,
    withdrawnAmountPaisas: withdrawn,
    gainPaisas: gain,
    units: i.units,
    purchaseDate: i.purchaseDate.toISOString(),
    notes: i.notes,
    customFields: i.customFields,
    planCategoryId: i.planCategoryId,
    contributions: i.contributions.map((c) => ({
      id: c.id,
      type: c.type,
      amountPaisas: c.amount,
      date: c.date.toISOString(),
      notes: c.notes,
      hasTransaction: c.transactionId != null,
    })),
  };
}
```

Replace the three summary lines (`totalInvested`, `totalCurrentValue`, and the `summary` object's `totalGainPaisas`) so the summary uses per-investment gains:

```ts
    const serialized = investments.map(serializeInvestment);
    const totalInvested = serialized.reduce((s, i) => s + i.investedAmountPaisas, 0);
    const totalCurrentValue = serialized.reduce((s, i) => s + i.currentValuePaisas, 0);
    const totalGain = serialized.reduce((s, i) => s + i.gainPaisas, 0);
```

and in the response use `totalGainPaisas: totalGain` and `investments: serialized`.

In the `periodContributions` query add `type: "DEPOSIT"` to the `where` so withdrawals don't count as "actual" plan contributions:

```ts
          where: {
            type: "DEPOSIT",
            date: { gte: start, lte: end },
```

- [ ] **Step 7: Fix the web "actual this period" figure the same way**

Run: `grep -n "investmentContribution" src/actions/savings.ts src/lib/cashflow/*.ts src/lib/financial-position.ts`
For every `investmentContribution.findMany`/`aggregate` that sums contributions as money *put in* (the investment suggestion / plan actuals), add `type: "DEPOSIT"` to its `where`. Leave `deleteContributionTransactionsFor` unchanged.

- [ ] **Step 8: Typecheck, lint, test**

Run: `pnpm exec tsc --noEmit && pnpm run lint && pnpm test`
Expected: no type errors, no lint errors, all tests pass.

- [ ] **Step 9: Smoke-test against the local database**

With `pnpm dev` running and a bearer token (sign in: `curl -s -X POST http://localhost:3000/api/auth/sign-in/email -H 'content-type: application/json' -H 'origin: http://localhost:3000' -d '{"email":"<USER1_EMAIL>","password":"<USER1_PASSWORD>"}'` → `token`):

```bash
T=<token>; I=<an investment id from GET /api/v1/investments>
curl -s -H "Authorization: Bearer $T" -H 'content-type: application/json' \
  -d '{"amountPaisas":1000000,"date":"2026-09-30","type":"WITHDRAWAL","skipTransaction":true}' \
  http://localhost:3000/api/v1/investments/$I/contributions
curl -s -H "Authorization: Bearer $T" -H 'content-type: application/json' \
  -d '{"amountPaisas":999999999,"date":"2026-09-30","type":"WITHDRAWAL"}' \
  http://localhost:3000/api/v1/investments/$I/contributions
```

Expected: first returns `201 {"data":{"id":…}}`; second returns `{"error":"You can't withdraw more than the current value"}`. Then `GET /api/v1/investments` shows the row with `"type":"WITHDRAWAL","hasTransaction":false` and `withdrawnAmountPaisas` increased. Delete that contribution via `DELETE /api/v1/investments/$I/contributions/<cid>` and confirm the value is restored.

- [ ] **Step 10: Commit**

```bash
git add src/lib/investment-contributions.ts src/actions/savings.ts src/app/api/v1/investments src/app/api/v1/investment-plan src/lib
git commit -m "fix(web): top-ups raise current value; add investment withdrawals with optional entries"
```

### Task 4: Web investments screen

**Files:**
- Modify: `apps/web/src/app/(app)/investments/page.tsx`
- Modify: `apps/web/src/components/investments/investments-client.tsx`

**Interfaces:**
- Consumes: `addInvestmentContribution`, `withdrawFromInvestment`, `addMoneyToCategory` (Task 3); `investmentGain`, `withdrawnTotal` (Task 2); `getExpenseFundingContext(month, year)` from `@/actions/expenses`; `getOpenBudgetPeriod()` from `@/actions/budget`; `BudgetPeriodOverride`, `monthYearFromDateStr` from `@/components/shared/budget-period-override`.

- [ ] **Step 1: Pass the open period to the client**

`apps/web/src/app/(app)/investments/page.tsx`:

```tsx
import { Metadata } from "next";
import { getInvestments, getInvestmentPlan, getInvestmentSuggestion } from "@/actions/savings";
import { getOpenBudgetPeriod } from "@/actions/budget";
import { getCurrencies } from "@/lib/currency-helpers";
import { InvestmentsClient } from "@/components/investments/investments-client";

export const metadata: Metadata = { title: "Investments" };

export default async function InvestmentsPage() {
  const [investments, currencies, plan, suggestion, currentPeriod] = await Promise.all([
    getInvestments(),
    getCurrencies(),
    getInvestmentPlan(),
    getInvestmentSuggestion(),
    getOpenBudgetPeriod(),
  ]);
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";

  return (
    <div className="max-w-5xl mx-auto">
      <InvestmentsClient
        investments={investments}
        baseSymbol={baseSymbol}
        plan={plan}
        suggestion={suggestion}
        currentPeriod={currentPeriod}
      />
    </div>
  );
}
```

- [ ] **Step 2: Types, imports, and state in the client**

In `investments-client.tsx`:

1. Change `interface Contribution` to:

```ts
interface Contribution {
  id: string;
  type: string; // "DEPOSIT" | "WITHDRAWAL"
  amount: number;
  date: Date;
  notes: string | null;
  transactionId: string | null;
}
```

2. Update the imports: change `import { useState } from "react";` to `import { useEffect, useState } from "react";`; add `withdrawFromInvestment` to the `@/actions/savings` import; and add:

```ts
import { getExpenseFundingContext } from "@/actions/expenses";
import { BudgetPeriodOverride, monthYearFromDateStr } from "@/components/shared/budget-period-override";
import { Checkbox } from "@/components/ui/checkbox";
import { investmentGain, withdrawnTotal } from "@/lib/investment-math";
```

Add `Minus` to the `lucide-react` import.

3. Replace `const BLANK_CONTRIBUTION = …` with:

```ts
const BLANK_CONTRIBUTION = {
  amount: "",
  date: format(new Date(), "yyyy-MM-dd"),
  notes: "",
  book: true,
  fileUnderDate: false,
};
```

4. Add `currentPeriod: { month: number; year: number };` to the props type and destructure it.

5. Change the `contributeTarget` state to carry the direction:

```ts
  const [contributeTarget, setContributeTarget] = useState<{
    mode: "DEPOSIT" | "WITHDRAWAL";
    categoryId?: string;
    investmentId?: string;
    name: string;
    currentValue?: number;
  } | null>(null);
```

6. Below the existing state, add the live available-income figure (follows the budget-period checkbox, per the house rule):

```ts
  const [availableIncome, setAvailableIncome] = useState<number | null>(null);
  const targetPeriod = contributionForm.fileUnderDate && contributionForm.date
    ? monthYearFromDateStr(contributionForm.date)
    : currentPeriod;

  useEffect(() => {
    if (contributeTarget?.mode !== "DEPOSIT" || !contributionForm.book) return;
    let cancelled = false;
    getExpenseFundingContext(targetPeriod.month, targetPeriod.year)
      .then((ctx) => { if (!cancelled) setAvailableIncome(ctx.monthlyIncomeAvailable); })
      .catch(() => { if (!cancelled) setAvailableIncome(null); });
    return () => { cancelled = true; };
  }, [contributeTarget?.mode, contributionForm.book, targetPeriod.month, targetPeriod.year]);
```

7. Replace the three totals lines with gain that counts withdrawals:

```ts
  const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
  const totalCurrentValue = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalGain = investments.reduce(
    (s, i) => s + investmentGain(i, withdrawnTotal(i.contributions)).gain,
    0,
  );
```

- [ ] **Step 3: Submit handler**

Replace `handleContribute` with:

```ts
  async function handleContribute() {
    if (!contributeTarget || !contributionForm.amount) return;
    setLoading(true);
    const override = contributionForm.fileUnderDate ? monthYearFromDateStr(contributionForm.date) : null;
    const payload = {
      amount: parseFloat(contributionForm.amount),
      date: contributionForm.date,
      notes: contributionForm.notes || undefined,
      skipTransaction: !contributionForm.book,
      ...(override ? { budgetMonth: override.month, budgetYear: override.year } : {}),
    };
    const result = contributeTarget.mode === "WITHDRAWAL"
      ? await withdrawFromInvestment(contributeTarget.investmentId as string, payload)
      : contributeTarget.investmentId
        ? await addInvestmentContribution(contributeTarget.investmentId, payload)
        : await addMoneyToCategory(contributeTarget.categoryId as string, payload);
    if (result.success) {
      toast.success(contributeTarget.mode === "WITHDRAWAL" ? "Withdrawal recorded" : "Money added");
      setContributeTarget(null);
      setContributionForm(BLANK_CONTRIBUTION);
    } else toast.error(result.error ?? "Failed");
    setLoading(false);
  }
```

- [ ] **Step 4: Card figures and actions**

In the `rows.map(...)` body, replace the `gain`/`gainPct` lines with:

```ts
              const withdrawn = inv ? withdrawnTotal(inv.contributions) : 0;
              const { gain, gainPct: gainPctNum } = inv ? investmentGain(inv, withdrawn) : { gain: 0, gainPct: 0 };
              const gainPct = gainPctNum.toFixed(1);
```

Replace the subtitle line (`{typeLabel} · {baseSymbol} … in · … contribution…`) with:

```tsx
                          ? <>{typeLabel} · {baseSymbol} {(inv.investedAmount / 100).toLocaleString()} invested{withdrawn > 0 && <> · {baseSymbol} {(withdrawn / 100).toLocaleString()} withdrawn</>}</>
```

Every existing `setContributeTarget(...)` call for "Add money" gains `mode: "DEPOSIT"`:

```tsx
                        setContributeTarget(
                          row.kind === "category"
                            ? { mode: "DEPOSIT", categoryId: row.category.id, investmentId: inv?.id, name }
                            : { mode: "DEPOSIT", investmentId: row.investment.id, name },
                        );
```

Directly after the "Add money" `<Button>`, add a Withdraw button (only when there is value to take out):

```tsx
                    {inv && inv.currentValue > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setContributeTarget({ mode: "WITHDRAWAL", investmentId: inv.id, name, currentValue: inv.currentValue });
                          setContributionForm(BLANK_CONTRIBUTION);
                        }}
                      >
                        <Minus className="h-3.5 w-3.5 mr-1" />
                        Withdraw
                      </Button>
                    )}
```

In the history list, show direction and whether an entry was booked. Replace the amount `<span>` inside `inv.contributions.map` with:

```tsx
                            <span className={cn("tabnum font-medium", c.type === "WITHDRAWAL" ? "text-red-500" : "text-foreground")}>
                              {c.type === "WITHDRAWAL" ? "−" : "+"}{baseSymbol} {(c.amount / 100).toLocaleString()}
                            </span>
                            {c.transactionId && (
                              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                                {c.type === "WITHDRAWAL" ? "in Income" : "in Expenses"}
                              </Badge>
                            )}
```

Change that delete button's `aria-label` to `"Delete entry"`.

- [ ] **Step 5: The add-money / withdraw dialog**

Replace the whole "Add money dialog" `<Dialog>` block with:

```tsx
      {/* Add money / withdraw dialog - one form, two directions. */}
      <Dialog open={!!contributeTarget} onOpenChange={(o) => { if (!o) { setContributeTarget(null); setContributionForm(BLANK_CONTRIBUTION); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {contributeTarget?.mode === "WITHDRAWAL" ? "Withdraw" : "Add money"} — {contributeTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount ({baseSymbol})</Label>
              <Input type="number" placeholder="0" value={contributionForm.amount} onChange={(e) => setContributionForm((f) => ({ ...f, amount: e.target.value }))} />
              {contributeTarget?.mode === "WITHDRAWAL" && contributeTarget.currentValue != null && (
                <p className="text-xs text-muted-foreground">
                  Current value {baseSymbol} {(contributeTarget.currentValue / 100).toLocaleString()} - you can't take out more than that.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={contributionForm.date} onChange={(e) => setContributionForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea rows={2} value={contributionForm.notes} onChange={(e) => setContributionForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="bookInvestmentEntry"
                checked={contributionForm.book}
                onCheckedChange={(c) => setContributionForm((f) => ({ ...f, book: !!c }))}
                className="mt-0.5"
              />
              <Label htmlFor="bookInvestmentEntry" className="cursor-pointer text-sm font-normal leading-snug">
                Also record as {contributeTarget?.mode === "WITHDRAWAL" ? "income" : "an expense"}
                <span className="block text-xs text-muted-foreground">
                  Uncheck to only change the investment, with no entry in {contributeTarget?.mode === "WITHDRAWAL" ? "Income" : "Expenses"}
                </span>
              </Label>
            </div>
            {contributionForm.book && (
              <>
                <BudgetPeriodOverride
                  date={contributionForm.date}
                  checked={contributionForm.fileUnderDate}
                  onChange={(v) => setContributionForm((f) => ({ ...f, fileUnderDate: v }))}
                  affectsFunding={contributeTarget?.mode === "DEPOSIT"}
                />
                {contributeTarget?.mode === "DEPOSIT" && availableIncome != null && (
                  <p className={cn("text-xs", availableIncome >= 0 ? "text-muted-foreground" : "text-red-500")}>
                    Paid from income · {baseSymbol} {(availableIncome / 100).toLocaleString()} available
                  </p>
                )}
              </>
            )}
            <Button onClick={handleContribute} disabled={loading || !contributionForm.amount} className="w-full">
              {contributeTarget?.mode === "WITHDRAWAL" ? "Withdraw" : "Add money"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 6: Explain "Update value"**

In the "Update value dialog", directly under `<DialogHeader>…</DialogHeader>`, add:

```tsx
          <p className="text-sm text-muted-foreground -mt-2">
            Only changes what it's worth today. Doesn't record money in or out - use Add money or Withdraw for that.
          </p>
```

- [ ] **Step 7: Typecheck, lint, build**

Run: `pnpm exec tsc --noEmit && pnpm run lint && pnpm run build`
Expected: all pass.

- [ ] **Step 8: Manual check in the browser**

With `pnpm dev`, on `/investments`: add Rs 1,000 to an investment → current value and invested both rise by 1,000 and gain is unchanged; Withdraw Rs 500 with the box ticked → value drops 500, a "Withdrawal - <name>" income appears on `/income`; untick → no income entry; try to withdraw more than the value → error toast; delete each history row → numbers return.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(app)/investments/page.tsx" src/components/investments/investments-client.tsx
git commit -m "feat(web): withdraw from investments, optional entries, clearer update value"
```

### Task 5: Mobile investments

**Files:**
- Modify: `apps/mobile/lib/features/investments/domain/entities/investment_entity.dart`
- Modify: `apps/mobile/lib/features/investments/data/datasources/investments_datasource.dart`
- Modify: `apps/mobile/lib/features/investments/presentation/widgets/investment_sheets.dart`
- Modify: `apps/mobile/lib/features/investments/presentation/pages/investments_page.dart`

**Interfaces:**
- Consumes: API from Task 3; `BookTransactionField`, `BudgetPeriodField`, `fundingContextProvider(int? month, int? year)`.
- Produces: `ContributionEntity.type`, `.hasTransaction`, `.isWithdrawal`; `InvestmentEntity.withdrawnPaisas`, `gainPaisas` (from server); datasource `logContribution({…, String type = 'DEPOSIT', bool skipTransaction = false, int? budgetMonth, int? budgetYear})`, `addMoneyToCategory({…, bool skipTransaction = false, int? budgetMonth, int? budgetYear})`; `showWithdrawSheet(context, ref, inv)`.

- [ ] **Step 1: Entities**

In `investment_entity.dart`, replace `ContributionEntity` with:

```dart
class ContributionEntity {
  const ContributionEntity({
    required this.id,
    required this.amountPaisas,
    required this.date,
    this.type = 'DEPOSIT',
    this.hasTransaction = false,
    this.notes,
  });

  final String id;
  final int amountPaisas;
  final DateTime date;
  final String type; // DEPOSIT | WITHDRAWAL
  // True when this entry also booked an Expenses/Income transaction.
  final bool hasTransaction;
  final String? notes;

  bool get isWithdrawal => type == 'WITHDRAWAL';
}
```

In `InvestmentEntity`: add constructor params `this.withdrawnPaisas = 0,` and `this.gainFromServerPaisas,`; fields `final int withdrawnPaisas;` and `final int? gainFromServerPaisas;`; and replace the two getters with:

```dart
  // Gain counts money already taken out: current + withdrawn - invested.
  int get gainPaisas => gainFromServerPaisas ?? (currentValuePaisas + withdrawnPaisas - investedPaisas);
  double get gainPct =>
      investedPaisas > 0 ? (gainPaisas / investedPaisas) * 100 : 0;
```

- [ ] **Step 2: Datasource**

In `investments_datasource.dart`:

Replace `addMoneyToCategory` and `logContribution` with:

```dart
  Future<void> addMoneyToCategory({
    required String planCategoryId,
    required int amountPaisas,
    required DateTime date,
    String? notes,
    bool skipTransaction = false,
    int? budgetMonth,
    int? budgetYear,
  }) async {
    try {
      await _dio.post(
        ApiConstants.investmentPlanCategoryContributions(planCategoryId),
        data: {
          'amountPaisas': amountPaisas,
          'date': date.toIso8601String(),
          if (notes != null && notes.isNotEmpty) 'notes': notes,
          if (skipTransaction) 'skipTransaction': true,
          if (budgetMonth != null) 'budgetMonth': budgetMonth,
          if (budgetYear != null) 'budgetYear': budgetYear,
        },
      );
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  // type: DEPOSIT (add money) or WITHDRAWAL (take money out). The optional
  // Expenses/Income entry is on unless skipTransaction is true.
  Future<void> logContribution({
    required String investmentId,
    required int amountPaisas,
    required DateTime date,
    String? notes,
    String type = 'DEPOSIT',
    bool skipTransaction = false,
    int? budgetMonth,
    int? budgetYear,
  }) async {
    try {
      await _dio.post(ApiConstants.investmentContributions(investmentId), data: {
        'amountPaisas': amountPaisas,
        'date': date.toIso8601String(),
        'type': type,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
        if (skipTransaction) 'skipTransaction': true,
        if (budgetMonth != null) 'budgetMonth': budgetMonth,
        if (budgetYear != null) 'budgetYear': budgetYear,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }
```

In `_parseInvestment` add:

```dart
        withdrawnPaisas: m['withdrawnAmountPaisas'] as int? ?? 0,
        gainFromServerPaisas: m['gainPaisas'] as int?,
```

Replace `_parseContribution` with:

```dart
  static ContributionEntity _parseContribution(Map<String, dynamic> m) =>
      ContributionEntity(
        id: m['id'] as String,
        amountPaisas: m['amountPaisas'] as int,
        date: DateTime.parse(m['date'] as String),
        type: m['type'] as String? ?? 'DEPOSIT',
        hasTransaction: m['hasTransaction'] as bool? ?? false,
        notes: m['notes'] as String?,
      );
```

- [ ] **Step 3: Sheets - add money / withdraw**

In `investment_sheets.dart`:

Add imports:

```dart
import '../../../../core/providers/funding_context_provider.dart';
import '../../../../core/widgets/book_transaction_field.dart';
import '../../../../core/widgets/budget_period_field.dart';
```

Add below `showLogContributionSheet`:

```dart
void showWithdrawSheet(BuildContext context, WidgetRef ref, InvestmentEntity inv) =>
    _sheet(context, _AddMoneySheet(name: inv.name, investment: inv, isWithdrawal: true));
```

Change `_AddMoneySheet`'s constructor and fields to:

```dart
  const _AddMoneySheet({required this.name, this.investment, this.category, this.isWithdrawal = false});
  final String name;
  final InvestmentEntity? investment;
  final PlanCategoryEntity? category;
  final bool isWithdrawal;
```

In `_AddMoneySheetState` add fields:

```dart
  bool _book = true;
  bool _fileUnderDate = false;
```

Add a getter used by `canSubmit`:

```dart
  bool get _valid {
    final p = _toPaisas(_amount.text);
    if (p == null) return false;
    if (widget.isWithdrawal) return p <= widget.investment!.currentValuePaisas;
    return true;
  }
```

In `_submit`, replace the `if (widget.investment != null) { … } else { … }` block with:

```dart
      final month = _book && _fileUnderDate ? _date.month : null;
      final year = _book && _fileUnderDate ? _date.year : null;
      if (widget.investment != null) {
        await ds.logContribution(
          investmentId: widget.investment!.id,
          amountPaisas: paisas,
          date: _date,
          notes: _notes.text.trim(),
          type: widget.isWithdrawal ? 'WITHDRAWAL' : 'DEPOSIT',
          skipTransaction: !_book,
          budgetMonth: month,
          budgetYear: year,
        );
      } else {
        await ds.addMoneyToCategory(
          planCategoryId: widget.category!.id,
          amountPaisas: paisas,
          date: _date,
          notes: _notes.text.trim(),
          skipTransaction: !_book,
          budgetMonth: month,
          budgetYear: year,
        );
      }
```

and change the success toast text to `widget.isWithdrawal ? 'Withdrawal recorded' : 'Money added'`.

In `build`, change the header to:

```dart
          _SheetHeader(
            title: '${widget.isWithdrawal ? 'Withdraw' : 'Add money'} — ${widget.name}',
            onSubmit: _submit,
            canSubmit: _valid,
            loading: _loading,
            submitLabel: widget.isWithdrawal ? 'Withdraw' : 'Add',
          ),
```

After the amount `_Field`, when withdrawing, add:

```dart
          if (widget.isWithdrawal) ...[
            const SizedBox(height: 6),
            Text('Current value ${widget.investment!.currentValuePaisas.formatPKR()} - you can\'t take out more',
                style: AppTextStyles.bodySmall),
          ],
```

After the notes `_Field`, add:

```dart
          const SizedBox(height: 8),
          BookTransactionField(
            label: widget.isWithdrawal ? 'income' : 'an expense',
            checked: _book,
            onChanged: (v) => setState(() => _book = v),
          ),
          if (_book) ...[
            BudgetPeriodField(
              date: _date,
              checked: _fileUnderDate,
              onChanged: (v) => setState(() => _fileUnderDate = v),
            ),
            if (!widget.isWithdrawal) _AvailableIncome(
              month: _fileUnderDate ? _date.month : null,
              year: _fileUnderDate ? _date.year : null,
            ),
          ],
```

Add this widget near the other private widgets:

```dart
// "Paid from income · Rs X available" for whichever period the entry targets.
class _AvailableIncome extends ConsumerWidget {
  const _AvailableIncome({this.month, this.year});
  final int? month;
  final int? year;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ctx = ref.watch(fundingContextProvider(month, year));
    return ctx.maybeWhen(
      data: (c) => Padding(
        padding: const EdgeInsets.only(left: 12, top: 4),
        child: Text(
          'Paid from income · ${c.monthlyIncomeAvailablePaisas.formatPKR()} available',
          style: AppTextStyles.bodySmall.copyWith(
            color: c.monthlyIncomeAvailablePaisas >= 0 ? AppColors.mutedForeground : AppColors.destructive,
          ),
        ),
      ),
      orElse: () => const SizedBox.shrink(),
    );
  }
}
```

- [ ] **Step 4: Sheets - update value hint and history sign**

In `_UpdateValueSheetState.build`, replace `const Text('What it is worth now (mark-to-market)', style: AppTextStyles.bodySmall),` with:

```dart
          const Text(
            "Only changes what it's worth today. Doesn't record money in or out - use Add money or Withdraw for that.",
            style: AppTextStyles.bodySmall,
          ),
```

In `_HistorySheet`, replace the amount `Text(c.amountPaisas.formatPKR(), …)` with:

```dart
                          Text(
                            '${c.isWithdrawal ? '−' : '+'}${c.amountPaisas.formatPKR()}${c.hasTransaction ? (c.isWithdrawal ? ' · in Income' : ' · in Expenses') : ''}',
                            style: AppTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.w600,
                              color: c.isWithdrawal ? AppColors.destructive : AppColors.foreground,
                            ),
                          ),
```

- [ ] **Step 5: Page - Withdraw action and subtitle**

In `investments_page.dart`, `_SipCard.build`, replace the subtitle text expression for `inv != null` with:

```dart
                          ? '${_typeLabels[_type] ?? _type} · ${inv.investedPaisas.formatPKR()} invested${inv.withdrawnPaisas > 0 ? ' · ${inv.withdrawnPaisas.formatPKR()} out' : ''}'
```

In `_showActions`, after the "Add money" `_SheetAction`, add:

```dart
            if (inv.currentValuePaisas > 0)
              _SheetAction(
                icon: Icons.remove,
                label: 'Withdraw',
                onTap: () {
                  Navigator.pop(ctx);
                  showWithdrawSheet(context, ref, inv);
                },
              ),
```

- [ ] **Step 6: Analyze and test**

Run: `fvm flutter analyze && fvm flutter test`
Expected: only the pre-existing `analysis_options_deprecated_plugins` warning; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/features/investments
git commit -m "feat(mobile): withdraw from investments with optional income entry"
```

---

## Part B - Loans

### Task 6: Loan entry `kind` column

**Files:**
- Modify: `apps/web/prisma/schema.prisma` (models `Loan`, `LoanPayment`)
- Create: `apps/web/prisma/migrations/20260930130000_loan_payment_kind/migration.sql`

**Interfaces:**
- Produces: `LoanPayment.kind: string` (`"PAYMENT" | "TOP_UP" | "WRITE_OFF"`, default `"PAYMENT"`); `Loan.status` documented to include `"WRITTEN_OFF"`.

- [ ] **Step 1: Schema**

In `model Loan`, change the status comment to:

```prisma
  status          String    @default("ACTIVE") // "ACTIVE" | "PARTIALLY_PAID" | "PAID" | "WRITTEN_OFF"
```

and change `principalAmount Int // Original amount in paisas` to `principalAmount Int // Original amount + every "Add to loan", in paisas`.

In `model LoanPayment`, under `amount        Int // Payment amount in paisas`, add:

```prisma
  // "PAYMENT" (repaid) | "TOP_UP" (lent/borrowed more) | "WRITE_OFF" (forgiven)
  kind          String   @default("PAYMENT")
```

- [ ] **Step 2: Migration**

`apps/web/prisma/migrations/20260930130000_loan_payment_kind/migration.sql`:

```sql
-- Loan history rows now cover top-ups ("Add to loan") and write-offs as well
-- as repayments. Every existing row is a repayment.
ALTER TABLE "loan_payments" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'PAYMENT';
```

- [ ] **Step 3: Apply and check for drift**

Run: `pnpm exec prisma migrate deploy && pnpm exec prisma generate && pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
Expected: last command prints `-- This is an empty migration.`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260930130000_loan_payment_kind
git commit -m "feat(web): add kind to loan history rows"
```

### Task 7: Loan balance helper

**Files:**
- Create: `apps/web/src/lib/loans/balance.ts`
- Test: `apps/web/src/lib/loans/balance.test.ts`
- Modify: `apps/web/src/lib/loans/payments.ts` (remove its local `loanStatusFor`, import the new one)

**Interfaces:**
- Produces:
  - `type LoanEntryKind = "PAYMENT" | "TOP_UP" | "WRITE_OFF"`
  - `const CLOSED_LOAN_STATUSES: string[]` = `["PAID", "WRITTEN_OFF"]`
  - `isLoanClosed(status: string): boolean`
  - `loanStatusFor(remaining: number, principal: number, hasWriteOff?: boolean): string`
  - `offersWriteOffExpense(loan: { type: string; transactionId: string | null }): boolean`
  - `interface LoanBalance { principalAmount: number; remainingAmount: number }`
  - `applyLoanEntry(b: LoanBalance, e: { kind: LoanEntryKind; amount: number }): LoanBalance | { error: string }`
  - `reverseLoanEntry(b: LoanBalance, e: { kind: LoanEntryKind; amount: number }): LoanBalance | { error: string }`
  - `normalizePersonName(name: string): string`

- [ ] **Step 1: Write the failing tests**

`apps/web/src/lib/loans/balance.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  applyLoanEntry, isLoanClosed, loanStatusFor, normalizePersonName, offersWriteOffExpense, reverseLoanEntry,
} from "./balance";

describe("loanStatusFor", () => {
  it("is ACTIVE when nothing is repaid", () => expect(loanStatusFor(100, 100)).toBe("ACTIVE"));
  it("is PARTIALLY_PAID in between", () => expect(loanStatusFor(40, 100)).toBe("PARTIALLY_PAID"));
  it("is PAID at zero with no write-off", () => expect(loanStatusFor(0, 100)).toBe("PAID"));
  it("is WRITTEN_OFF at zero when any write-off exists", () => expect(loanStatusFor(0, 100, true)).toBe("WRITTEN_OFF"));
  it("ignores write-offs while money is still owed", () => expect(loanStatusFor(10, 100, true)).toBe("PARTIALLY_PAID"));
});

describe("isLoanClosed", () => {
  it("treats PAID and WRITTEN_OFF as closed", () => {
    expect(isLoanClosed("PAID")).toBe(true);
    expect(isLoanClosed("WRITTEN_OFF")).toBe(true);
    expect(isLoanClosed("ACTIVE")).toBe(false);
    expect(isLoanClosed("PARTIALLY_PAID")).toBe(false);
  });
});

describe("offersWriteOffExpense", () => {
  it("only for a lent loan created track-only", () => {
    expect(offersWriteOffExpense({ type: "GIVEN", transactionId: null })).toBe(true);
    expect(offersWriteOffExpense({ type: "GIVEN", transactionId: "t1" })).toBe(false);
    expect(offersWriteOffExpense({ type: "RECEIVED", transactionId: null })).toBe(false);
  });
});

describe("applyLoanEntry", () => {
  const b = { principalAmount: 100_000, remainingAmount: 60_000 };
  it("a top-up raises principal and remaining", () =>
    expect(applyLoanEntry(b, { kind: "TOP_UP", amount: 20_000 })).toEqual({ principalAmount: 120_000, remainingAmount: 80_000 }));
  it("a payment lowers remaining", () =>
    expect(applyLoanEntry(b, { kind: "PAYMENT", amount: 10_000 })).toEqual({ principalAmount: 100_000, remainingAmount: 50_000 }));
  it("a write-off lowers remaining", () =>
    expect(applyLoanEntry(b, { kind: "WRITE_OFF", amount: 60_000 })).toEqual({ principalAmount: 100_000, remainingAmount: 0 }));
  it("refuses more than what's left", () =>
    expect(applyLoanEntry(b, { kind: "WRITE_OFF", amount: 60_001 })).toEqual({ error: "That's more than what's left on this loan" }));
  it("refuses zero or fractional amounts", () => {
    expect(applyLoanEntry(b, { kind: "TOP_UP", amount: 0 })).toEqual({ error: "Amount must be greater than zero" });
    expect(applyLoanEntry(b, { kind: "TOP_UP", amount: 2.5 })).toEqual({ error: "Amount must be greater than zero" });
  });
});

describe("reverseLoanEntry", () => {
  it("undoes a top-up", () =>
    expect(reverseLoanEntry({ principalAmount: 120_000, remainingAmount: 80_000 }, { kind: "TOP_UP", amount: 20_000 }))
      .toEqual({ principalAmount: 100_000, remainingAmount: 60_000 }));
  it("refuses to undo a top-up when more than that has been repaid", () =>
    expect(reverseLoanEntry({ principalAmount: 120_000, remainingAmount: 10_000 }, { kind: "TOP_UP", amount: 20_000 }))
      .toEqual({ error: "Can't remove this - more than that has already been repaid or written off" }));
  it("undoes a payment or write-off, never above principal", () => {
    expect(reverseLoanEntry({ principalAmount: 100_000, remainingAmount: 0 }, { kind: "WRITE_OFF", amount: 30_000 }))
      .toEqual({ principalAmount: 100_000, remainingAmount: 30_000 });
    expect(reverseLoanEntry({ principalAmount: 100_000, remainingAmount: 90_000 }, { kind: "PAYMENT", amount: 30_000 }))
      .toEqual({ principalAmount: 100_000, remainingAmount: 100_000 });
  });
});

describe("normalizePersonName", () => {
  it("ignores case and extra spaces", () => {
    expect(normalizePersonName("  Ahmed   Khan ")).toBe("ahmed khan");
    expect(normalizePersonName("ahmed khan")).toBe(normalizePersonName("AHMED KHAN"));
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm exec vitest run src/lib/loans/balance.test.ts`
Expected: FAIL - cannot resolve `./balance`.

- [ ] **Step 3: Implement**

`apps/web/src/lib/loans/balance.ts`:

```ts
// Pure loan balance rules - no DB. principalAmount = original + top-ups;
// remainingAmount = principal - repaid - written off.

export type LoanEntryKind = "PAYMENT" | "TOP_UP" | "WRITE_OFF";

// Closed loans drop out of forecasts, net position, and due-date reminders.
export const CLOSED_LOAN_STATUSES: string[] = ["PAID", "WRITTEN_OFF"];

export function isLoanClosed(status: string): boolean {
  return CLOSED_LOAN_STATUSES.includes(status);
}

export function loanStatusFor(remaining: number, principal: number, hasWriteOff = false): string {
  if (remaining <= 0) return hasWriteOff ? "WRITTEN_OFF" : "PAID";
  if (remaining >= principal) return "ACTIVE";
  return "PARTIALLY_PAID";
}

// A write-off only books an expense when that's the first time the loss hits
// the budget: money you lent, where lending it booked nothing ("track only").
// Otherwise the amount was already counted when the loan was created.
export function offersWriteOffExpense(loan: { type: string; transactionId: string | null }): boolean {
  return loan.type === "GIVEN" && loan.transactionId === null;
}

export interface LoanBalance {
  principalAmount: number;
  remainingAmount: number;
}

interface Entry {
  kind: LoanEntryKind;
  amount: number;
}

export function applyLoanEntry(b: LoanBalance, e: Entry): LoanBalance | { error: string } {
  if (!Number.isInteger(e.amount) || e.amount <= 0) return { error: "Amount must be greater than zero" };
  if (e.kind === "TOP_UP") {
    return { principalAmount: b.principalAmount + e.amount, remainingAmount: b.remainingAmount + e.amount };
  }
  if (e.amount > b.remainingAmount) return { error: "That's more than what's left on this loan" };
  return { principalAmount: b.principalAmount, remainingAmount: b.remainingAmount - e.amount };
}

export function reverseLoanEntry(b: LoanBalance, e: Entry): LoanBalance | { error: string } {
  if (e.kind === "TOP_UP") {
    if (b.remainingAmount - e.amount < 0) {
      return { error: "Can't remove this - more than that has already been repaid or written off" };
    }
    return { principalAmount: b.principalAmount - e.amount, remainingAmount: b.remainingAmount - e.amount };
  }
  return { principalAmount: b.principalAmount, remainingAmount: Math.min(b.principalAmount, b.remainingAmount + e.amount) };
}

export function normalizePersonName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
```

- [ ] **Step 4: Run to see them pass**

Run: `pnpm exec vitest run src/lib/loans/balance.test.ts`
Expected: PASS.

- [ ] **Step 5: Point `payments.ts` at the shared helper**

In `apps/web/src/lib/loans/payments.ts`: delete the local `export function loanStatusFor(...) { … }` block and add to the imports:

```ts
import { loanStatusFor } from "@/lib/loans/balance";
```

Run: `pnpm exec tsc --noEmit`
Expected: no errors (the two existing calls keep working; the third parameter is optional).

- [ ] **Step 6: Commit**

```bash
git add src/lib/loans/balance.ts src/lib/loans/balance.test.ts src/lib/loans/payments.ts
git commit -m "feat(web): loan balance and status rules with write-offs"
```

### Task 8: Loan DB layer, actions, API, and closed-loan filters

**Files:**
- Create: `apps/web/src/lib/loans/entries.ts`
- Modify: `apps/web/src/lib/loans/payments.ts` (`updateLoanPaymentCore`, `deleteLoanPaymentCore`)
- Modify: `apps/web/src/actions/loans.ts` (`getLoans`, `recordPayment`, `markLoanPaid`, `getLoanSummary`; add `addToLoan`, `writeOffLoan`)
- Modify: `apps/web/src/app/api/v1/loans/route.ts` (GET)
- Modify: `apps/web/src/app/api/v1/loans/[id]/payments/route.ts` (POST)
- Create: `apps/web/src/app/api/v1/loans/[id]/top-ups/route.ts`
- Create: `apps/web/src/app/api/v1/loans/[id]/write-off/route.ts`
- Modify: `apps/web/src/lib/cashflow/data-loader.ts`, `apps/web/src/lib/financial-position.ts`, `apps/web/src/app/api/cron/daily/route.ts`

**Interfaces:**
- Consumes: Task 7 helpers.
- Produces:
  - `interface LoanEntryInput { amountPaisas: number; date: string; notes?: string; budgetMonth?: number; budgetYear?: number }`
  - `addToLoanCore(userId: string, loanId: string, data: LoanEntryInput & { skipTransaction?: boolean }, openPeriod: { month: number; year: number }): Promise<{ error?: string }>`
  - `writeOffLoanCore(userId: string, loanId: string, data: LoanEntryInput & { bookExpense?: boolean }, openPeriod: { month: number; year: number }): Promise<{ error?: string }>`
  - Actions (rupees in): `addToLoan(loanId, { amount, date, notes?, skipTransaction?, budgetMonth?, budgetYear? })`, `writeOffLoan(loanId, { amount, date, notes?, bookExpense?, budgetMonth?, budgetYear? })`.
  - API: `POST /api/v1/loans/[id]/top-ups` body `{ amountPaisas, date, notes?, skipTransaction?, budgetMonth?, budgetYear? }`; `POST /api/v1/loans/[id]/write-off` body `{ amountPaisas, date, notes?, bookExpense?, budgetMonth?, budgetYear? }`; GET `/api/v1/loans` payments gain `kind`, loans gain `offersWriteOffExpense`.

- [ ] **Step 1: DB layer for top-ups and write-offs**

`apps/web/src/lib/loans/entries.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { toLocalDate } from "@/lib/utils";
import { ensureCategory } from "@/lib/default-categories";
import { applyLoanEntry, isLoanClosed, loanStatusFor, offersWriteOffExpense } from "@/lib/loans/balance";

// "Add to loan" and write-off, shared by the web actions and the v1 routes.

export interface LoanEntryInput {
  amountPaisas: number;
  date: string;
  notes?: string;
  // Optional budget-period override. When omitted, openPeriod is used.
  budgetMonth?: number;
  budgetYear?: number;
}

type Period = { month: number; year: number };

function resolvePeriod(data: LoanEntryInput, openPeriod: Period): Period {
  return data.budgetMonth && data.budgetYear ? { month: data.budgetMonth, year: data.budgetYear } : openPeriod;
}

// Lend or borrow more with the same person. Raises principal and remaining,
// reopens a closed loan, and books the same optional entry as creating a loan.
export async function addToLoanCore(
  userId: string,
  loanId: string,
  data: LoanEntryInput & { skipTransaction?: boolean },
  openPeriod: Period,
): Promise<{ error?: string }> {
  const loan = await prisma.loan.findFirst({ where: { id: loanId, userId } });
  if (!loan) return { error: "Loan not found" };

  const next = applyLoanEntry(loan, { kind: "TOP_UP", amount: data.amountPaisas });
  if ("error" in next) return next;

  const period = resolvePeriod(data, openPeriod);
  const date = toLocalDate(data.date);
  const isGiven = loan.type === "GIVEN";
  const hasWriteOff = (await prisma.loanPayment.count({ where: { loanId, kind: "WRITE_OFF" } })) > 0;

  await prisma.$transaction(async (tx) => {
    let transactionId: string | null = null;
    if (!data.skipTransaction) {
      const categoryId = await ensureCategory(tx, userId, "Loan");
      const created = await tx.transaction.create({
        data: {
          amount: data.amountPaisas,
          type: isGiven ? "EXPENSE" : "INCOME",
          categoryId,
          description: isGiven ? `Loan to ${loan.personName}` : `Loan from ${loan.personName}`,
          notes: data.notes ?? null,
          date,
          budgetMonth: period.month,
          budgetYear: period.year,
          fundingSource: "INCOME",
          tags: "loan",
          userId,
        },
      });
      transactionId = created.id;
    }
    await tx.loanPayment.create({
      data: { loanId, kind: "TOP_UP", amount: data.amountPaisas, date, notes: data.notes ?? null, transactionId },
    });
    await tx.loan.update({
      where: { id: loanId },
      data: {
        principalAmount: next.principalAmount,
        remainingAmount: next.remainingAmount,
        status: loanStatusFor(next.remainingAmount, next.principalAmount, hasWriteOff),
      },
    });
  });
  return {};
}

// Forgive part or all of what's left. Books an expense only when
// offersWriteOffExpense says it's the first time the loss hits the budget.
export async function writeOffLoanCore(
  userId: string,
  loanId: string,
  data: LoanEntryInput & { bookExpense?: boolean },
  openPeriod: Period,
): Promise<{ error?: string }> {
  const loan = await prisma.loan.findFirst({ where: { id: loanId, userId } });
  if (!loan) return { error: "Loan not found" };
  if (isLoanClosed(loan.status)) return { error: "This loan is already closed" };

  const next = applyLoanEntry(loan, { kind: "WRITE_OFF", amount: data.amountPaisas });
  if ("error" in next) return next;

  const period = resolvePeriod(data, openPeriod);
  const date = toLocalDate(data.date);
  const book = !!data.bookExpense && offersWriteOffExpense(loan);

  await prisma.$transaction(async (tx) => {
    let transactionId: string | null = null;
    if (book) {
      const categoryId = await ensureCategory(tx, userId, "Loan");
      const created = await tx.transaction.create({
        data: {
          amount: data.amountPaisas,
          type: "EXPENSE",
          categoryId,
          description: `Written off: ${loan.personName}`,
          notes: data.notes ?? null,
          date,
          budgetMonth: period.month,
          budgetYear: period.year,
          fundingSource: "INCOME",
          tags: "loan",
          userId,
        },
      });
      transactionId = created.id;
    }
    await tx.loanPayment.create({
      data: { loanId, kind: "WRITE_OFF", amount: data.amountPaisas, date, notes: data.notes ?? null, transactionId },
    });
    await tx.loan.update({
      where: { id: loanId },
      data: {
        remainingAmount: next.remainingAmount,
        status: loanStatusFor(next.remainingAmount, next.principalAmount, true),
      },
    });
  });
  return {};
}
```

- [ ] **Step 2: Make edit/delete kind-aware**

In `apps/web/src/lib/loans/payments.ts`:

Change the balance import to:

```ts
import { loanStatusFor, reverseLoanEntry, type LoanEntryKind } from "@/lib/loans/balance";
```

In `updateLoanPaymentCore`, right after `if (!payment) return { error: "Payment not found" };`, add:

```ts
  if (payment.kind !== "PAYMENT") {
    return { error: "Only repayments can be edited - delete this entry and add it again instead." };
  }
```

and change its `status:` line to:

```ts
      data: {
        remainingAmount: newRemaining,
        status: loanStatusFor(newRemaining, loan.principalAmount, (await tx.loanPayment.count({ where: { loanId: loan.id, kind: "WRITE_OFF" } })) > 0),
      },
```

Replace the body of `deleteLoanPaymentCore` from `const { loan, transaction } = payment;` to the end with:

```ts
  const { loan, transaction } = payment;
  const next = reverseLoanEntry(loan, { kind: payment.kind as LoanEntryKind, amount: payment.amount });
  if ("error" in next) return next;

  await prisma.$transaction(async (tx) => {
    if (transaction) {
      await reverseTransactionFunding(tx, transaction, { budgetMonth: transaction.budgetMonth, budgetYear: transaction.budgetYear });
    }
    await tx.loanPayment.delete({ where: { id: paymentId } });
    if (transaction) {
      await tx.transaction.delete({ where: { id: transaction.id } });
    }
    const hasWriteOff = (await tx.loanPayment.count({ where: { loanId: loan.id, kind: "WRITE_OFF" } })) > 0;
    await tx.loan.update({
      where: { id: loan.id },
      data: {
        principalAmount: next.principalAmount,
        remainingAmount: next.remainingAmount,
        status: loanStatusFor(next.remainingAmount, next.principalAmount, hasWriteOff),
      },
    });
  });

  return {};
```

- [ ] **Step 3: Web actions**

In `apps/web/src/actions/loans.ts` add imports:

```ts
import { addToLoanCore, writeOffLoanCore } from "@/lib/loans/entries";
import { CLOSED_LOAN_STATUSES, isLoanClosed, loanStatusFor } from "@/lib/loans/balance";
```

In `getLoans`, replace `if (filter && filter !== "ALL") where.status = filter;` with:

```ts
  if (filter === "PAID") where.status = { in: CLOSED_LOAN_STATUSES };
  else if (filter === "ACTIVE") where.status = { notIn: CLOSED_LOAN_STATUSES };
```

In `recordPayment`, after `if (!loan) return { success: false, error: "Loan not found" };` add:

```ts
    if (isLoanClosed(loan.status)) return { success: false, error: "This loan is already closed" };
```

and replace `const newStatus = newRemaining === 0 ? "PAID" : "PARTIALLY_PAID";` with:

```ts
    const hasWriteOff = (await prisma.loanPayment.count({ where: { loanId, kind: "WRITE_OFF" } })) > 0;
    const newStatus = loanStatusFor(newRemaining, loan.principalAmount, hasWriteOff);
```

In `markLoanPaid`, replace `data: { remainingAmount: 0, status: "PAID" },` with:

```ts
        data: {
          remainingAmount: 0,
          status: loanStatusFor(0, loan.principalAmount, (await prisma.loanPayment.count({ where: { loanId, kind: "WRITE_OFF" } })) > 0),
        },
```

(Compute that count before the `prisma.$transaction([...])` call into a `const hasWriteOff` and use it, since array-form transactions can't await inside.)

In `getLoanSummary`, change `status: { not: "PAID" }` to `status: { notIn: CLOSED_LOAN_STATUSES }`.

Append the two new actions:

```ts
function revalidateLoanPaths() {
  revalidatePath("/loans");
  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/dashboard");
}

async function openPeriodFor() {
  const user = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
  return {
    userId: user.id,
    period: getCurrentPeriod(user.currentBudgetMonth as number | null, user.currentBudgetYear as number | null),
  };
}

// Lend or borrow more with the same person - raises the loan instead of a new one.
export async function addToLoan(loanId: string, data: {
  amount: number; // rupees
  date: string;
  notes?: string;
  skipTransaction?: boolean;
  budgetMonth?: number;
  budgetYear?: number;
}): Promise<ActionResult> {
  try {
    const { userId, period } = await openPeriodFor();
    const result = await addToLoanCore(userId, loanId, { ...data, amountPaisas: toPaisas(data.amount) }, period);
    if (result.error) return { success: false, error: result.error };
    revalidateLoanPaths();
    return { success: true };
  } catch (e) {
    console.error("[addToLoan]", e);
    return { success: false, error: "Failed to add to loan" };
  }
}

// Write off (lent) / mark as forgiven (borrowed) part or all of what's left.
export async function writeOffLoan(loanId: string, data: {
  amount: number; // rupees
  date: string;
  notes?: string;
  bookExpense?: boolean;
  budgetMonth?: number;
  budgetYear?: number;
}): Promise<ActionResult> {
  try {
    const { userId, period } = await openPeriodFor();
    const result = await writeOffLoanCore(userId, loanId, { ...data, amountPaisas: toPaisas(data.amount) }, period);
    if (result.error) return { success: false, error: result.error };
    revalidateLoanPaths();
    return { success: true };
  } catch (e) {
    console.error("[writeOffLoan]", e);
    return { success: false, error: "Failed to write off loan" };
  }
}
```

- [ ] **Step 4: v1 loans GET**

In `apps/web/src/app/api/v1/loans/route.ts`, add the import:

```ts
import { offersWriteOffExpense } from "@/lib/loans/balance";
```

In the GET `select`, add `transactionId: true,` next to `notes: true,`, and change the payments select to:

```ts
          select: { id: true, kind: true, amount: true, date: true, notes: true, transactionId: true },
```

In the response map, add `offersWriteOffExpense: offersWriteOffExpense(l),` to each loan object (after `...l,`).

- [ ] **Step 5: v1 payments POST**

In `apps/web/src/app/api/v1/loans/[id]/payments/route.ts`, add the import `import { isLoanClosed, loanStatusFor } from "@/lib/loans/balance";`, replace

```ts
    if (loan.status === "PAID") return NextResponse.json({ error: "Loan already paid" }, { status: 422 });
```

with

```ts
    if (isLoanClosed(loan.status)) return NextResponse.json({ error: "This loan is already closed" }, { status: 422 });
```

and replace `const newStatus = newRemaining === 0 ? "PAID" : "PARTIALLY_PAID";` with:

```ts
    const hasWriteOff = (await prisma.loanPayment.count({ where: { loanId, kind: "WRITE_OFF" } })) > 0;
    const newStatus = loanStatusFor(newRemaining, loan.principalAmount, hasWriteOff);
```

- [ ] **Step 6: New v1 routes**

`apps/web/src/app/api/v1/loans/[id]/top-ups/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";
import { addToLoanCore } from "@/lib/loans/entries";

// ── POST /api/v1/loans/[id]/top-ups - lend/borrow more with the same person ──
const schema = z.object({
  amountPaisas: z.number().int().positive(),
  date: z.string().min(1),
  notes: z.string().max(1000).optional(),
  skipTransaction: z.boolean().optional(),
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const result = await addToLoanCore(auth.id, id, parsed.data, getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear));
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.error === "Loan not found" ? 404 : 422 });
    }
    return NextResponse.json({ data: { id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

`apps/web/src/app/api/v1/loans/[id]/write-off/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";
import { writeOffLoanCore } from "@/lib/loans/entries";

// ── POST /api/v1/loans/[id]/write-off - forgive part or all of what's left ──
// bookExpense is honoured only where offersWriteOffExpense allows it.
const schema = z.object({
  amountPaisas: z.number().int().positive(),
  date: z.string().min(1),
  notes: z.string().max(1000).optional(),
  bookExpense: z.boolean().optional(),
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const result = await writeOffLoanCore(auth.id, id, parsed.data, getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear));
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.error === "Loan not found" ? 404 : 422 });
    }
    return NextResponse.json({ data: { id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 7: Closed-loan filters everywhere**

- `src/lib/cashflow/data-loader.ts`: `loan: { status: { not: "PAID" } }` → `loan: { status: { notIn: CLOSED_LOAN_STATUSES } }`, importing `CLOSED_LOAN_STATUSES` from `@/lib/loans/balance`.
- `src/lib/financial-position.ts`: `status: { not: "PAID" }` → `status: { notIn: CLOSED_LOAN_STATUSES }` (same import).
- `src/app/api/cron/daily/route.ts`: `status: { not: "PAID" }` → `status: { notIn: CLOSED_LOAN_STATUSES }` (same import).

Then run: `grep -rn '"PAID"' src --include='*.ts' --include='*.tsx' | grep -iv "plan\|planned\|expense" `
Expected: every remaining loan-related hit is either inside `src/lib/loans/balance.ts`, a UI badge map, or a comparison replaced in Task 9 (web UI) / Task 10 (mobile). Fix any other loan filter that still uses `not: "PAID"` the same way.

- [ ] **Step 8: Typecheck, lint, test**

Run: `pnpm exec tsc --noEmit && pnpm run lint && pnpm test`
Expected: all pass.

- [ ] **Step 9: Smoke-test the API**

With a bearer token `T` and a GIVEN loan id `L` created track-only:

```bash
curl -s -H "Authorization: Bearer $T" -H 'content-type: application/json' -d '{"amountPaisas":500000,"date":"2026-09-30","skipTransaction":true}' http://localhost:3000/api/v1/loans/$L/top-ups
curl -s -H "Authorization: Bearer $T" http://localhost:3000/api/v1/loans | head -c 600
curl -s -H "Authorization: Bearer $T" -H 'content-type: application/json' -d '{"amountPaisas":999999999,"date":"2026-09-30"}' http://localhost:3000/api/v1/loans/$L/write-off
```

Expected: 201; the GET shows the loan's principal raised by 5,000, a payment with `"kind":"TOP_UP"`, and `"offersWriteOffExpense":true`; the oversized write-off returns `{"error":"That's more than what's left on this loan"}`.

- [ ] **Step 10: Commit**

```bash
git add src/lib/loans src/actions/loans.ts src/app/api/v1/loans src/lib/cashflow/data-loader.ts src/lib/financial-position.ts src/app/api/cron/daily/route.ts
git commit -m "feat(web): add to loan and write-off, closed loans leave forecasts"
```

### Task 9: Web loans screen

**Files:**
- Modify: `apps/web/src/components/loans/loans-client.tsx`

**Interfaces:**
- Consumes: `addToLoan`, `writeOffLoan` (Task 8); `isLoanClosed`, `offersWriteOffExpense`, `normalizePersonName` (Task 7); `BudgetPeriodOverride`, `monthYearFromDateStr`.

- [ ] **Step 1: Types, imports, state**

- In `interface LoanPayment` add `kind: string;`. In `interface Loan` add `transactionId: string | null;`.
- Add to `STATUS_BADGE`: `WRITTEN_OFF: "bg-muted text-muted-foreground",`.
- Import `addToLoan, writeOffLoan` from `@/actions/loans`, and `import { isLoanClosed, normalizePersonName, offersWriteOffExpense } from "@/lib/loans/balance";`. Add `PlusCircle, Ban` to the `lucide-react` import.
- Replace the two list filters with:

```ts
  const activeLoans = loans.filter((l) => !isLoanClosed(l.status));
  const closedLoans = loans.filter((l) => isLoanClosed(l.status));
```

and in the Tabs change `paidLoans` → `closedLoans`, the trigger label to `Closed ({closedLoans.length})`, and the tab value `"paid"` → `"closed"` (both trigger and content).

- Add state:

```ts
  const [entryDialog, setEntryDialog] = useState<{ loan: Loan; kind: "TOP_UP" | "WRITE_OFF" } | null>(null);
  const [entryForm, setEntryForm] = useState({ amount: "", date: format(new Date(), "yyyy-MM-dd"), notes: "", book: true, fileUnderDate: false });

  function openEntry(loan: Loan, kind: "TOP_UP" | "WRITE_OFF", prefill?: { amount?: string; date?: string }) {
    setEntryDialog({ loan, kind });
    setEntryForm({
      amount: prefill?.amount ?? (kind === "WRITE_OFF" ? String(loan.remainingAmount / 100) : ""),
      date: prefill?.date ?? format(new Date(), "yyyy-MM-dd"),
      notes: "",
      book: kind === "TOP_UP" ? true : offersWriteOffExpense(loan),
      fileUnderDate: false,
    });
  }

  // Same person + same direction + still open -> offer "Add to that loan instead".
  const duplicateLoan = form.personName.trim()
    ? loans.find((l) => !isLoanClosed(l.status) && l.type === form.type
        && normalizePersonName(l.personName) === normalizePersonName(form.personName))
    : undefined;
```

- [ ] **Step 2: Submit handler**

```ts
  async function handleEntry() {
    if (!entryDialog || !entryForm.amount) return;
    setLoading(true);
    const override = entryForm.fileUnderDate ? monthYearFromDateStr(entryForm.date) : null;
    const common = {
      amount: parseFloat(entryForm.amount),
      date: entryForm.date,
      notes: entryForm.notes || undefined,
      ...(override ? { budgetMonth: override.month, budgetYear: override.year } : {}),
    };
    const result = entryDialog.kind === "TOP_UP"
      ? await addToLoan(entryDialog.loan.id, { ...common, skipTransaction: !entryForm.book })
      : await writeOffLoan(entryDialog.loan.id, { ...common, bookExpense: entryForm.book });
    if (result.success) {
      toast.success(entryDialog.kind === "TOP_UP" ? "Added to loan" : entryDialog.loan.type === "GIVEN" ? "Written off" : "Marked as forgiven");
      setEntryDialog(null);
    } else toast.error(result.error ?? "Failed");
    setLoading(false);
  }
```

- [ ] **Step 3: Card actions**

In the loan card's right-hand action column, replace the `{loan.status !== "PAID" && (<> … </>)}` block with:

```tsx
              {!isLoanClosed(loan.status) && (
                <>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setPayOpen(loan.id)}>
                    Record Payment
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-emerald-600" onClick={() => handleMarkPaid(loan)}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />Mark Paid
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => openEntry(loan, "WRITE_OFF")}>
                    <Ban className="h-3.5 w-3.5 mr-1" />{isGiven ? "Write off" : "Mark as forgiven"}
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => openEntry(loan, "TOP_UP")}>
                <PlusCircle className="h-3.5 w-3.5 mr-1" />{isGiven ? "Lend more" : "Borrow more"}
              </Button>
```

Change the two other `loan.status !== "PAID"` checks in the card (progress bar, repayment plan) to `!isLoanClosed(loan.status)`.

- [ ] **Step 4: History rows by kind**

Replace the amount `<span>` in `loan.payments.map` with:

```tsx
                      <span className={cn("font-medium",
                        p.kind === "TOP_UP" ? "text-amber-600" : p.kind === "WRITE_OFF" ? "text-muted-foreground" : "text-emerald-600")}>
                        {p.kind === "TOP_UP" ? "Added +" : p.kind === "WRITE_OFF" ? (isGiven ? "Written off " : "Forgiven ") : "+"}{baseSymbol} {(p.amount / 100).toLocaleString()}
                      </span>
```

Show the edit pencil only for repayments: change `{p.transaction && (` to `{p.transaction && p.kind === "PAYMENT" && (`. Rename the section title "Payment History" to "History".

- [ ] **Step 5: Duplicate prompt in the create dialog**

In the create dialog, directly below the person-name `<Input …/>`'s wrapper, add:

```tsx
              {duplicateLoan && (
                <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs">
                  You already have an open loan {duplicateLoan.type === "GIVEN" ? "to" : "from"} {duplicateLoan.personName}
                  {" "}({baseSymbol} {(duplicateLoan.remainingAmount / 100).toLocaleString()} left).
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 ml-1 text-xs"
                    onClick={() => {
                      setCreateOpen(false);
                      openEntry(duplicateLoan, "TOP_UP", { amount: form.principalAmount, date: form.date });
                    }}
                  >
                    Add to that loan instead
                  </Button>
                </div>
              )}
```

- [ ] **Step 6: The entry dialog**

Add before the schedule dialog:

```tsx
      {/* Add to loan / write off */}
      <Dialog open={!!entryDialog} onOpenChange={(o) => !o && setEntryDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entryDialog?.kind === "TOP_UP"
                ? `${entryDialog.loan.type === "GIVEN" ? "Lend more to" : "Borrow more from"} ${entryDialog.loan.personName}`
                : `${entryDialog?.loan.type === "GIVEN" ? "Write off" : "Mark as forgiven"} - ${entryDialog?.loan.personName}`}
            </DialogTitle>
          </DialogHeader>
          {entryDialog && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Amount ({baseSymbol})</Label>
                <Input type="number" value={entryForm.amount} onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))} />
                {entryDialog.kind === "WRITE_OFF" && (
                  <p className="text-xs text-muted-foreground">
                    {baseSymbol} {(entryDialog.loan.remainingAmount / 100).toLocaleString()} left - lower it to write off only part.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={entryForm.date} onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea rows={2} value={entryForm.notes} onChange={(e) => setEntryForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              {entryDialog.kind === "TOP_UP" || offersWriteOffExpense(entryDialog.loan) ? (
                <>
                  <div className="flex items-start gap-2">
                    <Checkbox id="bookLoanEntry" checked={entryForm.book} onCheckedChange={(c) => setEntryForm((f) => ({ ...f, book: !!c }))} className="mt-0.5" />
                    <Label htmlFor="bookLoanEntry" className="cursor-pointer text-sm font-normal leading-snug">
                      Also record as {entryDialog.kind === "WRITE_OFF" || entryDialog.loan.type === "GIVEN" ? "an expense" : "income"}
                      <span className="block text-xs text-muted-foreground">Uncheck to track this without an entry in Expenses/Income</span>
                    </Label>
                  </div>
                  {entryForm.book && (
                    <BudgetPeriodOverride date={entryForm.date} checked={entryForm.fileUnderDate} onChange={(v) => setEntryForm((f) => ({ ...f, fileUnderDate: v }))} />
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Already counted when you created this loan. Nothing new is recorded in Expenses or Income.
                </p>
              )}
              <Button className="w-full" onClick={handleEntry} disabled={loading || !entryForm.amount}>
                {entryDialog.kind === "TOP_UP" ? "Add to loan" : entryDialog.loan.type === "GIVEN" ? "Write off" : "Mark as forgiven"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
```

- [ ] **Step 7: Typecheck, lint, build**

Run: `pnpm exec tsc --noEmit && pnpm run lint && pnpm run build`
Expected: all pass.

- [ ] **Step 8: Manual check**

On `/loans`: create a track-only loan to "Ahmed"; start a new loan to "ahmed " → prompt appears → "Add to that loan instead" opens the top-up dialog prefilled; submit → principal rises. Write off part → remaining drops; write off the rest with "Also record as an expense" → loan moves to Closed with a WRITTEN OFF badge and a "Written off: Ahmed" expense exists. Create a loan with the expense booked → Write off shows "Already counted…" and no checkbox. Delete the write-off row → loan reopens.

- [ ] **Step 9: Commit**

```bash
git add src/components/loans/loans-client.tsx
git commit -m "feat(web): add to loan, write off, and same-person prompt on the loans page"
```

### Task 10: Mobile loans

**Files:**
- Modify: `apps/mobile/lib/core/constants/api_constants.dart`
- Modify: `apps/mobile/lib/features/loans/domain/entities/loan_entity.dart`
- Modify: `apps/mobile/lib/features/loans/data/datasources/loans_datasource.dart`
- Create: `apps/mobile/lib/features/loans/presentation/pages/loan_entry_page.dart`
- Modify: `apps/mobile/lib/features/loans/presentation/pages/loans_page.dart`
- Modify: `apps/mobile/lib/features/loans/presentation/pages/quick_add_loan_page.dart`

**Interfaces:**
- Consumes: API from Task 8.
- Produces: `LoanPaymentEntity.kind`; `LoanEntity.offersWriteOffExpense`, `.isClosed`; `LoansDatasource.addToLoan({required String loanId, required int amountPaisas, required DateTime date, String? notes, int? budgetMonth, int? budgetYear, bool skipTransaction = false})`, `LoansDatasource.writeOff({required String loanId, required int amountPaisas, required DateTime date, String? notes, int? budgetMonth, int? budgetYear, bool bookExpense = false})`; `enum LoanEntryMode { topUp, writeOff }`; `LoanEntryPage({required LoanEntity loan, required LoanEntryMode mode, int? prefillPaisas, DateTime? prefillDate})`.

- [ ] **Step 1: API constants**

Add below `loanPayments`:

```dart
  static String loanTopUps(String loanId) => '/loans/$loanId/top-ups';
  static String loanWriteOff(String loanId) => '/loans/$loanId/write-off';
```

- [ ] **Step 2: Entities**

In `LoanPaymentEntity` add `this.kind = 'PAYMENT',` to the constructor, `final String kind; // PAYMENT | TOP_UP | WRITE_OFF` to the fields.

In `LoanEntity` add `this.offersWriteOffExpense = false,` to the constructor and:

```dart
  // True only for a lent loan created track-only - see the web balance rules.
  final bool offersWriteOffExpense;

  bool get isClosed => status == 'PAID' || status == 'WRITTEN_OFF';
```

and change the status comment to `// ACTIVE | PARTIALLY_PAID | PAID | WRITTEN_OFF`.

- [ ] **Step 3: Datasource**

Add to `LoansDatasource`:

```dart
  Future<void> addToLoan({
    required String loanId,
    required int amountPaisas,
    required DateTime date,
    String? notes,
    int? budgetMonth,
    int? budgetYear,
    bool skipTransaction = false,
  }) async {
    try {
      await _dio.post(ApiConstants.loanTopUps(loanId), data: {
        'amountPaisas': amountPaisas,
        'date': date.toIso8601String(),
        if (notes != null && notes.isNotEmpty) 'notes': notes,
        if (budgetMonth != null) 'budgetMonth': budgetMonth,
        if (budgetYear != null) 'budgetYear': budgetYear,
        if (skipTransaction) 'skipTransaction': true,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> writeOff({
    required String loanId,
    required int amountPaisas,
    required DateTime date,
    String? notes,
    int? budgetMonth,
    int? budgetYear,
    bool bookExpense = false,
  }) async {
    try {
      await _dio.post(ApiConstants.loanWriteOff(loanId), data: {
        'amountPaisas': amountPaisas,
        'date': date.toIso8601String(),
        if (notes != null && notes.isNotEmpty) 'notes': notes,
        if (budgetMonth != null) 'budgetMonth': budgetMonth,
        if (budgetYear != null) 'budgetYear': budgetYear,
        if (bookExpense) 'bookExpense': true,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }
```

In `_parse` add `offersWriteOffExpense: m['offersWriteOffExpense'] as bool? ?? false,`. In `_parsePayment` add `kind: m['kind'] as String? ?? 'PAYMENT',`.

- [ ] **Step 4: The entry page**

`apps/mobile/lib/features/loans/presentation/pages/loan_entry_page.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/book_transaction_field.dart';
import '../../../../core/widgets/budget_period_field.dart';
import '../../../../core/widgets/form_section.dart';
import '../../data/datasources/loans_datasource.dart';
import '../../domain/entities/loan_entity.dart';
import '../providers/loans_provider.dart';

enum LoanEntryMode { topUp, writeOff }

/// "Lend/borrow more" and "Write off / Mark as forgiven" for one loan.
class LoanEntryPage extends ConsumerStatefulWidget {
  const LoanEntryPage({required this.loan, required this.mode, this.prefillPaisas, this.prefillDate, super.key});
  final LoanEntity loan;
  final LoanEntryMode mode;
  final int? prefillPaisas;
  final DateTime? prefillDate;

  @override
  ConsumerState<LoanEntryPage> createState() => _LoanEntryPageState();
}

class _LoanEntryPageState extends ConsumerState<LoanEntryPage> {
  late final TextEditingController _amountCtrl;
  final _notesCtrl = TextEditingController();
  late DateTime _date = widget.prefillDate ?? DateTime.now();
  bool _fileUnderDateBudget = false;
  late bool _book = widget.mode == LoanEntryMode.topUp || widget.loan.offersWriteOffExpense;
  bool _loading = false;

  bool get _isTopUp => widget.mode == LoanEntryMode.topUp;
  bool get _isGiven => widget.loan.type == 'GIVEN';
  // Write-offs only offer an entry where it isn't already counted.
  bool get _offersEntry => _isTopUp || widget.loan.offersWriteOffExpense;

  String get _title => _isTopUp
      ? (_isGiven ? 'Lend more' : 'Borrow more')
      : (_isGiven ? 'Write off' : 'Mark as forgiven');

  @override
  void initState() {
    super.initState();
    final prefill = widget.prefillPaisas ?? (_isTopUp ? null : widget.loan.remainingPaisas);
    _amountCtrl = TextEditingController(
      text: prefill == null ? '' : (prefill % 100 == 0 ? '${prefill ~/ 100}' : (prefill / 100).toStringAsFixed(2)),
    );
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  int? get _amountPaisas {
    final v = double.tryParse(_amountCtrl.text.trim());
    if (v == null || v <= 0) return null;
    return (v * 100).round();
  }

  bool get _canSubmit {
    final p = _amountPaisas;
    if (p == null) return false;
    return _isTopUp || p <= widget.loan.remainingPaisas;
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    final paisas = _amountPaisas;
    if (paisas == null) return;
    HapticFeedback.mediumImpact();
    setState(() => _loading = true);
    final ds = ref.read(loansDatasourceProvider);
    final notes = _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null;
    final month = _book && _fileUnderDateBudget ? _date.month : null;
    final year = _book && _fileUnderDateBudget ? _date.year : null;
    try {
      if (_isTopUp) {
        await ds.addToLoan(
          loanId: widget.loan.id, amountPaisas: paisas, date: _date, notes: notes,
          budgetMonth: month, budgetYear: year, skipTransaction: !_book,
        );
      } else {
        await ds.writeOff(
          loanId: widget.loan.id, amountPaisas: paisas, date: _date, notes: notes,
          budgetMonth: month, budgetYear: year, bookExpense: _offersEntry && _book,
        );
      }
      if (!mounted) return;
      ref.invalidate(loansProvider);
      ref.read(toastServiceProvider).success(context, _isTopUp ? 'Added to loan' : (_isGiven ? 'Written off' : 'Marked as forgiven'));
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text('$_title - ${widget.loan.personName}', style: AppTextStyles.headlineSmall),
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.foreground),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          TextButton(
            onPressed: _canSubmit && !_loading ? _submit : null,
            child: Text('Save',
                style: AppTextStyles.labelLarge.copyWith(
                  color: _canSubmit ? AppColors.primary : AppColors.mutedForeground,
                  fontWeight: FontWeight.w600,
                )),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${widget.loan.remainingPaisas.formatPKR()} left of ${widget.loan.principalPaisas.formatPKR()}',
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
            ),
            const SizedBox(height: 12),
            AppTextField(
              controller: _amountCtrl,
              hint: '0',
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => setState(() {}),
            ),
            if (!_isTopUp) ...[
              const SizedBox(height: 6),
              Text('Lower it to write off only part.', style: AppTextStyles.bodySmall),
            ],
            const SizedBox(height: 16),
            FormSection(
              title: 'When',
              children: [
                GestureDetector(
                  onTap: _pickDate,
                  child: Text(DateFormat('EEE, d MMM y').format(_date), style: AppTextStyles.bodyMedium),
                ),
                if (_offersEntry && _book)
                  BudgetPeriodField(
                    date: _date,
                    checked: _fileUnderDateBudget,
                    onChanged: (v) => setState(() => _fileUnderDateBudget = v),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            if (_offersEntry)
              BookTransactionField(
                label: (!_isTopUp || _isGiven) ? 'an expense' : 'income',
                checked: _book,
                onChanged: (v) => setState(() => _book = v),
              )
            else
              Text(
                'Already counted when you created this loan. Nothing new is recorded in Expenses or Income.',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
              ),
            const SizedBox(height: 16),
            AppTextField(controller: _notesCtrl, hint: 'Notes (optional)'),
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 5: Loans page**

In `loans_page.dart`:
- Import `loan_entry_page.dart`.
- Add to `LoansPage`:

```dart
  void _showEntry(BuildContext context, LoanEntity loan, LoanEntryMode mode) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => LoanEntryPage(loan: loan, mode: mode),
      ),
    );
  }
```

- In both `_LoanCard(...)` constructions replace every `l.status != 'PAID'` with `!l.isClosed`, and add:

```dart
                                onAddMore: () => _showEntry(context, l, LoanEntryMode.topUp),
                                onWriteOff: !l.isClosed ? () => _showEntry(context, l, LoanEntryMode.writeOff) : null,
```

- In `_LoanCard` add fields `final VoidCallback? onAddMore;` and `final VoidCallback? onWriteOff;` with matching optional constructor params.
- Replace `_badgeVariant` and the badge label with:

```dart
  AppBadgeVariant get _badgeVariant => switch (loan.status) {
        'ACTIVE' => AppBadgeVariant.warning,
        'PARTIALLY_PAID' => AppBadgeVariant.primary,
        'WRITTEN_OFF' => AppBadgeVariant.neutral,
        _ => AppBadgeVariant.success,
      };

  String get _badgeLabel => switch (loan.status) {
        'ACTIVE' => 'Active',
        'PARTIALLY_PAID' => 'Partial',
        'WRITTEN_OFF' => loan.type == 'GIVEN' ? 'Written off' : 'Forgiven',
        _ => 'Paid',
      };
```

  and use `label: _badgeLabel`.
- Change `if (loan.status != 'PAID') ...[` (repayment plan) to `if (!loan.isClosed) ...[`.
- Rename the "RECENT PAYMENTS" heading to "HISTORY". In each history row, replace the amount `Text` with:

```dart
                            Text(
                              switch (p.kind) {
                                'TOP_UP' => '+${p.amountPaisas.formatPKR()} added',
                                'WRITE_OFF' => '${p.amountPaisas.formatPKR()} ${loan.type == 'GIVEN' ? 'written off' : 'forgiven'}',
                                _ => p.amountPaisas.formatPKR(),
                              },
                              style: AppTextStyles.labelMedium.copyWith(
                                color: switch (p.kind) {
                                  'TOP_UP' => const Color(0xFFE67E22),
                                  'WRITE_OFF' => AppColors.mutedForeground,
                                  _ => const Color(0xFF4CAF50),
                                },
                              ),
                            ),
```

  and change `if (p.hasTransaction && onEditPayment != null)` to `if (p.kind == 'PAYMENT' && p.hasTransaction && onEditPayment != null)`.
- Below the "Record Payment" button block, add a row of two text buttons:

```dart
            const SizedBox(height: 6),
            Row(
              children: [
                if (onAddMore != null)
                  TextButton.icon(
                    onPressed: onAddMore,
                    icon: const Icon(Icons.add_circle_outline, size: 15, color: AppColors.primary),
                    label: Text(loan.type == 'GIVEN' ? 'Lend more' : 'Borrow more',
                        style: AppTextStyles.labelMedium.copyWith(color: AppColors.primary)),
                  ),
                const Spacer(),
                if (onWriteOff != null)
                  TextButton.icon(
                    onPressed: onWriteOff,
                    icon: const Icon(Icons.block, size: 15, color: AppColors.mutedForeground),
                    label: Text(loan.type == 'GIVEN' ? 'Write off' : 'Mark as forgiven',
                        style: AppTextStyles.labelMedium.copyWith(color: AppColors.mutedForeground)),
                  ),
              ],
            ),
```

  Place it outside the `if (onPay != null)` block so closed loans still show "Lend/Borrow more".

- [ ] **Step 6: Same-person prompt on Quick Add Loan**

In `quick_add_loan_page.dart`, import `../../domain/entities/loan_entity.dart` and `loan_entry_page.dart`, and add:

```dart
  String _norm(String s) => s.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();

  LoanEntity? _findOpenLoanForSamePerson() {
    final loans = ref.read(loansProvider).valueOrNull ?? const <LoanEntity>[];
    final name = _norm(_nameCtrl.text);
    for (final l in loans) {
      if (!l.isClosed && l.type == _type && _norm(l.personName) == name) return l;
    }
    return null;
  }
```

At the start of `_submit`, after the null checks, add:

```dart
    final existing = _findOpenLoanForSamePerson();
    if (existing != null) {
      final addInstead = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.card,
          title: const Text('Add to the existing loan?', style: AppTextStyles.headlineSmall),
          content: Text(
            'You already have an open loan ${existing.type == 'GIVEN' ? 'to' : 'from'} ${existing.personName} '
            '(${existing.remainingPaisas.formatPKR()} left).',
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Create separate loan')),
            TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Add to it')),
          ],
        ),
      );
      if (!mounted || addInstead == null) return;
      if (addInstead) {
        await Navigator.of(context).push(MaterialPageRoute(
          fullscreenDialog: true,
          builder: (_) => LoanEntryPage(loan: existing, mode: LoanEntryMode.topUp, prefillPaisas: paisas, prefillDate: _date),
        ));
        if (mounted) _close();
        return;
      }
    }
```

Also add `import '../../../../core/extensions/currency_ext.dart';` and `import '../../../../core/extensions/async_value_ext.dart';` (for `valueOrNull`) if not present, and ensure the page reads `loansProvider` once on open so `valueOrNull` has data: in `initState` add `ref.read(loansProvider);` inside the existing post-frame callback.

- [ ] **Step 7: Codegen, analyze, test**

Run: `fvm dart run build_runner build --delete-conflicting-outputs && fvm flutter analyze && fvm flutter test`
Expected: codegen succeeds; only the pre-existing plugin warning; tests pass.

- [ ] **Step 8: Commit**

```bash
git add lib/core/constants/api_constants.dart lib/features/loans
git commit -m "feat(mobile): add to loan, write off, and same-person prompt"
```

---

## Part C - Expenses summary

### Task 11: "Available" on web and income total in the API

**Files:**
- Modify: `apps/web/src/components/expenses/expenses-client.tsx`
- Modify: `apps/web/src/app/api/v1/expenses/funding-context/route.ts`

**Interfaces:**
- Produces: funding-context response gains `monthlyIncomePaisas` (total income filed under the period). This is additive; the spec said "no API changes" for C, but the mobile Income strip needs the period's income total and no endpoint returns it for a budget period.

- [ ] **Step 1: Web card**

In `expenses-client.tsx`, destructure `monthlyIncomeAvailable` from props if it isn't already, change the summary grid's class to `grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border`, and add a fourth cell after the Under/Over cell:

```tsx
          <div className="bg-card px-5 py-4">
            <p className={cn("text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5",
              monthlyIncomeAvailable >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              Available
            </p>
            <div className={cn("text-xl font-bold tabnum",
              monthlyIncomeAvailable >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              {baseSymbol} {fmt(Math.abs(monthlyIncomeAvailable))}
            </div>
            {monthlyIncomeAvailable < 0 && <div className="text-xs text-red-500 mt-0.5">over-allocated</div>}
          </div>
```

Confirm `src/app/(app)/expenses/page.tsx` passes `monthlyIncomeAvailable` (it is already a required prop); if the page passes it under another name, wire it through.

- [ ] **Step 2: API income total**

In `funding-context/route.ts`, after `const ctx = await getFundingContextForMonth(auth.id, month, year);` add:

```ts
    const income = await prisma.transaction.aggregate({
      where: { userId: auth.id, type: "INCOME", budgetMonth: month, budgetYear: year },
      _sum: { amount: true },
    });
```

and add `monthlyIncomePaisas: income._sum.amount ?? 0,` to the `data` object next to `monthlyIncomeAvailablePaisas`.

- [ ] **Step 3: Typecheck, lint, build**

Run: `pnpm exec tsc --noEmit && pnpm run lint && pnpm run build`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/expenses/expenses-client.tsx src/app/api/v1/expenses/funding-context/route.ts
git commit -m "feat(web): show available income on the expenses page"
```

### Task 12: Mobile summary strips

**Files:**
- Create: `apps/mobile/lib/core/widgets/app_summary_strip.dart`
- Test: `apps/mobile/test/app_summary_strip_test.dart`
- Modify: `apps/mobile/lib/core/providers/funding_context_entity.dart`, `apps/mobile/lib/core/providers/funding_context_datasource.dart`
- Modify: `apps/mobile/lib/features/expenses/presentation/pages/expenses_list_page.dart`
- Modify: `apps/mobile/lib/features/income/presentation/pages/income_list_page.dart`
- Modify: `apps/mobile/lib/features/expenses/presentation/pages/quick_add_expense_page.dart`, `apps/mobile/lib/features/income/presentation/pages/quick_add_income_page.dart`

**Interfaces:**
- Consumes: `budgetProvider` (`lib/features/budget/presentation/providers/budget_provider.dart`), `fundingContextProvider(null, null)`.
- Produces: `AppSummaryStrip({required List<AppSummaryItem> items})`, `AppSummaryItem({required String label, required String value, AppSummaryTone tone = AppSummaryTone.neutral, String? caption})`, `enum AppSummaryTone { neutral, positive, negative, muted }`; `FundingContextEntity.monthlyIncomePaisas`.

- [ ] **Step 1: Write the failing widget test**

`apps/mobile/test/app_summary_strip_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:align/core/theme/app_colors.dart';
import 'package:align/core/widgets/app_summary_strip.dart';

Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

Color? _colorOf(WidgetTester tester, String text) => tester.widget<Text>(find.text(text)).style?.color;

void main() {
  testWidgets('shows a dash when there is no budget', (tester) async {
    await tester.pumpWidget(_wrap(const AppSummaryStrip(items: [
      AppSummaryItem(label: 'Budget', value: '–', tone: AppSummaryTone.muted),
    ])));
    expect(find.text('BUDGET'), findsOneWidget);
    expect(_colorOf(tester, '–'), AppColors.mutedForeground);
  });

  testWidgets('under budget is green', (tester) async {
    await tester.pumpWidget(_wrap(const AppSummaryStrip(items: [
      AppSummaryItem(label: 'Under', value: 'Rs 5,000', tone: AppSummaryTone.positive),
    ])));
    expect(_colorOf(tester, 'Rs 5,000'), AppColors.success);
  });

  testWidgets('over budget is red with a caption', (tester) async {
    await tester.pumpWidget(_wrap(const AppSummaryStrip(items: [
      AppSummaryItem(label: 'Over', value: 'Rs 1,200', tone: AppSummaryTone.negative, caption: 'over budget'),
    ])));
    expect(_colorOf(tester, 'Rs 1,200'), AppColors.destructive);
    expect(find.text('over budget'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run to see it fail**

Run: `fvm flutter test test/app_summary_strip_test.dart`
Expected: FAIL - `app_summary_strip.dart` not found.

- [ ] **Step 3: Implement the widget**

`apps/mobile/lib/core/widgets/app_summary_strip.dart`:

```dart
import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'app_card.dart';

enum AppSummaryTone { neutral, positive, negative, muted }

class AppSummaryItem {
  const AppSummaryItem({required this.label, required this.value, this.tone = AppSummaryTone.neutral, this.caption});
  final String label;
  final String value;
  final AppSummaryTone tone;
  final String? caption;
}

/// A row of small labelled figures in one card - the mobile counterpart of the
/// web summary cards on the Expenses and Income pages.
class AppSummaryStrip extends StatelessWidget {
  const AppSummaryStrip({required this.items, super.key});
  final List<AppSummaryItem> items;

  Color _color(AppSummaryTone tone) => switch (tone) {
        AppSummaryTone.positive => AppColors.success,
        AppSummaryTone.negative => AppColors.destructive,
        AppSummaryTone.muted => AppColors.mutedForeground,
        AppSummaryTone.neutral => AppColors.foreground,
      };

  @override
  Widget build(BuildContext context) => AppCard(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Row(
          children: [
            for (final item in items)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.label.toUpperCase(),
                        style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground, letterSpacing: 0.5)),
                    const SizedBox(height: 4),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(item.value, style: AppTextStyles.currencySmall.copyWith(color: _color(item.tone))),
                    ),
                    if (item.caption != null)
                      Text(item.caption!, style: AppTextStyles.labelSmall.copyWith(color: _color(item.tone))),
                  ],
                ),
              ),
          ],
        ),
      );
}
```

- [ ] **Step 4: Run to see it pass**

Run: `fvm flutter test test/app_summary_strip_test.dart`
Expected: PASS (3 tests).

- [ ] **Step 5: Income total in the funding context**

In `funding_context_entity.dart`, change `FundingContextEntity` to:

```dart
class FundingContextEntity {
  const FundingContextEntity({required this.monthlyIncomeAvailablePaisas, required this.pots, this.monthlyIncomePaisas = 0});
  final int monthlyIncomeAvailablePaisas;
  // Total income filed under the period (for the Income tab summary).
  final int monthlyIncomePaisas;
  final List<FundingContextPot> pots;
}
```

In `funding_context_datasource.dart`, add `monthlyIncomePaisas: d['monthlyIncomePaisas'] as int? ?? 0,` to the returned entity.

- [ ] **Step 6: Expenses tab strip**

In `expenses_list_page.dart`, import:

```dart
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/async_value_ext.dart';
import '../../../../core/providers/funding_context_provider.dart';
import '../../../../core/widgets/app_summary_strip.dart';
import '../../../budget/presentation/providers/budget_provider.dart';
```

Add a private widget at the bottom of the file:

```dart
// Spent · Budget · Under/Over · Available for the open period.
class _ExpensesSummary extends ConsumerWidget {
  const _ExpensesSummary();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final budget = ref.watch(budgetProvider).valueOrNull;
    final funding = ref.watch(fundingContextProvider(null, null)).valueOrNull;
    if (budget == null || funding == null) return const SizedBox.shrink();
    final remaining = budget.remainingPaisas;
    final available = funding.monthlyIncomeAvailablePaisas;
    return AppSummaryStrip(items: [
      AppSummaryItem(label: 'Spent', value: budget.totalSpentPaisas.formatPKR(), tone: AppSummaryTone.negative),
      AppSummaryItem(
        label: 'Budget',
        value: budget.hasBudget ? budget.totalBudgetPaisas!.formatPKR() : '–',
        tone: budget.hasBudget ? AppSummaryTone.neutral : AppSummaryTone.muted,
      ),
      AppSummaryItem(
        label: remaining == null ? 'Remaining' : (remaining >= 0 ? 'Under' : 'Over'),
        value: remaining == null ? '–' : remaining.abs().formatPKR(),
        tone: remaining == null ? AppSummaryTone.muted : (remaining >= 0 ? AppSummaryTone.positive : AppSummaryTone.negative),
      ),
      AppSummaryItem(
        label: 'Available',
        value: available.abs().formatPKR(),
        tone: available >= 0 ? AppSummaryTone.positive : AppSummaryTone.negative,
        caption: available < 0 ? 'over-allocated' : null,
      ),
    ]);
  }
}
```

Insert it above `PlannedExpensesSection`: change that `SliverToBoxAdapter`'s child to

```dart
                child: Column(
                  children: [
                    _ExpensesSummary(),
                    SizedBox(height: 12),
                    PlannedExpensesSection(),
                  ],
                ),
```

(the surrounding `const` stays valid - both widgets have const constructors).

Change the `RefreshIndicator`'s `onRefresh` to refresh the figures too:

```dart
        onRefresh: () async {
          ref.invalidate(budgetProvider);
          ref.invalidate(fundingContextProvider);
          await ref.refresh(expensesListProvider.future);
        },
```

- [ ] **Step 7: Income tab strip**

In `income_list_page.dart`, add the same imports minus `budget_provider.dart`, and:

```dart
// Income this period · Available.
class _IncomeSummary extends ConsumerWidget {
  const _IncomeSummary();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final funding = ref.watch(fundingContextProvider(null, null)).valueOrNull;
    if (funding == null) return const SizedBox.shrink();
    final available = funding.monthlyIncomeAvailablePaisas;
    return AppSummaryStrip(items: [
      AppSummaryItem(label: 'Income this period', value: funding.monthlyIncomePaisas.formatPKR(), tone: AppSummaryTone.positive),
      AppSummaryItem(
        label: 'Available',
        value: available.abs().formatPKR(),
        tone: available >= 0 ? AppSummaryTone.positive : AppSummaryTone.negative,
        caption: available < 0 ? 'over-allocated' : null,
      ),
    ]);
  }
}
```

Place it above `RecurringIncomeSection()` the same way as Step 6, and change `onRefresh` to invalidate `fundingContextProvider` before refreshing `incomeListProvider.future`.

- [ ] **Step 8: Refresh after adding**

In `quick_add_expense_page.dart`, after `ref.invalidate(expensesListProvider);` add:

```dart
      ref.invalidate(budgetProvider);
      ref.invalidate(fundingContextProvider);
```

(importing `budget_provider.dart` and `funding_context_provider.dart`). In `quick_add_income_page.dart`, after `ref.invalidate(incomeListProvider);` add `ref.invalidate(fundingContextProvider);` (import it).

- [ ] **Step 9: Analyze and test**

Run: `fvm flutter analyze && fvm flutter test`
Expected: only the pre-existing plugin warning; all tests pass.

- [ ] **Step 10: Commit**

```bash
git add lib/core lib/features/expenses lib/features/income test/app_summary_strip_test.dart
git commit -m "feat(mobile): spent/budget/available summary on Expenses and Income tabs"
```

---

## Part D - Docs and final check

### Task 13: Update the docs

**Files:**
- Modify: `README.md`, `ARCHITECTURE.md`, `HANDOFF.md`, `apps/web/README.md`, `apps/mobile/README.md`

- [ ] **Step 1: Root README** - in "What it does", change the investments/loans bullet to:

```markdown
- Investments with deposits and withdrawals (each optionally booked as an expense or income) and loans you can top up, repay, or write off (settling a loan logs the expense for you, with repayment schedules and a forward cash-flow projection)
```

- [ ] **Step 2: ARCHITECTURE** - under "The money rules", add two bullets after the pots bullet:

```markdown
- Investments track what you put in and what they're worth. Adding money raises both; withdrawing lowers only the current value, and gain counts what was taken out (current + withdrawn − invested). Either can book an expense/income entry, or not.
- A loan's history holds repayments, top-ups ("Add to loan"), and write-offs. A write-off books an expense only for money lent "track only" - otherwise the loss was already counted when the loan was created. `PAID` and `WRITTEN_OFF` loans are closed and drop out of forecasts and reminders.
```

- [ ] **Step 3: Web README** - in the features table, replace the Investments and Loans rows with:

```markdown
| **Investments** | Portfolio tracker with a target-allocation plan; add money or withdraw any time, each optionally booked as an expense (from income) or income ("Investment Returns"); gain counts withdrawals; "Update value" only marks to market |
| **Loans** | Track money lent/borrowed; repayment schedules (lump sum or fixed installments); lend/borrow more on the same loan; write off or mark as forgiven (in part or in full); every entry can book an income/expense entry or be tracked only; starting a second loan with the same person offers to add to the first |
```

and under "Money Flow" add an `### Investments` subsection with the same rules as the ARCHITECTURE bullet, plus in `### Expenses` a line: "The Expenses page shows This month, Budget, Under/Over, and Available (income left after income-funded expenses and pot deposits)."

- [ ] **Step 4: Mobile README** - in the screens table, update:

```markdown
| Money → Expenses tab | Summary strip (Spent · Budget · Under/Over · Available), then planned expenses and the paginated current-period list |
| Money → Income tab | Summary strip (Income this period · Available), recurring income, then the current-period list |
| Loans | Active and closed loans; history of payments, top-ups, and write-offs; Record Payment, Lend/Borrow more, Write off / Mark as forgiven (`LoanEntryPage`); repayment plans |
| Investments | Add money, Withdraw, Update value; history marks deposits (+) and withdrawals (−) and whether each booked an entry |
```

and add `loan_entry_page.dart` and `app_summary_strip.dart` to the project-structure tree next to their siblings.

- [ ] **Step 5: HANDOFF** - add a "What shipped" entry summarising Parts A-C in four bullets (investments fix + withdrawals, add to loan, write-off with the smart expense default, Available on expenses screens) and note under "Pending" that existing investments need one "Update value" each, because past top-ups never raised their current value.

- [ ] **Step 6: Leak guard and links**

Run the same `grep` as the "Scan for forbidden strings" step in `.github/workflows/guard.yml`, from the repo root, over the files changed on this branch.
Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add README.md ARCHITECTURE.md HANDOFF.md apps/web/README.md apps/mobile/README.md
git commit -m "docs: investments withdrawals, loan top-ups and write-offs, expenses summary"
```

### Task 14: Full verification

- [ ] **Step 1: Web** - from `apps/web`: `pnpm exec tsc --noEmit && pnpm run lint && pnpm test && pnpm run build`. Expected: all pass.
- [ ] **Step 2: Schema** - `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` → `-- This is an empty migration.`; on a fresh throwaway database (`docker exec align-db createdb -U align align_verify`, `DATABASE_URL=…/align_verify pnpm exec prisma migrate deploy`, same diff, then `dropdb --force`) the diff is also empty.
- [ ] **Step 3: Mobile** - from `apps/mobile`: `fvm flutter analyze && fvm flutter test`. Expected: only the pre-existing plugin warning; all tests pass.
- [ ] **Step 4: End-to-end on the emulator** - `fvm flutter run` against `http://10.0.2.2:3000`: withdraw from an investment, add to a loan via Quick Add's same-person prompt, write off a track-only lent loan with the expense on, and see the Expenses strip change after adding an expense.
