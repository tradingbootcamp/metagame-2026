import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { withFreshTicketCode } from "@/lib/ticket-code";
import { mirrorTicketCode } from "@/lib/ticket-store";

const { tickets, user } = schema;

const record = (id: string) => eq(tickets.paymentId, id);

export type VoidResult = {
  year: number;
  /** Who had claimed it, now its holder; null when it was unclaimed. */
  formerOwner: { id: string; email: string; role: string | null } | null;
};

/**
 * Voids the ticket and, like an unclaim, hands a claimed one back to its owner
 * to hold under a fresh code, so un-voiding never revives a code someone else
 * still knows. Its badge and any check-in go too: it admits nobody now. Null
 * when there's no such ticket, it's already voided, or its owner changed
 * meanwhile.
 */
export async function voidTicket(
  id: string,
  by: string,
): Promise<VoidResult | null> {
  const db = getDb();
  const [before] = await db
    .select({
      ownerId: tickets.ownerUserId,
      email: user.email,
      role: user.role,
    })
    .from(tickets)
    .leftJoin(user, eq(user.id, tickets.ownerUserId))
    .where(and(record(id), eq(tickets.voided, false)))
    .limit(1);
  if (!before) return null;
  const voided = { voided: true, voidedAt: new Date(), voidedBy: by };
  const { ownerId, email } = before;

  if (ownerId === null || email === null) {
    const [row] = await db
      .update(tickets)
      .set(voided)
      .where(
        and(record(id), eq(tickets.voided, false), isNull(tickets.ownerUserId)),
      )
      .returning({ year: tickets.year });
    return row ? { year: row.year, formerOwner: null } : null;
  }

  const row = await withFreshTicketCode(async (code) => {
    const [r] = await db
      .update(tickets)
      .set({
        ...voided,
        ownerUserId: null,
        claimedAt: null,
        claimedBy: null,
        holderUserId: ownerId,
        ticketCode: code,
        badgeCode: null,
        checkedInAt: null,
        checkedInBy: null,
      })
      .where(
        and(
          record(id),
          eq(tickets.voided, false),
          eq(tickets.ownerUserId, ownerId),
        ),
      )
      .returning();
    return r ?? null;
  });
  if (!row) return null;
  await mirrorTicketCode(row, "a void");
  return {
    year: row.year,
    formerOwner: { id: ownerId, email, role: before.role ?? null },
  };
}

/** Leaves it unclaimed with its holder. False when there's no such ticket or it isn't voided. */
export async function unvoidTicket(id: string, by: string): Promise<boolean> {
  const rows = await getDb()
    .update(tickets)
    .set({ voided: false, unvoidedAt: new Date(), unvoidedBy: by })
    .where(and(record(id), eq(tickets.voided, true)))
    .returning({ id: tickets.paymentId });
  return rows.length > 0;
}
