# Align - Personal Finance Manager

A private finance app for a household of one or two users. Tracks expenses, budgets, savings and goals, investments, loans, tasks, projects, plans, a calendar, and a secret gift vault.

**Stack:** Next.js 16 · Prisma 7 · PostgreSQL (Neon) · better-auth · Tailwind CSS v4

---

## Features

| Feature | Description |
|---|---|
| **Dashboard** | Monthly summary, spending charts, budget progress, goals, today's tasks |
| **Expenses & Income** | Full transaction management with categories, tags, recurring; every expense must declare a funding source |
| **Budget** | Zero-based monthly budget with category allocations, savings plan, and email alerts |
| **Savings** | An Emergency Fund plus regular pots, each holding a balance per currency; a pot with a target amount (and optional deadline) is a savings goal; deposits require a declared source (income or pot transfer); spending from a pot creates an expense |
| **Investments** | Portfolio tracker with a target-allocation plan; add money or withdraw any time, each optionally booked as an expense (from income) or income ("Investment Returns"); gain counts withdrawals; "Update value" only marks to market |
| **Loans** | Track money lent/borrowed; repayment schedules (lump sum or fixed installments); lend/borrow more on the same loan; write off or mark as forgiven (in part or in full); every entry can book an income/expense entry or be tracked only; starting a second loan with the same person offers to add to the first |
| **Cash-Flow Planner** | Forward month-by-month projection from loan schedules, recurring income (salary/freelance floor), and planned one-off expenses; dashboard summary card with upcoming-due alerts and shortfall warnings |
| **Tasks** | Daily habits + one-time tasks with drag-to-reorder priority |
| **Work** | Freelance/client project management (`/projects`) - projects → sub-tasks with statuses, priorities, tags, and due dates; project notes and links; separate from personal tasks |
| **Plans** | Life event planning (house moves, trips, renovations) with itemised checklists |
| **Planner** | Month-by-month table: your own money lines (in/out, rupees or dollars at the planner's own rate) and one-off goals; change a month "just this month" or "from this month on" and every later month recalculates. Not linked to real income/expenses |
| **Wedding** | Dedicated wedding planner - events, vendors, and expenses per event |
| **Calendar** | Events, reminders, and deadlines |
| **Lists** | Needs (priority-grouped planned purchases with expense logging) and Wants (48-hour impulse-purchase cooling-off) on one page |
| **Perfumes** | Perfume collection and buy-next shortlist |
| **Vault** | 🔒 Secret surprise/gift planner - Super Admin only |
| **Settings** | Profile, security (password, TOTP two-factor), categories, currencies and rates, notifications, data export/reset, user management (Super Admin) |

---

## Money Flow

Align enforces a strict zero-based budgeting model - money cannot enter or leave any bucket without a declared source.

### Income
- Income enters the system only through the **Income page**.
- Every income transaction increases the **Ready to Assign** pool for that month.

### Expenses
- Every expense must be funded from a real source: **monthly income** or a **savings pot**.
- Pot-funded expenses atomically deduct from the pot and create a pot ledger entry.
- Editing or deleting a pot-funded expense reverses the old pot movement before applying the new change.
- The Expenses page shows This month, Budget, Under/Over, and Available (income left after income-funded expenses and pot deposits).

### Savings Pots
- Pot types: the **Emergency Fund** and regular pots. A regular pot with a target amount (and optional deadline) is a **Goal** pot - goals were merged into pots.
- Leftover money is never swept into a pot; it is always computed live from income − expenses − pot deposits.
- Depositing into any pot requires declaring a source: **monthly income** or **transfer from another pot**.
- Deposits from income are validated: available income = this month's income − income-funded expenses − existing income-funded pot deposits. Cannot deposit more than available.
- Transfers between pots are atomic (deduct + credit in one transaction, both sides logged).
- To spend from a pot, create an expense and select the pot as the funding source - there is no standalone "withdraw" action.
- A pot holds a separate balance for each of the household's currencies.
- **Income deletion is blocked** if that month's income-funded expenses + income-funded pot deposits exceed the remaining income after deletion. PKR and USD are checked separately. Remove the allocations first, then delete the income.

### Investments
- **Invested** is the total put in; **current value** is what it's worth now. Adding money raises both; withdrawing lowers only the current value.
- **Gain** = current value + withdrawn − invested, so taking profits out never shows a loss.
- Adding money can book an expense (paid from monthly income, "Investments" category); withdrawing can book income ("Investment Returns"). Both are optional and follow the budget-period checkbox.
- **Update value** only marks the investment to market - it records no money in or out.

### Currencies
- Currencies are household-defined in **Settings → Currencies**. Exactly one is the base (PKR by default); every total, budget, and dashboard figure is in the base currency, and each other currency stores a rate to it. USD is set up by default.
- The daily cron job (`/api/cron/daily`) refreshes the USD rate from `open.er-api.com` (free, no API key) - only when something schedules it (see [DEPLOYMENT.md](DEPLOYMENT.md#daily-cron-job)). Otherwise rates are updated by hand.

### Budget
- Budget page shows **Ready to Assign** = this month's income − budget category allocations − planned savings allocations.
- The expense form's **Available income** = this month's income − income-funded expenses − income-funded pot deposits (actual movements, not planned).
- Category budgets track allocated vs spent; over-budget categories turn red.
- Expenses against unbudgeted categories are flagged as "Unplanned".

---

## Design System

All UI follows a single card pattern - no one-off gradients or colored backgrounds on data cards.

### Card pattern
```
bg-card border border-border rounded-xl p-5
```
Icon lives in `p-2 rounded-lg bg-muted` with a semantic color class (`text-primary`, `text-emerald-600`, etc.). Value is `text-2xl font-bold text-foreground`. Label is `text-sm font-medium text-muted-foreground`.

### Color semantics
| Color | Meaning |
|---|---|
| `emerald` | Income, positive balance, safe status |
| `red` | Expenses, negative balance, critical status |
| `amber` | Warnings, low status, unplanned spending |
| `blue` | Info, neutral, liquid savings |
| `primary` (violet/indigo) | Brand actions, buttons, icons on neutral cards |

### Status cards only
Colored `bg-*-50 dark:bg-*-950` backgrounds are reserved for **status banners** (Ready to Assign, Emergency Fund health, budget exceeded) - not for primary data display cards.

### Sub-tiles inside cards
Use `bg-muted/50 rounded-lg` - never hardcoded colors or gradients.

---

## Roles

| Role | Access |
|---|---|
| **Super Admin** | Full access including Vault and user management |
| **Admin** | Everything except Vault and user management |

---

## Local Development

See **[docs/LOCAL_DEVELOPMENT.md](../../docs/LOCAL_DEVELOPMENT.md)** - local Postgres in Docker (or a Neon branch), env, migrations, seed, demo data, and connecting the Android app.

---

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** - Vercel + Neon, completely free, ~10 minutes.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection URL - dev branch for local, main branch for production |
| `DATABASE_URL_UNPOOLED` | Neon direct (non-pooler) URL - required for `prisma migrate deploy` on production |
| `AUTH_SECRET` | Random secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `BETTER_AUTH_SECRET` | Optional - auth signing/encryption secret; falls back to `AUTH_SECRET`. Never change it once users have 2FA on |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally · `https://your-domain.com` in production |
| `USER1_EMAIL` | Super Admin email |
| `USER1_PASSWORD` | Super Admin password |
| `USER2_EMAIL` | Admin email |
| `USER2_PASSWORD` | Admin password |
| `GMAIL_USER` | Optional - Gmail for email alerts and daily digest |
| `GMAIL_APP_PASSWORD` | Optional - 16-char Google App Password |
| `CRON_SECRET` | Random secret that authenticates the daily email digest cron - generate same as AUTH_SECRET |
| `NEXT_PUBLIC_APP_NAME` | Optional - override the app's display name (title, sidebar, login, PWA manifest). Defaults to "Align" |
