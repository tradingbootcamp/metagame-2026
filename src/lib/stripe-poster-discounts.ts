import "server-only";
import type Stripe from "stripe";
import { getStripe } from "./stripe";
import { getTicket, stripeMode } from "./tickets";

export type DiscountOption = { code: string; label: string };

export function posterPromotionEligible(
  promo: Stripe.PromotionCode,
  price: Stripe.Price,
): boolean {
  const coupon = promo.promotion.coupon;
  const now = Date.now() / 1000;
  if (
    !promo.active ||
    !promo.livemode ||
    !price.livemode ||
    !price.active ||
    promo.customer ||
    promo.customer_account ||
    (promo.expires_at != null && promo.expires_at <= now) ||
    (promo.max_redemptions != null &&
      promo.times_redeemed >= promo.max_redemptions) ||
    !coupon ||
    typeof coupon === "string" ||
    !coupon.valid ||
    !coupon.livemode ||
    (coupon.redeem_by != null && coupon.redeem_by <= now) ||
    (coupon.max_redemptions != null &&
      coupon.times_redeemed >= coupon.max_redemptions) ||
    promo.restrictions.first_time_transaction ||
    price.currency !== "usd" ||
    price.unit_amount == null
  )
    return false;
  const minimum =
    promo.restrictions.currency_options?.usd?.minimum_amount ??
    promo.restrictions.minimum_amount;
  if (
    minimum != null &&
    (minimum > price.unit_amount ||
      (!promo.restrictions.currency_options?.usd &&
        promo.restrictions.minimum_amount_currency !== "usd"))
  )
    return false;
  const product =
    typeof price.product === "string" ? price.product : price.product.id;
  if (coupon.applies_to && !coupon.applies_to.products.includes(product))
    return false;
  return coupon.percent_off != null
    ? coupon.percent_off > 0 && coupon.percent_off <= 100
    : (coupon.currency === "usd" && (coupon.amount_off ?? 0) > 0) ||
        (coupon.currency_options?.usd?.amount_off ?? 0) > 0;
}

async function standardPrice(stripe: Stripe) {
  return stripe.prices.retrieve(getTicket("standard")!.priceIds[stripeMode]);
}

export async function listStripePosterDiscounts(): Promise<DiscountOption[]> {
  const stripe = getStripe();
  if (!stripe || stripeMode !== "live") return [];
  const price = await standardPrice(stripe);
  const codes = await stripe.promotionCodes
    .list({ active: true, limit: 100, expand: ["data.promotion.coupon"] })
    .autoPagingToArray({ limit: 1000 });
  return codes
    .filter((p) => posterPromotionEligible(p, price))
    .map((p) => {
      const coupon = p.promotion.coupon as Stripe.Coupon;
      const amount =
        coupon.currency_options?.usd?.amount_off ?? coupon.amount_off ?? 0;
      return {
        code: p.code,
        label: `${p.code} — ${coupon.percent_off != null ? `${coupon.percent_off}% off` : `$${(amount / 100).toFixed(2)} off`}`,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function resolveStripePosterDiscount(
  code: string,
): Promise<Stripe.PromotionCode | null> {
  const stripe = getStripe();
  if (!stripe || stripeMode !== "live" || !/^[a-z0-9-]{1,100}$/i.test(code))
    return null;
  const [price, result] = await Promise.all([
    standardPrice(stripe),
    stripe.promotionCodes.list({
      code,
      active: true,
      limit: 100,
      expand: ["data.promotion.coupon"],
    }),
  ]);
  const matches = result.data.filter(
    (p) =>
      p.code.toUpperCase() === code.toUpperCase() &&
      posterPromotionEligible(p, price),
  );
  return matches.length === 1 ? matches[0] : null;
}
