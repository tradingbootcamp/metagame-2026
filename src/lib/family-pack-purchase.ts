import type Stripe from "stripe";
import {
  recordPurchase,
  type PurchaseRecord,
  type PurchaseStatus,
} from "@/lib/airtable";
import { sendTicketConfirmationEmail } from "@/lib/email";
import {
  FAMILY_PACK,
  attendeesFromMetadata,
  allocateCents,
} from "@/lib/family-pack";
import { capturePurchase } from "@/lib/posthog-server";
import { ticketCode } from "@/lib/ticket-code";
import { pickUtm } from "@/lib/utm";

export async function recordFamilyPack(
  session: Stripe.Checkout.Session,
  status: PurchaseStatus,
) {
  const attendees = attendeesFromMetadata(session.metadata);
  if (
    session.currency !== "usd" ||
    session.amount_total !== attendees.length * FAMILY_PACK.usd * 100 ||
    session.total_details?.amount_discount
  )
    throw new Error("Family pack payment does not match its admissions.");
  const intent =
    typeof session.payment_intent === "object" ? session.payment_intent : null;
  const charge =
    intent && typeof intent.latest_charge === "object"
      ? intent.latest_charge
      : null;
  const balance =
    charge && typeof charge.balance_transaction === "object"
      ? charge.balance_transaction
      : null;
  const paymentId = intent?.id ?? session.payment_intent ?? session.id;
  const tickets = attendees.map((attendee, index) => {
    const id = `${paymentId}:ticket:${index + 1}`;
    return { ...attendee, id, code: ticketCode(id) };
  });
  for (const [index, attendee] of tickets.entries()) {
    const purchase: PurchaseRecord = {
      id: attendee.id,
      ticketCode: attendee.code,
      customerName: attendee.name,
      customerEmail: attendee.email,
      billingName: session.customer_details?.name ?? undefined,
      billingEmail: session.customer_details?.email ?? undefined,
      amount: FAMILY_PACK.usd,
      fee: balance
        ? allocateCents(balance.fee, tickets.length, index) / 100
        : undefined,
      net: balance
        ? allocateCents(balance.net, tickets.length, index) / 100
        : undefined,
      ticketType: `${FAMILY_PACK.label} — Standard`,
      status,
      paymentMethod: "stripe",
      test: !session.livemode,
      receiptUrl: charge?.receipt_url ?? undefined,
      notes: `Group order ${paymentId}; admission ${index + 1} of ${tickets.length}. Buyer: ${session.customer_details?.email ?? "unknown"}.`,
      utm: pickUtm((key) => session.metadata?.[key]),
    };
    const result = await recordPurchase(purchase);
    if (!result.stored)
      throw new Error("Family pack admissions could not be stored.");
    await capturePurchase(purchase);
  }
  if (status === "Paid") {
    const email = session.customer_details?.email;
    if (!email) throw new Error("Family pack buyer email missing.");
    await sendTicketConfirmationEmail({
      to: email,
      purchaserName: session.customer_details?.name ?? undefined,
      tierLabel: `${FAMILY_PACK.label} (${tickets.length} weekend tickets)`,
      usdPaid: (session.amount_total ?? 0) / 100,
      receiptUrl: charge?.receipt_url ?? undefined,
      groupTickets: tickets,
      idempotencyKey: `family-pack/${paymentId}`,
      test: !session.livemode,
    });
  }
}
