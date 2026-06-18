import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/env";
import { recordPurchase, type PurchaseStatus } from "@/lib/airtable";
import { getStripe } from "@/lib/stripe";

// Signature verification needs the raw body + Node crypto — keep this off the edge.
export const runtime = "nodejs";

/** Unwrap a Stripe field that may be an id string or an expanded object. */
function expanded<T extends object>(
  value: string | T | null | undefined,
): T | null {
  return value && typeof value === "object" ? value : null;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  // Unconfigured env is a 200 no-op (not a 500) so it doesn't spin Stripe's retries.
  if (!stripe || !webhookSecret) {
    console.warn("[stripe-webhook] not configured — ignoring event");
    return NextResponse.json({ received: true, configured: false });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Instant methods (card) settle on `completed`; delayed methods (ACH bank debit)
  // complete as unpaid, then settle via `async_payment_succeeded` or bounce via
  // `async_payment_failed`. We record all three stages — the upsert key walks the
  // same row Pending → Paid / Failed without duplicating.
  const HANDLED = new Set<Stripe.Event["type"]>([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
  ]);
  if (!HANDLED.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  let status: PurchaseStatus;
  if (event.type === "checkout.session.async_payment_failed") {
    status = "Failed";
  } else if (
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required"
  ) {
    // Card settles instantly; a 100%-off checkout owes nothing — both are done.
    status = "Paid";
  } else {
    // `completed` but not yet paid = a delayed method (ACH) awaiting settlement.
    status = "Pending";
  }

  try {
    // One retrieve with expands yields ticket type, receipt URL, and Stripe's fee/net.
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: [
        "line_items.data.price.product",
        "payment_intent.latest_charge.balance_transaction",
        "discounts.promotion_code",
      ],
    });

    const paymentIntent = expanded<Stripe.PaymentIntent>(full.payment_intent);
    const charge = paymentIntent
      ? expanded<Stripe.Charge>(paymentIntent.latest_charge)
      : null;
    const balanceTxn = charge
      ? expanded<Stripe.BalanceTransaction>(charge.balance_transaction)
      : null;

    const product = expanded<Stripe.Product | Stripe.DeletedProduct>(
      full.line_items?.data[0]?.price?.product,
    );
    const ticketType = product && "name" in product ? product.name : undefined;

    // The customer-facing promo code (e.g. "EARLYBIRD") — the coupon is the
    // discount definition behind it; this is the string the buyer actually used.
    const promo = expanded<Stripe.PromotionCode>(
      full.discounts?.[0]?.promotion_code,
    );
    const couponCode = promo?.code;

    // Total knocked off the order (cents → dollars); omitted when nothing applied.
    const amountDiscount = full.total_details?.amount_discount
      ? full.total_details.amount_discount / 100
      : undefined;

    // Live purchases made with a known in-prod test coupon get flagged Test too, so
    // they don't pollute real-sales filters. (Abuse protection is the coupon's own
    // Stripe restrictions — this is just bookkeeping.)
    const testCoupons = (env.TEST_COUPON_CODES ?? "")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    const isTestCoupon =
      couponCode != null && testCoupons.includes(couponCode.toUpperCase());

    await recordPurchase({
      // Prefer the PaymentIntent id (the canonical payment) as the upsert key.
      id: paymentIntent?.id ?? full.id,
      customerName: full.customer_details?.name ?? undefined,
      customerEmail: full.customer_details?.email ?? undefined,
      amount: full.amount_total != null ? full.amount_total / 100 : undefined,
      fee: balanceTxn ? balanceTxn.fee / 100 : undefined,
      net: balanceTxn ? balanceTxn.net / 100 : undefined,
      billingName: charge?.billing_details?.name ?? undefined,
      billingEmail: charge?.billing_details?.email ?? undefined,
      ticketType,
      couponCode,
      amountDiscount,
      receiptUrl: charge?.receipt_url ?? undefined,
      status,
      // Flag Test if it's a sandbox checkout (livemode=false) OR used an in-prod test
      // coupon — either way it shouldn't count as a real sale.
      test: !event.livemode || isTestCoupon,
    });
  } catch (err) {
    // 500 → Stripe retries; recordPurchase upserts, so a retry can't duplicate.
    console.error("[stripe-webhook] failed to record purchase:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
