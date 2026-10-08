import { connection } from "next/server";
import { NameForm, PasswordForm } from "../SignInForms";
import PromoTool from "./PromoTool";
import { isConfigured, readSession } from "@/lib/admin-auth";
import { listCoupons, type Coupon } from "@/lib/promo-codes-stripe";
import { siteOriginFromHeaders } from "@/lib/site-origin";
import { getPromoStripe, promoMode } from "@/lib/stripe-promo";

export default async function AdminPromoPage() {
  // Per-request on every branch, or the unconfigured/password branch gets
  // baked in as static at build time.
  await connection();

  if (!isConfigured()) {
    return (
      <p className="mx-auto max-w-sm text-sm text-ink/70">
        Team tools aren’t configured on this deploy — set{" "}
        <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code>.
      </p>
    );
  }

  const session = await readSession();
  if (!session) return <PasswordForm />;
  if (!session.identity) return <NameForm />;

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
