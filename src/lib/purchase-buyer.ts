import { getCharge } from "@/lib/opennode";
import { getStripe } from "@/lib/stripe";

// The two ids a buyer can hold: a Stripe Checkout Session or an OpenNode charge.
// Both are unguessable, so holding one stands in for owning the purchase's email.
export type PurchaseRef = { sessionId: string } | { chargeId: string };

/** Opt-out link for the confirmation email — always the deployed site. */
export function mailingListOptOutUrl(ref: PurchaseRef): string {
  const query = new URLSearchParams(
    "sessionId" in ref
      ? { session_id: ref.sessionId }
      : { charge_id: ref.chargeId },
  );
  return `https://metagame.games/mailing-list/opt-out?${query}`;
}

/** The buyer's email for a purchase, or null if the id doesn't resolve to one. */
export async function purchaseBuyer(
  ref: PurchaseRef,
): Promise<{ email: string; test: boolean } | null> {
  try {
    if ("sessionId" in ref) {
      const stripe = getStripe();
      if (!stripe) return null;
      const session = await stripe.checkout.sessions.retrieve(ref.sessionId);
      const email = session.customer_details?.email;
      return email ? { email, test: !session.livemode } : null;
    }
    const meta = (await getCharge(ref.chargeId)).metadata ?? {};
    return meta.email
      ? {
          email: String(meta.email),
          test: meta.test === true || meta.test === "true",
        }
      : null;
  } catch {
    return null;
  }
}
