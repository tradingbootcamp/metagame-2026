import { connection } from "next/server";
import SignIn from "../SignIn";
import PromoTool from "./PromoTool";
import { toolAccess } from "@/lib/admin-auth";
import { listCoupons, type Coupon } from "@/lib/promo-codes-stripe";
import { siteOriginFromHeaders } from "@/lib/site-origin";
import { getPromoStripe, promoMode } from "@/lib/stripe-promo";

export default async function AdminPromoPage() {
  // Per-request on every branch, or the sign-in branch gets baked in as
  // static at build time.
  await connection();

  const access = await toolAccess("promo.view");
  if (!access) return <SignIn next="/backstage/promo" />;
  const canMint = Boolean(await toolAccess("promo.create"));
  const canArchive = Boolean(await toolAccess("promo.manage"));

  // A missing/unreadable coupon list disables the form with a message rather
  // than breaking the page.
  let coupons: Coupon[] = [];
  let couponError: string | null = null;
  if (getPromoStripe()) {
    try {
      coupons = await listCoupons();
    } catch (err) {
      couponError = err instanceof Error ? err.message : String(err);
    }
  } else {
    couponError = "STRIPE_PROMO_KEY isn’t set, so minting is off.";
  }

  return (
    <PromoTool
      coupons={coupons}
      couponError={couponError}
      mode={promoMode()}
      origin={await siteOriginFromHeaders()}
      canMint={canMint}
      canArchive={canArchive}
    />
  );
}
