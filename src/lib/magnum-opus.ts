import type { MegagameLevels } from "./megagame-levels";

// Each schedule below yields to its override from /backstage/magnum-opus, and
// is always open under `next dev`.

// End of opening session
export const MAGNUM_OPUS_OPENS = Date.parse("2026-11-07T02:00:00Z");

/** The account page's Magnum Opus tab: hidden until MAGNUM_OPUS_OPENS. */
export function magnumOpusOpen(
  override: boolean | null = null,
  now = Date.now(),
): boolean {
  if (override !== null) return override;
  return process.env.NODE_ENV !== "production" || now >= MAGNUM_OPUS_OPENS;
}

// Sunday 8 Nov 2026, 12:00 Pacific (PST, UTC−8).
export const LOANS_CLOSE = Date.parse("2026-11-08T20:00:00Z");

/** Self-serve loans: open until LOANS_CLOSE. */
export function loansOpen(
  override: boolean | null = null,
  now = Date.now(),
): boolean {
  if (override !== null) return override;
  return process.env.NODE_ENV !== "production" || now < LOANS_CLOSE;
}

/** What anyone may owe from loans at once, before their Megagame levels. */
export const BASE_LOAN_CAP = 5;

/** 5 plus every Megagame level the account holds. */
export const loanCap = (levels: MegagameLevels): number =>
  BASE_LOAN_CAP + levels.wizard + levels.pirate + levels.alien;

/**
 * How much more an account owing `outstanding` may borrow. Zero once at or
 * over the cap; a cap that drops below what's owed leaves the debt alone.
 */
export const loanRoom = (outstanding: number, cap: number): number =>
  Math.max(0, cap - outstanding);

export const isLoanAmount = (
  n: unknown,
  outstanding: number,
  cap: number,
): n is number =>
  Number.isInteger(n) &&
  (n as number) >= 1 &&
  (n as number) <= loanRoom(outstanding, cap);

/**
 * The loan increases since an account's loan was last 0, oldest first: walks
 * back from what's owed through its ledger rows (newest first) until the
 * balance before a row was 0 or less.
 */
export function loanIncreasesSinceZero<T extends { loanDelta: number }>(
  owed: number,
  newestFirst: T[],
): T[] {
  const out: T[] = [];
  let before = owed;
  for (const row of newestFirst) {
    if (before <= 0) break;
    if (row.loanDelta > 0) out.push(row);
    before -= row.loanDelta;
  }
  return out.reverse();
}

/** A balance change typed on /backstage: any whole number, zero allowed. */
export const isDelta = (n: unknown): n is number =>
  Number.isSafeInteger(n) && Math.abs(n as number) <= 1_000_000;
