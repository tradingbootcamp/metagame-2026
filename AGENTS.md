<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Worktrees

Always work in a worktree, never in this checkout directly, even for a one-line fix.
Use Claude Code's built-in worktree flow.

## Code comments

Minimal. A short note for a non-obvious _why_ is fine; don't narrate the change
itself or let a comment grow into a PR report.

## Database

Neon Postgres via Drizzle. Schema is `src/db/schema/`, queries go through
`getDb()` in `src/db/index.ts`, and migrations are the SQL files in `drizzle/`.
After changing the schema run `pnpm db:generate` and commit what it writes;
never hand-edit a generated migration. Deploys apply migrations before the
code goes live (see the Vercel workflows). `/admin/schema` iframes a Liam ERD
site that `next build` generates from the migrations into `public/schema-erd`;
`/admin/schema/list` renders the same schema column-by-column from the Drizzle
objects. Airtable stays the ops view for
purchases and RFPs; Postgres is the source of truth for accounts, ticket
ownership, and the schedule.

### Tickets

The payment webhooks write each purchase to Airtable and then to `tickets`
through `recordTicket()` in `src/lib/ticket-store.ts`, upserting on the payment
id so retries can't duplicate. `pnpm db:backfill-tickets` loads purchases made
before that from Airtable (dry run by default, `--apply` writes). A ticket is
owned only once its code is claimed; a matching purchaser email shows the
buyer their tickets but never grants ownership.

## Accounts

Better Auth, built lazily by `getAuth()` in `src/lib/auth.ts` over the Drizzle
client. `/login` signs in with an emailed six-digit code (which also creates the
account); `/account` holds the profile and an optional password. Accounts only
come from proving the email, so password sign-up is disabled and password
sign-in is refused on unverified accounts. `currentSession()` is the server-side
read; `src/proxy.ts` only redirects, so every protected page and action calls it
again.

Team tools (`/admin/*`, `/grade`) open to accounts with `user.role = 'admin'`
(Better Auth's admin plugin). `adminSession()` in `src/lib/auth.ts` is the one
role check; `adminAccess()` / `requireAdmin()` (`src/lib/admin-auth.ts`) and
`gradeAccess()` (`src/lib/grader-auth.ts`) layer the password fallback on it.
Swap `adminSession()` for `can()` when the permission system lands
(META-1483). `/admin/users` grants and revokes admin and bans; the first admin
is bootstrapped by hand in the Neon console:
`update "user" set role = 'admin' where email = '…'`. The shared-password
fallback (`ADMIN_PASSWORD`, `GRADER_PASSWORD` and their secrets) stays until
the team has accounts, then those env vars and the password paths go.

## Issue tracking (Linear)

Work is tracked in Linear (Metagame team): attach PRs by putting `[META-###]` in the PR title or using the Linear-provided branch name, and file issues generously — including to record work already done. In the PR body only `Fixes META-###` attaches; avoid `Ref`, which blocks the on-merge status transitions. A linked PR moves the issue to In Progress on open and In Review on merge — In Review means "merged, pending human review", and nothing moves an issue to Done automatically, so never mark issues Done yourself. No Linear access? Skip all this — a clear PR description is enough.

When mentioning PRs or issues in your output, render them as links whenever possible — PR numbers as `https://github.com/tradingbootcamp/metagame-2026/pull/<num>` and Linear issue IDs as `https://linear.app/arbormetagame/issue/META-###`.
