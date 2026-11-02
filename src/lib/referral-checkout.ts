import type Stripe from "stripe";
import { env } from "@/env";
import { couponUsdOff, REFERRAL_USD_OFF, referralCodeOf } from "@/lib/referral";
import { lookupReferrer } from "@/lib/referral-store";
import { promoCode } from "@/lib/tracking-links";

export type DiscountParams = Pick<
  Stripe.Checkout.SessionCreateParams,
  "discounts" | "allow_promotion_codes"
>;

export type Discount = {
  session: DiscountParams;
  usdOff: number;
  // The Stripe promotion code, when it wasn't a referral code.
  promo: Stripe.PromotionCode | null;
};

async function referrerOf(code: string): Promise<string | null> {
  if (!code) return null;
  try {
    return await lookupReferrer(code);
  } catch (err) {
    console.error("[checkout/stripe] referral lookup failed:", err);
    return null;
  }
}

/** Who referred this checkout, as session metadata the webhook records. */
export async function referralMetadata(
  ref: string | null | undefined,
): Promise<Record<string, string>> {
  const code = referralCodeOf(ref);
  const referrer = await referrerOf(code);
  return referrer ? { referred_by: referrer, referral_code: code } : {};
}

/**
 * The discount a typed or linked code locks in on a `fullUsd` Standard
 * ticket: a friend's referral code takes the referral coupon, anything else
 * is looked up as a Stripe promotion code. Null when it's neither.
 */
export async function resolveDiscount(
  stripe: Stripe,
  input: string | null | undefined,
  fullUsd: number,
): Promise<Discount | null> {
  const couponId = env.FAMILY_REFERRAL_COUPON_ID;
  if (couponId && (await referrerOf(referralCodeOf(input))))
    return {
      session: { discounts: [{ coupon: couponId }] },
      usdOff: REFERRAL_USD_OFF,
      promo: null,
    };

  const code = promoCode(input);
  if (!code) return null;
  const {
    data: [promo],
  } = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
    expand: ["data.promotion.coupon"],
  });
  const coupon = promo?.promotion?.coupon;
  const expanded = coupon && typeof coupon === "object" ? coupon : null;
  if (!promo || expanded?.valid === false) {
    console.warn(`[checkout/stripe] no active ${code} promotion code`);
    return null;
  }
  return {
    session: { discounts: [{ promotion_code: promo.id }] },
    usdOff: expanded ? couponUsdOff(expanded, fullUsd) : 0,
    promo,
  };
}
