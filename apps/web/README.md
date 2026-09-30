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
| **Investments** | Portfolio tracker; a target-allocation plan (name + type + % per category), with money added to any category any time - every contribution books a real expense under the "Investments" category |
| **Loans** | Track money lent/borrowed; repayment schedules (lump sum or fixed installments, flexible/slidable); loan creation and repayment each book a real income/expense entry by default (optional "track only, no entry" toggle on both); marking a received loan paid auto-creates an expense from the chosen funding source |
| **Cash-Flow Planner** | Forward month-by-month projection from loan schedules, recurring income (salary/freelance floor), and planned one-off expenses; dashboard summary card with upcoming-due alerts and shortfall warnings |
| **Tasks** | Daily habits + one-time tasks with drag-to-reorder priority |
| **Work** | Freelance/client project management (`/projects`) - projects → sub-tasks with statuses, priorities, tags, and due dates; project notes and links; separate from personal tasks |
| **Plans** | Life event planning (house moves, trips, renovations) with itemised checklists |
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

### Savings Pots
- Pot types: the **Emergency Fund** and regular pots. A regular pot with a target amount (and optional deadline) is a **Goal** pot - goals were merged into pots.
- Leftover money is never swept into a pot; it is always computed live from income − expenses − pot deposits.
- Depositing into any pot requires declaring a source: **monthly income** or **transfer from another pot**.
- Deposits from income are validated: available income = this month's income − income-funded expenses − existing income-funded pot deposits. Cannot deposit more than available.
- Transfers between pots are atomic (deduct + credit in one transaction, both sides logged).
- To spend from a pot, create an expense and select the pot as the funding source - there is no standalone "withdraw" action.
- A pot holds a separate balance for each of the household's currencies.
- **Income deletion is blocked** if that month's income-funded expenses + income-funded pot deposits exceed the remaining income after deletion. PKR and USD are checked separately. Remove the allocations first, then delete the income.

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

You need a Postgres database. The quickest local option is Docker: `docker compose up -d db` (from this folder) starts Postgres on `localhost:5434` - set `DATABASE_URL="postgresql://align:align@localhost:5434/align_dev"` in `.env.local` and skip the Neon notes below. Or use a free [Neon](https://neon.tech) account. Neon gives you a cloud PostgreSQL database with separate **branches** (like git) - use the `dev` branch locally and `main` for production. No local database installation needed.

```bash
# 1. Clone and install
pnpm install

# 2. Copy env template and fill in your Neon dev branch URL
cp .env.example .env.local
# Edit .env.local - paste DATABASE_URL from Neon → Connect → Prisma tab (dev branch)
# Use the DIRECT (non-pooler) URL for migrations - remove "-pooler" from the hostname

# 3. Create tables + seed users
pnpm exec prisma migrate dev
pnpm seed

# 4. Run
pnpm dev
# → http://localhost:3000
```

> **Neon pooler vs direct URL**: `prisma migrate dev` requires a direct connection (non-pooler hostname - no `-pooler` in the URL). The pooler URL is fine for the running app (`DATABASE_URL` at runtime). For production migrations, use `DATABASE_URL_UNPOOLED` with `pnpm exec prisma migrate deploy`.

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
