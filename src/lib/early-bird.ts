// Early-bird pricing runs through the end of September 30, Pacific (Lighthaven's
// clock). Both rails key off this: the Stripe EARLYBIRD promo code carries the
// same expiry, and the BTC rail stops honoring the code after it.
export const EARLY_BIRD_ENDS_AT = Date.UTC(2026, 9, 1, 7); // 2026-10-01 00:00 PDT

/** Last day of early-bird pricing, for site copy. */
export const EARLY_BIRD_DEADLINE = "September 30";

export function isEarlyBirdActive(now = Date.now()): boolean {
  return now < EARLY_BIRD_ENDS_AT;
}
