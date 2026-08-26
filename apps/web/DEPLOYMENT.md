# Deployment Guide - Vercel + Neon

Deploy Align to **Vercel** (hosting) + **Neon** (database). Both free. No servers, no Docker, no SSH. Total cost: **$0**.

---

## What you need

| Service | Purpose | Cost |
|---|---|---|
| [Neon](https://neon.tech) | PostgreSQL database in the cloud | Free |
| [Vercel](https://vercel.com) | Hosts the Next.js app, auto-deploys from GitHub | Free |
| [GitHub](https://github.com) | Source code, triggers Vercel deploys | Free |

---

## Step 1 - Set up Neon

1. Sign up at [neon.tech](https://neon.tech) (free)
2. Click **New Project** → name it `align`, pick a region close to you
3. Your project starts with a `main` branch (production database)

### Create a dev branch

In your project sidebar, click **Branches → Create branch** → name it `dev`.

This gives you an isolated database for local development - like a git branch for your data. Changes you make locally don't affect production.

### Get your connection strings

You need two `DATABASE_URL` values - one for local dev (dev branch), one for production (main branch).

For each branch:
1. Click the branch name in the sidebar
2. Click **Connect**
3. Choose **Prisma** from the framework dropdown
4. Copy the `DATABASE_URL` value shown

They look like:
```
postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

**Save both - you'll use them in the next steps.**

---

## Step 2 - Local dev setup

```bash
# Copy the env template
cp .env.example .env.local
```

Edit `.env.local` - replace the placeholder with your **dev branch** URL:

```env
DATABASE_URL="postgresql://...dev-branch-url..."

AUTH_SECRET="paste-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"

USER1_EMAIL="admin@example.com"
USER1_PASSWORD="your-password"
USER1_NAME="Admin"

USER2_EMAIL="member@example.com"
USER2_PASSWORD="spouse-password"
USER2_NAME="Spouse Name"
```

Generate `AUTH_SECRET` (run this once, paste the output):
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Then create the tables and seed your users:
```bash
pnpm exec prisma migrate dev --name init
pnpm seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) - done.

---

## Step 3 - Deploy to Vercel

### Push to GitHub

```bash
git push origin main
```

### Import on Vercel

1. Go to [vercel.com](https://vercel.com), sign up with your GitHub account
2. Click **Add New → Project**
3. Find your repo → click **Import**
4. Leave all settings as default
5. **Stop before clicking Deploy** - add environment variables first

### Add environment variables

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value | Environments |
|---|---|---|
| `DATABASE_URL` | Your Neon **main branch** URL | All |
| `AUTH_SECRET` | Same secret you generated above | All |
| `NEXTAUTH_URL` | `https://your-domain.com` | Production |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` | Preview |
| `USER1_EMAIL` | `admin@example.com` | All |
| `USER1_PASSWORD` | Your **strong** password (min 8 chars) | All |
| `USER1_NAME` | `Admin` | All |
| `USER2_EMAIL` | `member@example.com` | All |
| `USER2_PASSWORD` | the second user.s **strong** password | All |
| `USER2_NAME` | `Member` | All |
| `TOTP_ENC_KEY` | Random 16+ char string - encrypts 2FA secrets at rest. Generate: `openssl rand -base64 32` | All |
| `GMAIL_USER` | Your Gmail (optional - enables all email alerts) | All |
| `GMAIL_APP_PASSWORD` | 16-char Google App Password (optional) | All |
| `CRON_SECRET` | Random secret for the daily digest cron - generate same as AUTH_SECRET | All |
| `NEXT_PUBLIC_APP_NAME` | Optional - override the app's display name. Defaults to "Align" | All |

> **`TOTP_ENC_KEY` is required** if any user enables two-factor authentication (Settings → Security). Without it, enabling or verifying 2FA fails. Set it before your first deploy and never change it afterward, or existing 2FA secrets become undecryptable.

> **Never leave `USER*_PASSWORD` unset.** The seed script generates a random password (printed once) when it is, but a weak or shared value on a public backend is the easiest way in — pick something strong.

Click **Deploy**. Vercel will:
1. Pull your code
2. Run `prisma migrate deploy` - creates all tables in Neon
3. Build and deploy

Takes 2-3 minutes. Check the build logs if anything fails.

### Seed production data

After the first successful deploy, create your user accounts in the production database:

```powershell
$env:DATABASE_URL="postgresql://...your-main-branch-url..."; pnpm seed
```

---

## Step 4 - Connect your domain

1. Vercel project → **Settings → Domains** → Add `your-domain.com`
2. Vercel shows you DNS records (an A record and/or CNAME)
3. Add those records in your domain registrar (Namecheap, GoDaddy, etc.)
4. Wait 5-30 minutes for DNS to propagate
5. Vercel auto-provisions HTTPS

Done - your app is live at `https://your-domain.com`.

---

## Daily workflow

After the initial setup, your workflow is simple:

```bash
# Work on dev branch
git checkout dev
# ... make changes ...
git add . && git commit -m "your change"
git push                  # → creates a preview URL on Vercel

# Ship to production
git checkout main
git merge dev
git push                  # → live on your-domain.com in ~2 minutes
git checkout dev
```

---

## Updating passwords or settings

If you change a password or add Gmail:
1. Vercel → your project → **Settings → Environment Variables** → update the value
2. **Deployments** → three dots on latest → **Redeploy**

---

## Fixing a failed migration

If a deployment fails with `P3009` (failed migration in target database), it means a migration was partially applied or the schema already had some of its columns. Fix it in two steps:

**Step 1 - mark the migration as rolled back in the production DB:**

```powershell
$env:DATABASE_URL="postgresql://...your-production-url..."
npx prisma migrate resolve --rolled-back <migration-name>
# e.g.: npx prisma migrate resolve --rolled-back 20260504122354_sync_schema
```

Get the production `DATABASE_URL` from Vercel → Settings → Environment Variables. The migration name is shown in the Vercel build log error.

**Step 2 - make the migration idempotent, then redeploy:**

Edit the failing `migration.sql` - change any `ADD COLUMN "columnName"` that already exists in production to `ADD COLUMN IF NOT EXISTS "columnName"`. Commit and push to main to trigger a new deployment.

---

## Logs

- **Build logs:** Vercel → Deployments → click any deployment
- **Runtime logs:** Vercel → your project → **Logs** tab

---

## Database browser

```bash
# Visual database browser - runs locally, connects to your Neon dev branch
npx prisma studio
```

Neon also has a built-in SQL editor in their dashboard for both branches.

