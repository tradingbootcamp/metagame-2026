import { and, count, desc, eq, isNull, lte, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { env } from "@/env";
import type { PurchaseRecord, PurchaseStatus } from "@/lib/airtable";
import { ticketCode } from "@/lib/ticket-code";

export { normalizeTicketCode } from "@/lib/ticket-code-format";

type Ticket = typeof schema.tickets.$inferInsert;
export type TicketRow = typeof schema.tickets.$inferSelect;

const { tickets, verification } = schema;

// Sandbox purchases land in the same table; production never shows them.
// NEXT_PUBLIC_ because deploys go out prebuilt (see src/lib/tickets.ts).
const visible =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? eq(tickets.test, false)
    : undefined;

/** How purchaser emails are stored and matched. */
export const emailKey = (email: string) => email.trim().toLowerCase();

export const ticketLabel = (tier: string | null) =>
  tier ?? "Metagame 2026 ticket";

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
    purchaserEmail: emailKey(purchase.customerEmail ?? "") || null,
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
          eq(tickets.purchaserEmail, emailKey(email)),
        ),
      ),
    )
    .orderBy(desc(tickets.createdAt));
}

export type ClaimResult =
  | { ok: true; ticket: TicketRow }
  | {
      ok: false;
      reason: "unknown" | "yours" | "taken" | "unpaid" | "void" | "limited";
    };

// Codes are short enough to guess by script, so failed claims are capped per
// account. Kept in Better Auth's verification table, like sentRecently().
const CLAIM_FAILURE_LIMIT = 25;
const CLAIM_FAILURE_WINDOW_MS = 60 * 60 * 1000;

export async function claimTicket(
  userId: string,
  code: string,
): Promise<ClaimResult> {
  const db = getDb();
  const identifier = `claim-failed:${userId}`;
  const now = new Date();
  await db
    .delete(verification)
    .where(
      and(
        eq(verification.identifier, identifier),
        lte(verification.expiresAt, now),
      ),
    );
  const [{ failures }] = await db
    .select({ failures: count() })
    .from(verification)
    .where(eq(verification.identifier, identifier));
  if (failures >= CLAIM_FAILURE_LIMIT) return { ok: false, reason: "limited" };

  const result = await attemptClaim(userId, code);
  if (!result.ok && result.reason !== "yours") {
    await db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier,
      value: code,
      expiresAt: new Date(now.getTime() + CLAIM_FAILURE_WINDOW_MS),
    });
  }
  return result;
}

// One conditional UPDATE, so two people entering the same code can't both win.
async function attemptClaim(
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
  return {
    ok: false,
    reason: existing.status === "pending" ? "unpaid" : "void",
  };
}
