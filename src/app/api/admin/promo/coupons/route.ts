import { PromoError } from "@/lib/promo-codes";
import { listCoupons } from "@/lib/promo-codes-stripe";
import { authorize, error, json, message } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

/**
 * The coupons a code can be minted on: every valid one on Stripe, the same
 * list /backstage/promo offers, so a caller can see which `amountOffUsd`
 * values will resolve before sending one. `{coupons: [{id, label, kind,
 * amountOff?, currency?, percentOff?, isDefault}]}`.
 */
export async function GET() {
  const access = await authorize("promo.view");
  if (access instanceof Response) return access;
  try {
    return json({ coupons: await listCoupons() });
  } catch (err) {
    if (err instanceof PromoError && err.code === "config")
      return error(err.message, 503);
    console.error("[promo api] Stripe call failed:", err);
    return error(message(err), 502);
  }
}
