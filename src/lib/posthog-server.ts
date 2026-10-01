import { createHash } from "node:crypto";
import type { PurchaseRecord } from "@/lib/airtable";

const CAPTURE_URL = "https://us.i.posthog.com/i/v0/e/";

/** Stable per purchase, so a redelivered webhook dedupes instead of double-counting. */
function eventUuid(purchaseId: string): string {
  const h = createHash("sha256").update(purchaseId).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** The capture payload for a settled purchase; undefined while it isn't Paid. */
export function purchaseEvent(purchase: PurchaseRecord) {
  if (purchase.status !== "Paid") return undefined;
  const { posthog_id, first_visit, ...utm } = purchase.utm ?? {};
  return {
    // Test purchases get their own event so they never count as sales.
    event: purchase.test ? "ticket_purchased_test" : "ticket_purchased",
    // The buyer's browser id joins the purchase to their site visit; without
    // one (comp links, old Payment Links) the event stands alone.
    distinct_id: posthog_id ?? `purchase:${purchase.id}`,
    uuid: eventUuid(purchase.id),
    properties: {
      // The site's visitors are anonymous; don't mint a person for a purchase.
      $process_person_profile: false,
      payment_method: purchase.paymentMethod,
      ticket_type: purchase.ticketType,
      amount_usd: purchase.amount,
      amount_discounted_usd: purchase.amountDiscount,
      coupon_code: purchase.couponCode,
      first_visit,
      ...utm,
    },
  };
}

/**
 * Send a `ticket_purchased` event to PostHog for a settled purchase. Best-effort:
 * the purchase is already recorded, so a failure here only logs.
 */
export async function capturePurchase(purchase: PurchaseRecord): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const event = purchaseEvent(purchase);
  if (!key || !event) return;
  try {
    const res = await fetch(CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, ...event }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`PostHog responded ${res.status}`);
  } catch (err) {
    console.error(`[posthog] purchase event failed for ${purchase.id}:`, err);
  }
}
