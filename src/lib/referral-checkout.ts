import type Stripe from "stripe";
import { env } from "@/env";
import {
  couponUsdOff,
  pickDiscount,
  REFERRAL_USD_OFF,
  referralCodeOf,
  type DiscountPick,
} from "@/lib/referral";
import { lookupReferrer, type Referrer } from "@/lib/referral-store";
import { promoCode } from "@/lib/tracking-links";

export type PromoLookup = {
  promo: Stripe.PromotionCode;
  usdOff: number;
  label: string | null;
};

/** An active Stripe promotion code and what it takes off a `fullUsd` ticket. */
export async function lookupPromo(
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
  if (!promo) return null;
  const coupon = promo.promotion?.coupon;
  const expanded = coupon && typeof coupon === "object" ? coupon : null;
  return {
    promo,
    usdOff: expanded ? couponUsdOff(expanded, fullUsd) : 0,
    label: expanded?.name ?? null,
  };
}

export type StandardDiscounts = {
  /** The code as typed, "" when none; `promo` is null when it isn't live. */
  promoInput: string;
  promo: PromoLookup | null;
  /** The referral code in stored form, "" when none or malformed. */
  referralCode: string;
  referrer: Referrer | null;
  /** The referral's own discount, null while no coupon is configured. */
  referralUsdOff: number | null;
  pick: DiscountPick;
  session: Pick<
    Stripe.Checkout.SessionCreateParams,
    "discounts" | "allow_promotion_codes"
  >;
  metadata: Record<string, string>;
};

/**
 * Resolves a Standard checkout's referral and promo code into the one discount
 * Stripe will lock in (the bigger), or the open code box when neither applies.
 * The referral rides along in metadata either way, so the webhook records it
 * whatever the buyer paid.
 */
export async function resolveStandardDiscounts(
  stripe: Stripe | null,
  input: { promo?: string | null; ref?: string | null },
  fullUsd: number,
): Promise<StandardDiscounts> {
  const promoInput = promoCode(input.promo);
  const referralCode = referralCodeOf(input.ref);

  let promo: PromoLookup | null = null;
  if (promoInput && stripe) {
    promo = await lookupPromo(stripe, promoInput, fullUsd);
    if (!promo)
      console.warn(`[checkout/stripe] no active ${promoInput} promotion code`);
  }

  let referrer: Referrer | null = null;
  if (referralCode) {
    try {
      referrer = await lookupReferrer(referralCode);
    } catch (err) {
      console.error("[checkout/stripe] referral lookup failed:", err);
    }
  }

  const couponId = env.FAMILY_REFERRAL_COUPON_ID;
  const referralUsdOff = couponId ? REFERRAL_USD_OFF : null;
  if (referrer && !couponId)
    console.warn(
      "[checkout/stripe] FAMILY_REFERRAL_COUPON_ID unset — referral recorded without a discount",
    );

  const pick = pickDiscount(
    fullUsd,
    promo ? promo.usdOff : null,
    referrer ? referralUsdOff : null,
  );
  const session: StandardDiscounts["session"] =
    pick.applied === "promo"
      ? { discounts: [{ promotion_code: promo!.promo.id }] }
      : pick.applied === "referral"
        ? { discounts: [{ coupon: couponId! }] }
        : { allow_promotion_codes: true };
  const metadata: Record<string, string> = referrer
    ? { referred_by: referrer.paymentId, referral_code: referralCode }
    : {};

  return {
    promoInput,
    promo,
    referralCode,
    referrer,
    referralUsdOff,
    pick,
    session,
    metadata,
  };
}
