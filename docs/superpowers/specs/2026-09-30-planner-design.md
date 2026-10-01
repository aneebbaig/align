# Planner - design

Date: 2026-09-30 · Status: approved in discussion, pending spec review
Scope: web (`apps/web`, including `/api/v1`) **and** mobile (`apps/mobile`).

A standalone month-by-month money planner, modelled on a hand-made
spreadsheet: a table with one row per month, a column per regular money line,
a Goals column for one-off costs, and computed Net and Available Cash. It
replaces recalculating that spreadsheet by hand whenever something changes.

This is sub-project 1 of 2. Sub-project 2 (removing the old Cash-Flow Planner)
is recorded at the end and gets its own spec.

---

## Goals

- One planner per user. It has its own numbers and **never reads or writes**
  real income, expenses, pots, loans, or investments.
- Changing one input (a line's amount from some month on, a one-month change,
  a goal's month or amount, the USD rate, the starting cash) recomputes every
  later month automatically.
- Fully editable on web and mobile, laid out as a table on both.

## Concepts

| Term | Meaning |
|---|---|
| **Settings** | Start month, length in months, starting cash, USD rate. |
| **Line** | A named regular money flow: money **in** or **out**, entered in **PKR** or **USD**. User-defined, ordered. |
| **Step** | "From month M onward, this line is amount A." A line has any number of steps. |
| **Override** | "In month M only, this line is amount A." Wins over steps for that month. |
| **Goal** | A one-off cost in a single month (name, amount, optional note such as "reserved" or "spent"). Several per month allowed. |
| **Net** | Money in − money out for a month, before goals. |
| **Available** | Running balance: previous Available (or starting cash) + Net − that month's goals. |

## Data

Months are stored as a single integer **month key** = `year * 12 + (month - 1)`
(e.g. Sep 2026 = 2026×12+8 = 24320). This makes ranges and "latest step at or
before" plain integer comparisons. The API and UI convert to/from
`{ month, year }`.

Amounts are non-negative integers in the smallest unit of their currency
(paisas for PKR, cents for USD); the line's direction gives the sign.

```prisma
// One per user. Created lazily on first open with defaults.
model PlannerSettings {
  id             String   @id @default(cuid())
  userId         String   @unique
  startMonthKey  Int      // default: the current calendar month
  months         Int      @default(24) // 1..120
  startingCash   Int      @default(0) // paisas, may be negative
  usdRate        Float    // PKR per 1 USD; default copied once from the real USD currency rate (or 278 if none). The planner's own value afterwards.
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("planner_settings")
}

model PlannerLine {
  id        String   @id @default(cuid())
  userId    String
  name      String
  direction String   // "IN" | "OUT"
  currency  String   @default("PKR") // "PKR" | "USD"
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  steps     PlannerStep[]
  overrides PlannerOverride[]
  @@index([userId])
  @@map("planner_lines")
}

model PlannerStep {
  id       String @id @default(cuid())
  lineId   String
  monthKey Int
  amount   Int    // smallest unit of the line's currency, >= 0
  line PlannerLine @relation(fields: [lineId], references: [id], onDelete: Cascade)
  @@unique([lineId, monthKey])
  @@map("planner_steps")
}

model PlannerOverride {
  id       String @id @default(cuid())
  lineId   String
  monthKey Int
  amount   Int    // smallest unit of the line's currency, >= 0
  line PlannerLine @relation(fields: [lineId], references: [id], onDelete: Cascade)
  @@unique([lineId, monthKey])
  @@map("planner_overrides")
}

model PlannerGoal {
  id        String   @id @default(cuid())
  userId    String
  name      String
  monthKey  Int
  amount    Int      // paisas, > 0
  note      String?  // free text, e.g. "reserved", "spent"
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@map("planner_goals")
}
```

One hand-written migration creates all five tables. Steps, overrides, and goals
outside the current horizon are kept (the horizon can grow back to them).

## Rules - one pure function

`computePlannerTable(input) → PlannerRow[]` in `apps/web/src/lib/planner/compute.ts`,
unit-tested, no DB. Input: settings, lines (with steps and overrides), goals.

For each month key `k` from `startMonthKey` to `startMonthKey + months - 1`:

1. **Line amount (native)** = override at `k` if any; else the step with the
   greatest `monthKey <= k`; else 0.
2. **Line amount (PKR paisas)** = native for PKR lines;
   `Math.round(native * usdRate)` for USD lines (cents × PKR/USD = paisas).
3. **Signed** = +PKR for `IN`, −PKR for `OUT`.
4. **Net** = sum of signed line amounts.
5. **Goals** = goals at `k`, in `order`; **goalsTotal** = their sum.
6. **Available** = (previous row's Available, or `startingCash` for the first
   row) + Net − goalsTotal.

Each row returns: `monthKey`, `month`, `year`, per line
`{ lineId, native, pkr, isOverride }`, `goals`, `goalsTotal`, `net`,
`available`.

The table is always computed on read from the stored inputs; nothing computed
is stored, so it can never go stale.

**Reference check** (from the source spreadsheet): starting cash 0; "Base
Savings" IN steps Sep 2026: 90,000 · Oct 2026: 50,000 · Jan 2027: 30,000 ·
Jul 2027: 50,000; "Loan" OUT steps Sep 2026: 30,000 · Oct 2026: 20,000 ·
Nov 2026: 17,370; "Sister's Fee" OUT steps Oct 2026: 38,000 · Jan 2027: 0;
"Freelance" IN USD steps Jan 2027: $50, Feb: $100 … Jun 2027: $300,
Jul 2027: $350, Aug 2027: $400 (with override Sep 2027: $350), Oct 2027: $400,
Nov 2027: $450, Dec 2027: $500; rate 278; goal "Emergency Fund" 500,000 in
Jul 2027. Expected: Sep 2026 net 60,000 / available 60,000; Oct 2026 net
−8,000 / available 52,000; Jul 2027 net 129,930 / available 38,870. These
become unit tests.

## Editing operations

All user-scoped (a user only ever touches their own planner).

| Operation | Effect |
|---|---|
| Update settings | Any of start month, months (1..120), starting cash, USD rate (> 0). |
| Add line | name, direction, currency; appended at the end (`order = max + 1`), no steps. |
| Update line | name, direction, currency. Changing currency keeps the stored numbers (the user re-enters amounts if needed). |
| Reorder lines | Full ordered list of line ids. |
| Delete line | Removes it with its steps and overrides. |
| **Set cell "From this month on"** | Upsert step at `k`; delete any override at `k` (the new step value is what the user typed). |
| **Set cell "Just this month"** | Upsert override at `k`. |
| Remove override | Delete override at `k`; the month falls back to steps. |
| Add / update / delete goal | name, month, amount, note. |

Amounts are entered in rupees (or dollars for USD lines) with up to 2 decimals
and converted to paisas/cents; 0 is allowed (it ends a line from that month).

## API (`/api/v1/planner`, bearer auth)

| Method + path | Body | Returns |
|---|---|---|
| `GET /planner` | - | `{ settings, lines, goals, rows }` - `rows` is `computePlannerTable` output |
| `PATCH /planner/settings` | `{ startMonth?, startYear?, months?, startingCashPaisas?, usdRate? }` | `{ settings }` |
| `POST /planner/lines` | `{ name, direction, currency }` | `{ id }` |
| `PATCH /planner/lines/[id]` | `{ name?, direction?, currency? }` | `{ id }` |
| `DELETE /planner/lines/[id]` | - | `{ id }` |
| `PUT /planner/lines/order` | `{ ids: string[] }` | `{ ok: true }` |
| `PUT /planner/lines/[id]/cells` | `{ month, year, amount, scope: "FROM_HERE" \| "THIS_MONTH" }` (`amount` in smallest unit) | `{ ok: true }` |
| `DELETE /planner/lines/[id]/cells?month=&year=` | - (removes the override) | `{ ok: true }` |
| `POST /planner/goals` | `{ name, month, year, amountPaisas, note? }` | `{ id }` |
| `PATCH /planner/goals/[id]` | any of the above | `{ id }` |
| `DELETE /planner/goals/[id]` | - | `{ id }` |

Responses use the usual `{ data }` / `{ error }` shape. Writes are thin wrappers
over `apps/web/src/lib/planner/store.ts`, which the web server actions
(`apps/web/src/actions/planner.ts`) also use.

## Web UI

- New sidebar item **Planner** (Planning group) → `/planner`.
- Header: title, a summary line ("Starting cash Rs 0 · USD rate 278 ·
  Sep 2026 → Aug 2028 (24 months)"), buttons **Settings**, **+ Line**, **+ Goal**.
- Table: columns Month · one per line (in `order`) · Goals · Net · Available.
  Month is sticky on the left; the table scrolls horizontally.
  - Line cells: `-` for 0; USD lines show `97,300 ($350)`; OUT lines show
    negative numbers. A small dot marks an override.
  - Goals cell: each goal on its own line, `Name −amount` plus the note.
  - Net red when negative; Available red when negative; rows with goals get an
    amber tint (as in the source spreadsheet).
- **Click a line cell** → popover: amount input (prefilled with the current
  native value), buttons **Just this month** / **From this month on**, and
  **Remove override** when the cell has one.
- **Click a line header** → menu: rename, in/out, PKR/USD, move left/right, delete (confirm).
- **Click a Goals cell** → popover listing that month's goals with add/edit/delete.
- Settings dialog: start month, months, starting cash, USD rate.
- Empty state (no lines, no goals): short explanation + **Add your first line**.

## Mobile UI

- New feature slice `lib/features/planner/` (data/domain/presentation), route
  `/planner`, entry on the **More** page.
- Header card: summary line + ⚙ (settings sheet) + **Lines** (manage lines
  sheet: add, rename, in/out, PKR/USD, reorder, delete) + **+ Goal**.
- Table: pinned Month column on the left; the rest (line columns, Goals, Net,
  Available) scrolls horizontally together, rows scroll vertically. Same
  colouring as web.
- **Tap a line cell** → bottom sheet: amount, **Just this month** /
  **From this month on**, **Remove override** when applicable.
- **Tap a Goals cell** → sheet listing that month's goals with add/edit/delete.
- Uses `App*` widgets, `AppColors`, `AppTextStyles`; page mutations call the
  datasource directly with a local `_loading` flag, then invalidate the planner
  provider; the server returns the recomputed table.

## Testing

- Vitest for `computePlannerTable`: step lookup, override precedence, 0 ends a
  line, USD conversion and rounding, goals reduce Available, starting cash,
  negative Available, horizon boundaries (steps before the start apply;
  overrides/goals outside the horizon are ignored), and the reference check
  above.
- Vitest for the month-key helpers.
- Web: typecheck, lint, build; API smoke of each route against the local DB.
- Mobile: analyze, tests, and a widget test for the cell sheet's two scopes.

## Out of scope

- Multiple planners, scenarios, or copying a planner.
- Any link to real transactions (importing real income, "record this month").
- Exporting to PDF/CSV.
- Currencies other than PKR and USD in the planner.

---

## Sub-project 2 (separate spec, after this ships)

Remove the old Cash-Flow Planner entirely, in both apps:
- `RecurringIncome` (+ occurrences, "Record this month"), `PlannedExpense`
  ("Mark paid"), the dashboard cash-flow card, upcoming-due alerts, the
  `/api/v1/cashflow`, `/recurring-income`, `/planned-expenses` routes, and
  `src/lib/cashflow/`.
- Per-loan repayment plans (`LoanSchedule`, "Record installment", the
  schedule routes and mobile add-schedule page).
- Rework what depends on it: the investment suggestion's "obligations due"
  term, due-date notifications (fall back to each loan's `dueDate`), and user
  settings for the cash-flow horizon/lead time.
- A migration that drops the tables; real transactions booked through those
  features stay.
