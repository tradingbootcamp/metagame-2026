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
code goes live (see the Vercel workflows). `/admin/schema` renders the schema
from the Drizzle objects; `/admin/schema/erd` iframes a Liam ERD site that
`next build` generates from the migrations into `public/schema-erd`. Airtable stays the ops view for
purchases and RFPs; Postgres is the source of truth for accounts, ticket
ownership, and the schedule.

## Issue tracking (Linear)

Work is tracked in Linear (Metagame team): attach PRs by putting `[META-###]` in the PR title or using the Linear-provided branch name, and file issues generously — including to record work already done. In the PR body only `Fixes META-###` attaches; avoid `Ref`, which blocks the on-merge status transitions. A linked PR moves the issue to In Progress on open and In Review on merge — In Review means "merged, pending human review", and nothing moves an issue to Done automatically, so never mark issues Done yourself. No Linear access? Skip all this — a clear PR description is enough.

When mentioning PRs or issues in your output, render them as links whenever possible — PR numbers as `https://github.com/tradingbootcamp/metagame-2026/pull/<num>` and Linear issue IDs as `https://linear.app/arbormetagame/issue/META-###`.
