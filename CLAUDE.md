@AGENTS.md

# Metagame 2026 site

The new Metagame site. Fresh start — **don't copy from the 2025 site** (it lives at
`../metagame_2025` as reference only; you don't need to go exploring it).

- **Stack:** Next.js 16 (App Router, `src/`) + Tailwind v4 + TypeScript, pnpm.
- **Repo:** standalone `git@github.com:tradingbootcamp/metagame-2026.git` (separate from the
  2025 repo `tradingbootcamp/metagame`).
- **Right now it's just a splash page** — `Metagame 2026` heading + email capture form.

## Email signup

The form posts to `/api/signup` (`src/app/api/signup/route.ts`) → `recordSignup()` in
`src/lib/airtable.ts`, which writes a record to **Airtable**. Until the Airtable env vars are
set it **gracefully no-ops** (logs + returns `{ ok: true, stored: false }`), so the form works
in local dev without credentials.

## Discount codes (one table, two rails)

All discount codes live in the Airtable **"Discount Codes"** table. The discount amount is
expressed in per-unit columns — exactly one populated per row: `Percent Off` (e.g. 100 = 100%),
`USD Off` (currency), or `BTC Off` (whole BTC subtracted from the full 0.0065; a fixed BTC price is
written as its equivalent `BTC Off`). These replace the old `Discount Type`/`Value` pair.
`lookupDiscountCode()` (`src/lib/discount-codes.ts`) reads `BTC Off` / `Percent Off` (gated by
`Method`), falling back to the legacy `Discount Type`/`Value` switch for un-migrated rows, and
refuses a row once its `Expires` instant has passed (blank = never). The
**stripe-webhook** (`src/app/api/stripe-webhook/route.ts`)
is the sole writer of `Method=Stripe` rows: on `promotion_code.created` / `promotion_code.updated`
it mirrors every Stripe promotion code (dashboard- or comp-tool-made) into the same table via
`recordDiscountCode()`, so one table covers both rails. Comp-tool codes also carry `metadata.purpose` /
`metadata.notes`, mirrored into the `Purpose` (single-select, typecast) and `Comp Notes` columns. `lookupDiscountCode` excludes
`Method=Stripe` rows — they're logged, never honored as BTC discounts (blank `Method`, e.g. legacy
`EARLYBIRD`, still is). The two `promotion_code.*` events must be enabled on the webhook endpoint in
**both** test and live mode.

## Issue tracking (Linear)

Work is tracked in Linear (Metagame team). Attach a PR by using the Linear-provided branch name or
putting the issue ID in the PR title; in the body only `Fixes META-###` attaches (bare IDs and `Ref`
don't, and `Ref` blocks the on-merge status move). A linked PR moves the issue to In Progress on open
and In Review on merge. In Review means "finished, pending human review" — issues move to Done by hand
in meetings, so never mark an issue Done yourself.

## Environment variables

- **`.env.example`** is the committed source of truth — `cp .env.example .env.local` and fill in.
- **`src/env.ts`** declares the contract (`ENV_SPEC`) + a typed `env` accessor. `validateEnv()`
  is wired into `next.config.ts`, so `next dev` / `next build` **warn** (never fail) when a
  required var is missing.
- Add a new var in **both** `.env.example` and `ENV_SPEC` to keep them in sync.
- Supabase isn't used yet — its vars are commented placeholders in `.env.example` only.

## Styling

Tailwind v4 for ordinary UI — layout, spacing, type, forms, the hero shell (`DiceHero.tsx`),
palette tokens in `globals.css`. Reach for a **scoped CSS module** only for genuinely complex /
3D / custom-property-heavy CSS that maps badly to utilities — currently just the dice cube
(`Dice.tsx` + `Dice.module.css`: `preserve-3d`, per-face `translateZ(var(--h))`, the `--s`/`--h`
`calc()`/`clamp()` system). Don't convert that to arbitrary-value classes; everything else
stays Tailwind.

## Code comments

A short comment is welcome when it documents something non-obvious — _why_ a line is there, or
what it interacts with — even if nothing's about to break. Keep it to the fewest words: the
one-line "blue box behind button, revealed on hover" is the model. Two things to avoid: narrating
_the change itself_ ("flipped X to Y so it now reads left→right") — that belongs in the commit/PR,
not the source — and letting a comment swell into a multi-line PR-report.

## Linting & formatting

- `pnpm check` = `typecheck` + `lint` + `format:check`. Run it before pushing.
- **Prettier** (with `prettier-plugin-tailwindcss`, which auto-sorts class names) — `pnpm format`
  applies it. **ESLint** via `eslint-config-next`.
- CI (`.github/workflows/ci.yml`) runs `check` + `build` on every PR / push to main.

## Worktrees & parallel work

This repo follows the shared `~/Arbor/` worktree convention (see `~/Arbor/CLAUDE.md`):
feature work goes in worktrees under the **shared** `~/Arbor/working-projects/<feature-slug>/`,
branched off `origin/main`, torn down with `~/Arbor/cleanup-worktree.sh`.

Metagame-specific setup that differs from the arbiter repos:

- Each worktree needs its own `pnpm install` (node_modules aren't shared).
- Copy env into each worktree: `cp .env.example .env.local` and add the Airtable PAT (see
  Environment variables above). Without it the signup form gracefully no-ops.
- `pnpm dev` starts the dev server, auto-incrementing from port 3000 if it's taken. Read the
  actual port from startup output before surfacing a localhost link.
- **When previewing, surface _both_ URLs `next dev` prints** — the `Local:` (`localhost`) link
  _and_ the `Network:` (LAN IP, e.g. `http://10.x.x.x:<port>`) link — so the change can be opened
  on a phone/other device on the same network for mobile testing. Next 16 binds to `0.0.0.0` by
  default and prints both; no extra flag needed. Read the real IP+port from the startup output —
  don't assume them.
