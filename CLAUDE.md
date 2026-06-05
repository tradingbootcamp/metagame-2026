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

## Environment variables

- **`.env.example`** is the committed source of truth — `cp .env.example .env.local` and fill in.
- **`src/env.ts`** declares the contract (`ENV_SPEC`) + a typed `env` accessor. `validateEnv()`
  is wired into `next.config.ts`, so `next dev` / `next build` **warn** (never fail) when a
  required var is missing.
- Add a new var in **both** `.env.example` and `ENV_SPEC` to keep them in sync.
- Supabase isn't used yet — its vars are commented placeholders in `.env.example` only.

## Styling

Tailwind v4 for ordinary UI (layout, spacing, type, forms, palette tokens in `globals.css`).
Reach for a **scoped CSS module** only for genuinely complex / 3D / custom-property-heavy CSS
that maps badly to utilities — currently just the dice hero (`DiceHero.module.css`: `preserve-3d`,
per-face `translateZ(var(--h))`, the `--s`/`--h` `calc()`/`clamp()` cube system). Don't convert
that to arbitrary-value classes; everything else stays Tailwind. (The non-dice hero chrome —
date band, signup, links — could move to Tailwind out of the module; fine to leave for now.)

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
