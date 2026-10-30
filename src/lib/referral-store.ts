import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { canRefer, REFERRAL_CODE_LENGTH } from "@/lib/referral";
import { randomCode, withFreshTicketCode } from "@/lib/ticket-code";
import { holdsTicket } from "@/lib/ticket-holder";
import type { TicketRow } from "@/lib/ticket-store";

const { tickets, user } = schema;

// Sandbox purchases land in the same table; production never shows them.
const visible =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? eq(tickets.test, false)
    : undefined;

const randomReferralCode = () => randomCode(REFERRAL_CODE_LENGTH);

/** Whether this viewer can hand out the ticket's referral code. */
function refers(t: TicketRow, userId: string, email: string): boolean {
  return (
    t.status === "paid" &&
    canRefer(t.tier) &&
    (t.ownerUserId === userId || holdsTicket(t, userId, email))
  );
}

/**
 * Mints referral codes for the viewer's tickets that lack one, in place.
 * Minted on first look rather than at purchase so existing rows need no
 * backfill. A code is only ever set once; a lost race keeps the winner's.
 */
export async function mintReferralCodes(
  rows: TicketRow[],
  userId: string,
  email: string,
): Promise<void> {
  const db = getDb();
  for (const t of rows) {
    if (t.referralCode !== null || !refers(t, userId, email)) continue;
    const code = await withFreshTicketCode(async (code) => {
      const [row] = await db
        .update(tickets)
        .set({ referralCode: code })
        .where(
          and(eq(tickets.paymentId, t.paymentId), isNull(tickets.referralCode)),
        )
        .returning({ referralCode: tickets.referralCode });
      if (row) return row.referralCode;
      const [existing] = await db
        .select({ referralCode: tickets.referralCode })
        .from(tickets)
        .where(eq(tickets.paymentId, t.paymentId))
        .limit(1);
      return existing?.referralCode ?? null;
    }, randomReferralCode);
    t.referralCode = code;
  }
}

/** How many tickets were bought with each of these tickets' codes. */
export async function referralCounts(
  paymentIds: string[],
): Promise<Map<string, number>> {
  if (paymentIds.length === 0) return new Map();
  const rows = await getDb()
    .select({ referrer: tickets.referredByPaymentId, n: count() })
    .from(tickets)
    .where(
      and(
        visible,
        inArray(tickets.referredByPaymentId, paymentIds),
        eq(tickets.status, "paid"),
      ),
    )
    .groupBy(tickets.referredByPaymentId);
  return new Map(rows.map((r) => [r.referrer!, r.n]));
}

export type Referrer = {
  paymentId: string;
  /** First name of whoever's on the ticket, for "Referred by Alex". */
  name: string | null;
};

/** The paid ticket behind a referral code; null when there isn't one. */
export async function lookupReferrer(code: string): Promise<Referrer | null> {
  const [row] = await getDb()
    .select({
      paymentId: tickets.paymentId,
      purchaserName: tickets.purchaserName,
      ownerName: user.name,
    })
    .from(tickets)
    .leftJoin(user, eq(user.id, tickets.ownerUserId))
    .where(
      and(visible, eq(tickets.referralCode, code), eq(tickets.status, "paid")),
    )
    .limit(1);
  if (!row) return null;
  const name = (row.ownerName || row.purchaserName || "")
    .trim()
    .split(/\s+/)[0];
  return { paymentId: row.paymentId, name: name || null };
}

/**
 * Who bought with whose code, for the admin table: each ticket's referrer
 * code and how many it referred. Rows outside `rows` show as "another ticket".
 */
export async function referralFacts(rows: TicketRow[]): Promise<{
  referredBy: Map<string, string | null>;
  referrals: Map<string, number>;
}> {
  const ids = rows.map((t) => t.paymentId);
  const codes = new Map(rows.map((t) => [t.paymentId, t.ticketCode]));
  const missing = [
    ...new Set(
      rows
        .map((t) => t.referredByPaymentId)
        .filter((id): id is string => id !== null && !codes.has(id)),
    ),
  ];
  if (missing.length > 0) {
    const found = await getDb()
      .select({ paymentId: tickets.paymentId, ticketCode: tickets.ticketCode })
      .from(tickets)
      .where(inArray(tickets.paymentId, missing));
    for (const t of found) codes.set(t.paymentId, t.ticketCode);
  }
  const referredBy = new Map(
    rows
      .filter((t) => t.referredByPaymentId !== null)
      .map((t) => [t.paymentId, codes.get(t.referredByPaymentId!) ?? null]),
  );
  return { referredBy, referrals: await referralCounts(ids) };
}
