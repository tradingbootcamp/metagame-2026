import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/env";
import {
  recordDiscountCode,
  recordPurchase,
  type PurchaseStatus,
} from "@/lib/airtable";
import { sendAdminErrorEmail, sendTicketConfirmationEmail } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { ticketCode } from "@/lib/ticket-code";
import {
  dayPassForPaymentLinkUrl,
  tierLabelForPaymentLinkUrl,
} from "@/lib/tickets";

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

  // Mirror promotion-code lifecycle into the Discount Codes table as Method=Stripe
  // rows so every code (Stripe + BTC) lives in one table. Hand-made dashboard codes
  // fire here too; lookupDiscountCode excludes Method=Stripe rows, so these are
  // logged but never honored as BTC discounts.
  if (
    event.type === "promotion_code.created" ||
    event.type === "promotion_code.updated"
  ) {
    const promo = event.data.object as Stripe.PromotionCode;
    try {
      // The coupon (discount definition) lives under `promotion` in recent API
      // versions; fall back to a legacy top-level field for older event payloads.
      const coupon = expanded<Stripe.Coupon>(
        promo.promotion?.coupon ??
          (promo as { coupon?: string | Stripe.Coupon | null }).coupon,
      );

      // A coupon carries exactly one of percent_off / amount_off (minor units → USD).
      const percentOff = coupon?.percent_off ?? undefined;
      const usdOff =
        coupon?.amount_off != null ? coupon.amount_off / 100 : undefined;

      const name = promo.metadata?.name;
      await recordDiscountCode({
        code: promo.code,
        active: promo.active,
        test: !event.livemode,
        maxUses: promo.max_redemptions ?? null,
        expiresAt: promo.expires_at
          ? new Date(promo.expires_at * 1000).toISOString()
          : null,
        percentOff,
        usdOff,
        redeemed: promo.times_redeemed ?? 0,
        email: promo.metadata?.email || undefined,
        label: name ? `Comp – ${name}` : (coupon?.name ?? undefined),
        purpose: promo.metadata?.purpose || undefined,
        notes: promo.metadata?.notes || undefined,
      });
    } catch (err) {
      // 500 → Stripe retries; recordDiscountCode upserts, so a retry can't duplicate.
      console.error("[stripe-webhook] failed to record discount code:", err);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
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
        "payment_link",
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

    // A live purchase made with the in-prod test coupon gets flagged Test too, so it
    // doesn't pollute real-sales filters. (Abuse protection is the coupon's own Stripe
    // restrictions — this is just bookkeeping.)
    const testCode = env.STRIPE_TEST_99_CODE?.trim().toUpperCase();
    const isTestCoupon = !!testCode && couponCode?.toUpperCase() === testCode;

    // Optional "Discord" custom field on the Payment Link. Match by key OR label so
    // a future key/label tweak doesn't silently drop it.
    const discord = full.custom_fields?.find(
      (f) =>
        f.key === "discord" ||
        f.label?.custom?.toLowerCase().includes("discord"),
    )?.text?.value;

    // Optional "Preferred name" custom field — Link prefills the built-in name
    // field from the buyer's Link account without showing it, so this is the only
    // name a Link buyer is sure to have typed.
    const preferredName =
      full.custom_fields
        ?.find((f) => f.key === "preferred_name")
        ?.text?.value?.trim() || undefined;

    await recordPurchase({
      // Prefer the PaymentIntent id (the canonical payment) as the upsert key.
      id: paymentIntent?.id ?? full.id,
      // Derived from the same id as the upsert key, so retries can't churn it.
      ticketCode: ticketCode(paymentIntent?.id ?? full.id),
      customerName: full.customer_details?.name ?? undefined,
      preferredName,
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
      discordHandle: discord ?? undefined,
      status,
      paymentMethod: "stripe",
      // Flag Test if it's a sandbox checkout (livemode=false) OR used an in-prod test
      // coupon — either way it shouldn't count as a real sale.
      test: !event.livemode || isTestCoupon,
    });

    // Confirmation email once the money is settled (or none was owed): card
    // checkouts on `completed`, ACH on `async_payment_succeeded` — never for a
    // still-Pending session. Failures are soft: the purchase is already recorded,
    // so log + alert instead of a 500 (which would make Stripe retry the event).
    const email = full.customer_details?.email;
    const paymentLinkUrl = expanded<Stripe.PaymentLink>(full.payment_link)?.url;
    if (status === "Paid" && email) {
      try {
        await sendTicketConfirmationEmail({
          to: email,
          purchaserName:
            preferredName ?? full.customer_details?.name ?? undefined,
          tierLabel:
            tierLabelForPaymentLinkUrl(paymentLinkUrl) ??
            ticketType ??
            "Metagame 2026 ticket",
          eventDay: dayPassForPaymentLinkUrl(paymentLinkUrl)?.date,
          usdPaid:
            full.amount_total != null ? full.amount_total / 100 : undefined,
          usdFull:
            full.amount_subtotal != null
              ? full.amount_subtotal / 100
              : undefined,
          receiptUrl: charge?.receipt_url ?? undefined,
          discountCode: couponCode,
          ticketCode: ticketCode(paymentIntent?.id ?? full.id),
          test: !event.livemode || isTestCoupon,
        });
      } catch (err) {
        console.error("[stripe-webhook] confirmation email failed:", err);
        await sendAdminErrorEmail(
          `Ticket confirmation email failed for ${email} (session ${full.id}): ${err instanceof Error ? err.message : String(err)}`,
        ).catch((adminErr) =>
          console.error("[stripe-webhook] admin alert failed:", adminErr),
        );
      }
    }
  } catch (err) {
    // 500 → Stripe retries; recordPurchase upserts, so a retry can't duplicate.
    console.error("[stripe-webhook] failed to record purchase:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
