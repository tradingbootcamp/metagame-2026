import { and, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb, schema } from "@/db";
import { env } from "@/env";

const { tickets, ticketRefunds } = schema;

export const STRIPE_REFUND = "Stripe refund";

const record = (id: string) => eq(tickets.paymentId, id);

/** False when there's no such ticket or it's already voided. */
export async function voidTicket(id: string, by: string): Promise<boolean> {
  const rows = await getDb()
    .update(tickets)
    .set({ voided: true, voidedAt: new Date(), voidedBy: by })
    .where(and(record(id), eq(tickets.voided, false)))
    .returning({ id: tickets.paymentId });
  return rows.length > 0;
}

/** False when there's no such ticket or it isn't voided. */
export async function unvoidTicket(id: string, by: string): Promise<boolean> {
  const rows = await getDb()
    .update(tickets)
    .set({ voided: false, unvoidedAt: new Date(), unvoidedBy: by })
    .where(and(record(id), eq(tickets.voided, true)))
    .returning({ id: tickets.paymentId });
  return rows.length > 0;
}

/** A staff void already on the ticket keeps its who and when. */
function applyRefund(eventId: string, where: SQL | undefined) {
  return getDb()
    .update(tickets)
    .set({
      refundEventId: eventId,
      voided: true,
      voidedAt: sql`case when ${tickets.voided} then ${tickets.voidedAt} else now() end`,
      voidedBy: sql`case when ${tickets.voided} then ${tickets.voidedBy} else ${STRIPE_REFUND} end`,
    })
    .where(where)
    .returning({ id: tickets.paymentId });
}

/**
 * A full refund voids every ticket on the payment: pack tickets are
 * `<payment>:ticket:<n>`. Stripe sends this event for partial refunds too, with
 * `refunded` false until the whole charge is back. A redelivery of a refund
 * already applied does nothing, so it can't overrule staff undoing the void.
 *
 * The refund is written before tickets are read, and recordTicket writes the
 * ticket before reading refunds, so whichever order they race in, one sees the
 * other. Neon's HTTP driver has no transactions, so applied_at lets a retry
 * finish a delivery that failed halfway.
 */
export async function voidRefundedCharge(
  charge: Pick<Stripe.Charge, "id" | "refunded" | "payment_intent">,
  eventId: string,
): Promise<number> {
  if (!charge.refunded || !env.DATABASE_URL) return 0;
  const payment =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!payment) return 0;
  const db = getDb();
  const event = eq(ticketRefunds.stripeEventId, eventId);
  await db
    .insert(ticketRefunds)
    .values({ stripeEventId: eventId, paymentId: payment })
    .onConflictDoNothing();
  const [refund] = await db.select().from(ticketRefunds).where(event);
  if (refund.appliedAt) return 0;
  const rows = await applyRefund(
    eventId,
    and(
      or(
        record(payment),
        sql`starts_with(${tickets.paymentId}, ${`${payment}:ticket:`})`,
      ),
      sql`${tickets.refundEventId} is distinct from ${eventId}`,
    ),
  );
  await db.update(ticketRefunds).set({ appliedAt: new Date() }).where(event);
  if (rows.length === 0)
    console.warn(`[tickets] no ticket for refund of ${payment} yet`);
  return rows.length;
}

/** For a ticket just stored: voids it if its payment was already refunded. */
export async function applyEarlierRefund(paymentId: string): Promise<void> {
  const db = getDb();
  const [refund] = await db
    .select({ eventId: ticketRefunds.stripeEventId })
    .from(ticketRefunds)
    .where(eq(ticketRefunds.paymentId, paymentId.split(":ticket:")[0]))
    .orderBy(desc(ticketRefunds.createdAt))
    .limit(1);
  if (refund)
    await applyRefund(
      refund.eventId,
      and(record(paymentId), isNull(tickets.refundEventId)),
    );
}
