import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { env } from "@/env";
import type { PurchaseRecord, PurchaseStatus } from "@/lib/airtable";
import { ticketCode } from "@/lib/ticket-code";

type Ticket = typeof schema.tickets.$inferInsert;
export type TicketRow = typeof schema.tickets.$inferSelect;

const { tickets } = schema;

// Sandbox purchases land in the same table; production never shows them.
const visible =
  process.env.VERCEL_ENV === "production" ? eq(tickets.test, false) : undefined;

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

/** Tickets the user owns, plus ones bought with their email. Newest first. */
export async function ticketsForUser(
  userId: string,
  email: string,
): Promise<TicketRow[]> {
  return getDb()
    .select()
    .from(tickets)
    .where(
      and(
        visible,
        or(
          eq(tickets.ownerUserId, userId),
          eq(tickets.purchaserEmail, email.trim().toLowerCase()),
        ),
      ),
    )
    .orderBy(desc(tickets.createdAt));
}

/** Typed codes: case, dashes and spaces don't matter; I/L read as 1, O as 0. */
export function normalizeTicketCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
}

export type ClaimResult =
  | { ok: true; ticket: TicketRow }
  | { ok: false; reason: "unknown" | "yours" | "taken" | "unpaid" };

// One conditional UPDATE, so two people entering the same code can't both win.
export async function claimTicket(
  userId: string,
  code: string,
): Promise<ClaimResult> {
  const db = getDb();
  const [ticket] = await db
    .update(tickets)
    .set({ ownerUserId: userId, claimedAt: new Date() })
    .where(
      and(
        visible,
        eq(tickets.ticketCode, code),
        isNull(tickets.ownerUserId),
        eq(tickets.status, "paid"),
      ),
    )
    .returning();
  if (ticket) return { ok: true, ticket };

  const [existing] = await db
    .select()
    .from(tickets)
    .where(and(visible, eq(tickets.ticketCode, code)))
    .limit(1);
  if (!existing) return { ok: false, reason: "unknown" };
  if (existing.ownerUserId === userId) return { ok: false, reason: "yours" };
  if (existing.ownerUserId) return { ok: false, reason: "taken" };
  return { ok: false, reason: "unpaid" };
}
