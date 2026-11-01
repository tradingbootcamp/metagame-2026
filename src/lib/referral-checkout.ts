import type Stripe from "stripe";
import { env } from "@/env";
import {
  couponUsdOff,
  pickDiscount,
  REFERRAL_USD_OFF,
  referralCodeOf,
} from "@/lib/referral";
import { lookupReferrer } from "@/lib/referral-store";
import { promoCode } from "@/lib/tracking-links";

type PromoLookup = { promo: Stripe.PromotionCode; usdOff: number };

/** An active Stripe promotion code and what it takes off a `fullUsd` ticket. */
async function lookupPromo(
  stripe: Stripe,
  code: string,
  fullUsd: number,
): Promise<PromoLookup | null> {
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
  if (!promo || expanded?.valid === false) return null;
  return {
    promo,
    usdOff: expanded ? couponUsdOff(expanded, fullUsd) : 0,
  };
}

export type DiscountParams = Pick<
  Stripe.Checkout.SessionCreateParams,
  "discounts" | "allow_promotion_codes"
>;

export type StandardDiscounts = {
  promo: PromoLookup | null;
  applied: "promo" | "referral" | null;
  session: DiscountParams;
  metadata: Record<string, string>;
};

/**
 * Resolves a Standard checkout's referral and promo code into the one discount
 * Stripe will lock in, or the open code box when neither applies. The referral
 * rides along in metadata either way, so the webhook records it.
 */
export async function resolveStandardDiscounts(
  stripe: Stripe,
  input: { promo?: string | null; ref?: string | null },
  fullUsd: number,
): Promise<StandardDiscounts> {
  const promoInput = promoCode(input.promo);
  const referralCode = referralCodeOf(input.ref);

  const promo = promoInput
    ? await lookupPromo(stripe, promoInput, fullUsd)
    : null;
  if (promoInput && !promo)
    console.warn(`[checkout/stripe] no active ${promoInput} promotion code`);

  let referrer: string | null = null;
  if (referralCode) {
    try {
      referrer = await lookupReferrer(referralCode);
    } catch (err) {
      console.error("[checkout/stripe] referral lookup failed:", err);
    }
  }

  const couponId = env.FAMILY_REFERRAL_COUPON_ID;
  if (referrer && !couponId)
    console.warn(
      "[checkout/stripe] FAMILY_REFERRAL_COUPON_ID unset — referral recorded without a discount",
    );

  const applied = pickDiscount(
    promo ? promo.usdOff : null,
    referrer && couponId ? REFERRAL_USD_OFF : 0,
  );
  return {
    promo,
    applied,
    session:
      applied === "promo"
        ? { discounts: [{ promotion_code: promo!.promo.id }] }
        : applied === "referral"
          ? { discounts: [{ coupon: couponId! }] }
          : { allow_promotion_codes: true },
    metadata: referrer
      ? { referred_by: referrer, referral_code: referralCode }
      : {},
  };
}
