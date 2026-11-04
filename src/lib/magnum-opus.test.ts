import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isLoanAmount,
  loanCap,
  loanIncreasesSinceZero,
  loanRoom,
  LOANS_CLOSE,
  loansOpen,
} from "./magnum-opus";

afterEach(() => vi.unstubAllEnvs());

describe("outstanding loans from the ledger", () => {
  // Newest first, as the store reads them.
  const rows = (...deltas: number[]) =>
    deltas.map((loanDelta, i) => ({ id: i, loanDelta }));

  it("lists the increases since the loan was last 0, oldest first", () => {
    // Oldest to newest: +3, -3 (back to 0), +2, +4 → owes 6.
    const out = loanIncreasesSinceZero(6, rows(4, 2, -3, 3));
    expect(out.map((r) => r.loanDelta)).toEqual([2, 4]);
  });

  it("keeps every increase after a partial repayment", () => {
    // +5, -2, +1 → owes 4; it hasn't been 0 since the first loan.
    const out = loanIncreasesSinceZero(4, rows(1, -2, 5));
    expect(out.map((r) => r.loanDelta)).toEqual([5, 1]);
  });

  it("returns nothing when nothing is owed, or nothing was logged", () => {
    expect(loanIncreasesSinceZero(0, rows(3))).toEqual([]);
    expect(loanIncreasesSinceZero(5, [])).toEqual([]);
  });
});

describe("loan cap", () => {
  it("is 5 plus every Megagame level", () => {
    expect(loanCap({ wizard: 0, pirate: 0, alien: 0 })).toBe(5);
    expect(loanCap({ wizard: 2, pirate: 1, alien: 3 })).toBe(11);
  });

  it("caps what an account owes in total, not each loan", () => {
    expect(isLoanAmount(8, 0, 8)).toBe(true);
    expect(isLoanAmount(4, 5, 8)).toBe(false);
    expect(isLoanAmount(3, 5, 8)).toBe(true);
    expect(isLoanAmount(1, 8, 8)).toBe(false);
  });

  it("leaves a debt above a lowered cap alone, but allows no more", () => {
    // Owed 9 at cap 11, then levels dropped the cap to 6.
    expect(loanRoom(9, 6)).toBe(0);
    expect(isLoanAmount(1, 9, 6)).toBe(false);
  });

  it("refuses non-integers and non-positive amounts", () => {
    expect(isLoanAmount(0, 0, 5)).toBe(false);
    expect(isLoanAmount(-2, 0, 5)).toBe(false);
    expect(isLoanAmount(1.5, 0, 5)).toBe(false);
    expect(isLoanAmount("3", 0, 5)).toBe(false);
  });
});

describe("loans schedule", () => {
  it("closes at noon Pacific on Sunday 8 Nov 2026", () => {
    expect(
      new Date(LOANS_CLOSE).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    ).toBe("Sunday, Nov 8, 12:00 PM");
  });

  it("is open until then in production, and closed from then", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(loansOpen(null, LOANS_CLOSE - 1)).toBe(true);
    expect(loansOpen(null, LOANS_CLOSE)).toBe(false);
  });

  it("is always open in local dev", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(loansOpen(null, LOANS_CLOSE + 1)).toBe(true);
  });

  it("follows the override over the schedule and local dev", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(loansOpen(true, LOANS_CLOSE + 1)).toBe(true);
    expect(loansOpen(false, LOANS_CLOSE - 1)).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(loansOpen(false)).toBe(false);
  });
});
