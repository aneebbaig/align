# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Instead, report privately via GitHub's [Security Advisories](../../security/advisories/new) ("Report a vulnerability"). Include:

- A description of the issue and its impact
- Steps to reproduce (proof of concept if possible)
- Affected component (web, mobile, or API) and version/commit

You'll get an acknowledgement as soon as possible, and a fix or mitigation plan after triage.

## Scope

Align is self-hosted: each deployment owns its database and secrets. Reports about the **code** (auth, the `/api/v1` surface, data isolation between users, injection, dependency vulnerabilities) are in scope. Issues caused purely by a specific deployment's misconfiguration are not.

## Hardening notes for self-hosters

- Keep `AUTH_SECRET`, `CRON_SECRET`, and database credentials out of the repo - they belong in your host's environment variables, never in committed files. Only `.env.example` is tracked.
- Use strong, unique passwords for the seeded users and rotate `AUTH_SECRET` if you suspect exposure.
- Restrict who can reach the deployment; this app is designed for one or two trusted users, not public sign-up.
