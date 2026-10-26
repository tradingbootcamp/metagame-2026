import "server-only";
import { toolAccess } from "./admin-auth";
import { listStripeCodes } from "./promo-codes-stripe";
import { promoMode } from "./stripe-promo";
import { stripeMode } from "./tickets";
import { promoCode } from "./tracking-links";

export async function posterDiscounts() {
  if (!(await toolAccess("promo.manage"))) return null;
  if (promoMode() !== stripeMode) return [];
  return (await listStripeCodes())
    .filter((c) => c.redeemable && promoCode(c.code) === c.code)
    .map((c) => ({ code: c.code, label: c.coupon }))
    .sort((a, b) => a.code.localeCompare(b.code));
}
