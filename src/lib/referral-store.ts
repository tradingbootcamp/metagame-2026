import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { canRefer, REFERRAL_CODE_LENGTH } from "@/lib/referral";
import { TICKET_CODE_LENGTH } from "@/lib/ticket-code-format";
import { randomCode, withFreshTicketCode } from "@/lib/ticket-code";
import { holdsTicket } from "@/lib/ticket-holder";
import { admitting, visible, type TicketRow } from "@/lib/ticket-store";

const { tickets } = schema;

/** Whether this viewer can hand out the ticket's referral code. */
function refers(t: TicketRow, userId: string, email: string): boolean {
  return (
    t.status === "paid" &&
    !t.voided &&
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
    const code = await withFreshTicketCode(
      async (code) => {
        const [row] = await db
          .update(tickets)
          .set({ referralCode: code })
          .where(
            and(
              eq(tickets.paymentId, t.paymentId),
              isNull(tickets.referralCode),
            ),
          )
          .returning({ referralCode: tickets.referralCode });
        if (row) return row.referralCode;
        const [existing] = await db
          .select({ referralCode: tickets.referralCode })
          .from(tickets)
          .where(eq(tickets.paymentId, t.paymentId))
          .limit(1);
        return existing?.referralCode ?? null;
      },
      () => randomCode(REFERRAL_CODE_LENGTH),
    );
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
      and(visible, inArray(tickets.referredByPaymentId, paymentIds), admitting),
    )
    .groupBy(tickets.referredByPaymentId);
  return new Map(rows.map((r) => [r.referrer!, r.n]));
}

/** The paid ticket behind a referral code, by payment id; null when there isn't one. */
export async function lookupReferrer(code: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ paymentId: tickets.paymentId })
    .from(tickets)
    .where(and(visible, eq(tickets.referralCode, code), admitting))
    .limit(1);
  return row?.paymentId ?? null;
}

/** How a referred buyer sees their referrer: the ticket's name, else its email. */
export async function referrerNames(
  paymentIds: string[],
): Promise<Map<string, string>> {
  if (paymentIds.length === 0) return new Map();
  const rows = await getDb()
    .select({
      id: tickets.paymentId,
      name: tickets.purchaserName,
      email: tickets.purchaserEmail,
    })
    .from(tickets)
    .where(and(visible, inArray(tickets.paymentId, paymentIds)));
  return new Map(
    rows.flatMap((r) =>
      r.name || r.email ? [[r.id, r.name || r.email!]] : [],
    ),
  );
}

export async function referrerName(paymentId: string): Promise<string | null> {
  return (await referrerNames([paymentId])).get(paymentId) ?? null;
}

/**
 * Who bought with whose code, for the admin table: the referrer's ticket code
 * for each paid referred ticket, and how many each ticket referred.
 */
export async function referralFacts(rows: TicketRow[]): Promise<{
  referredBy: Map<string, string>;
  referrals: Map<string, number>;
}> {
  const referred = rows.filter(
    (t) => t.status === "paid" && !t.voided && t.referredByPaymentId !== null,
  );
  const referrerIds = [...new Set(referred.map((t) => t.referredByPaymentId!))];
  const [codes, referrals] = await Promise.all([
    referrerIds.length === 0
      ? []
      : getDb()
          .select({
            paymentId: tickets.paymentId,
            ticketCode: tickets.ticketCode,
          })
          .from(tickets)
          .where(inArray(tickets.paymentId, referrerIds)),
    referralCounts(rows.map((t) => t.paymentId)),
  ]);
  const code = new Map(codes.map((r) => [r.paymentId, r.ticketCode]));
  const referredBy = new Map(
    referred.map((t) => [t.paymentId, code.get(t.referredByPaymentId!)!]),
  );
  return { referredBy, referrals };
}

export type ReferrerTicket = Pick<
  TicketRow,
  "paymentId" | "ticketCode" | "tier"
>;

/**
 * The paid ticket a normalized code names: a ticket code (6) or a referral
 * code (8). Null for anything else, including a code nobody holds.
 */
export async function findReferrerTicket(
  code: string,
): Promise<ReferrerTicket | null> {
  const by =
    code.length === TICKET_CODE_LENGTH
      ? eq(tickets.ticketCode, code)
      : code.length === REFERRAL_CODE_LENGTH
        ? eq(tickets.referralCode, code)
        : null;
  if (!by) return null;
  const [row] = await getDb()
    .select({
      paymentId: tickets.paymentId,
      ticketCode: tickets.ticketCode,
      tier: tickets.tier,
    })
    .from(tickets)
    .where(and(visible, by, admitting))
    .limit(1);
  return row ?? null;
}

/** Points a ticket at its referrer (null clears it); false when there's no such ticket. */
export async function setReferrer(
  paymentId: string,
  referrerPaymentId: string | null,
): Promise<boolean> {
  const rows = await getDb()
    .update(tickets)
    .set({ referredByPaymentId: referrerPaymentId })
    .where(and(visible, eq(tickets.paymentId, paymentId)))
    .returning({ paymentId: tickets.paymentId });
  return rows.length > 0;
}
