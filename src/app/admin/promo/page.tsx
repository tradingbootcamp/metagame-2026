import { connection } from "next/server";
import SignIn from "../SignIn";
import { NameForm } from "../SignInForms";
import PromoTool from "./PromoTool";
import { adminAccess } from "@/lib/admin-auth";
import { listCoupons, type Coupon } from "@/lib/promo-codes-stripe";
import { siteOriginFromHeaders } from "@/lib/site-origin";
import { getPromoStripe, promoMode } from "@/lib/stripe-promo";

export default async function AdminPromoPage() {
  // Per-request on every branch, or the sign-in branch gets baked in as
  // static at build time.
  await connection();

  const access = await adminAccess();
  if (!access) return <SignIn next="/admin/promo" />;
  if (!access.name) return <NameForm />;

  // A missing/unreadable coupon list leaves the Stripe rail disabled with a
  // message rather than breaking the BTC rail too.
  let coupons: Coupon[] = [];
  let couponError: string | null = null;
  if (getPromoStripe()) {
    try {
      coupons = await listCoupons();
    } catch (err) {
      couponError = err instanceof Error ? err.message : String(err);
    }
  } else {
    couponError = "STRIPE_PROMO_KEY isn’t set, so the Stripe rail is off.";
  }

  return (
    <PromoTool
      coupons={coupons}
      couponError={couponError}
      mode={promoMode()}
      origin={await siteOriginFromHeaders()}
    />
  );
}
