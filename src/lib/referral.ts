// Client-safe half of the referral system; the SQL lives in referral-store.ts.
//
// Anyone holding a weekend ticket gets a referral code on /account. A friend
// who buys a Standard ticket with it pays the Family & Friends price, and both
// tickets count for the bring-a-friend swag. The referral is recorded whatever
// discount the buyer ends up with, so a better comp code never costs the swag.

import { FAMILY_PACK, STANDARD_USD } from "@/lib/family-pack";
import { normalizeTicketCode } from "@/lib/ticket-code-format";

// Eight characters (ticket codes are six) so the two can't be mistaken.
export const REFERRAL_CODE_LENGTH = 8;

/** Query param a referral link carries: /invite/<code> → /?ref=<code>#buy. */
export const REFERRAL_PARAM = "ref";

/** What a referred friend saves: they pay what a pack member pays. */
export const REFERRAL_USD_OFF = STANDARD_USD - FAMILY_PACK.usd;

/** Display form: "ABCDEFGH" → "ABCD-EFGH". Stored dashless. */
export function formatReferralCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export const normalizeReferralCode = normalizeTicketCode;

/** The stored form of a typed or linked code, or "" when it can't be one. */
export function referralCodeOf(value: string | null | undefined): string {
  const code = normalizeReferralCode(value ?? "");
  return code.length === REFERRAL_CODE_LENGTH ? code : "";
}

/** The link a ticket holder shares. */
export const inviteHref = (code: string) => `/invite/${code}`;

/** Weekend tickets refer; day passes don't. `tier` is a stored tier label. */
export function canRefer(tier: string | null): boolean {
  return !/day pass/i.test(tier ?? "");
}

/** Dollars a Stripe coupon takes off a `fullUsd` ticket. */
export function couponUsdOff(
  coupon: {
    percent_off?: number | null;
    amount_off?: number | null;
    currency?: string | null;
  },
  fullUsd: number,
): number {
  if (coupon.percent_off != null)
    return Math.round(fullUsd * coupon.percent_off) / 100;
  if (coupon.amount_off != null && (coupon.currency ?? "usd") === "usd")
    return Math.min(fullUsd, coupon.amount_off / 100);
  return 0;
}

export type DiscountPick = {
  /** Which discount checkout locks in; null leaves Stripe's code box open. */
  applied: "promo" | "referral" | null;
  usdOff: number;
  usdPay: number;
};

/**
 * One discount applies per checkout, so the bigger one wins. A referral with
 * no coupon configured still records the referral; it just doesn't discount.
 */
export function pickDiscount(
  fullUsd: number,
  promoUsdOff: number | null,
  referralUsdOff: number | null,
): DiscountPick {
  const promo = promoUsdOff ?? 0;
  const referral = referralUsdOff ?? 0;
  const applied =
    promoUsdOff != null && promo >= referral
      ? "promo"
      : referralUsdOff != null && referral > 0
        ? "referral"
        : null;
  const usdOff = applied === "promo" ? promo : applied ? referral : 0;
  return { applied, usdOff, usdPay: Math.max(0, fullUsd - usdOff) };
}
