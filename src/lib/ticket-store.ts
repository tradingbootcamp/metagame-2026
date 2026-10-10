import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { env } from "@/env";
import type { PurchaseRecord, PurchaseStatus } from "@/lib/airtable";
import { ticketCode } from "@/lib/ticket-code";

type Ticket = typeof schema.tickets.$inferInsert;

const STATUS: Record<PurchaseStatus, Ticket["status"]> = {
  Pending: "pending",
  Paid: "paid",
  Failed: "failed",
  Underpaid: "underpaid",
};

/** The ticket row a webhook purchase maps to. Never carries ownership. */
export function ticketFromPurchase(purchase: PurchaseRecord): Ticket {
  return {
    paymentId: purchase.id,
    ticketCode: purchase.ticketCode ?? ticketCode(purchase.id),
    source: purchase.paymentMethod === "btc" ? "opennode" : "stripe",
    status: STATUS[purchase.status],
    test: purchase.test,
    tier: purchase.ticketType ?? null,
    amountCents:
      purchase.amount != null ? Math.round(purchase.amount * 100) : null,
    purchaserEmail: purchase.customerEmail?.trim().toLowerCase() || null,
    purchaserName: purchase.preferredName ?? purchase.customerName ?? null,
  };
}

// Upsert on payment id, so a redelivered webhook walks the same row through
// pending → paid. Blank fields never clobber, and owner_user_id / claimed_at
// are left alone: a retry must never un-claim a ticket.
export async function recordTicket(purchase: PurchaseRecord): Promise<void> {
  if (!env.DATABASE_URL) {
    console.warn(`[tickets] DATABASE_URL not set — not stored: ${purchase.id}`);
    return;
  }
  const row = ticketFromPurchase(purchase);
  const { status, test, tier, amountCents, purchaserEmail, purchaserName } =
    row;
  const set = Object.fromEntries(
    Object.entries({
      status,
      test,
      tier,
      amountCents,
      purchaserEmail,
      purchaserName,
    }).filter(([, v]) => v != null),
  );
  await getDb()
    .insert(schema.tickets)
    .values(row)
    .onConflictDoUpdate({ target: schema.tickets.paymentId, set });
}

/** Flip a recorded ticket to failed; no row, no-op. Idempotent. */
export async function markTicketFailed(paymentId: string): Promise<void> {
  if (!env.DATABASE_URL) return;
  await getDb()
    .update(schema.tickets)
    .set({ status: "failed" })
    .where(eq(schema.tickets.paymentId, paymentId));
}
