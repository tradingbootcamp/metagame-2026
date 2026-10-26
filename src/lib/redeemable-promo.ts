import type Stripe from "stripe";

export function isRedeemablePromo(promo: Stripe.PromotionCode): boolean {
  const coupon = promo.promotion?.coupon;
  return (
    promo.active &&
    (promo.expires_at == null || promo.expires_at > Date.now() / 1000) &&
    (promo.max_redemptions == null ||
      promo.times_redeemed < promo.max_redemptions) &&
    !!coupon &&
    typeof coupon !== "string" &&
    coupon.valid
  );
}
