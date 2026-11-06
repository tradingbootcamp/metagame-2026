import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  like,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, schema } from "@/db";
import { CHECKIN_MIN_CHARS, parseCheckinQuery } from "@/lib/checkin";
import { accountName } from "@/lib/schedule-store";
import { emailKey } from "@/lib/ticket-holder";
import { visible, type TicketRow } from "@/lib/ticket-store";

const { tickets, user } = schema;

export const CHECKIN_SEARCH_LIMIT = 25;

export type CheckinAccount = { id: string; name: string; email: string };

/** Only paid tickets and ones still waiting on payment matter at the desk. */
const atDesk = and(visible, inArray(tickets.status, ["paid", "pending"]));

const pattern = (text: string) => `%${text.replace(/[\\%_]/g, "\\$&")}%`;

/**
 * Tickets matching what the volunteer typed, with the rest of any pack a hit
 * belongs to so the buyer's tickets sit together. Empty when the query is too
 * short to mean anything.
 */
export async function searchCheckinTickets(raw: string): Promise<TicketRow[]> {
  const { text, code, badge } = parseCheckinQuery(raw);
  if (text.length < CHECKIN_MIN_CHARS && badge === null) return [];
  const owner = alias(user, "owner");
  const holder = alias(user, "holder");
  const q = pattern(text);
  const matches: (SQL | undefined)[] = [
    ilike(tickets.purchaserName, q),
    ilike(tickets.purchaserEmail, q),
    ilike(owner.name, q),
    ilike(owner.email, q),
    ilike(holder.name, q),
    ilike(holder.email, q),
    code ? eq(tickets.ticketCode, code) : undefined,
    badge !== null ? eq(tickets.badgeCode, badge) : undefined,
  ];
  const db = getDb();
  const hits = await db
    .select({ ticket: tickets })
    .from(tickets)
    .leftJoin(owner, eq(owner.id, tickets.ownerUserId))
    .leftJoin(holder, eq(holder.id, tickets.holderUserId))
    .where(and(atDesk, or(...matches.filter((m) => m !== undefined))))
    .orderBy(
      asc(sql`lower(coalesce(${owner.name}, ${tickets.purchaserName}, ''))`),
      asc(tickets.paymentId),
    )
    .limit(CHECKIN_SEARCH_LIMIT);
  const rows = hits.map((h) => h.ticket);

  const packs = [
    ...new Set(
      rows
        .map((t) => /^(.+):ticket:\d+$/.exec(t.paymentId)?.[1])
        .filter((p) => p !== undefined),
    ),
  ];
  if (packs.length === 0) return rows;
  const seen = new Set(rows.map((t) => t.paymentId));
  const siblings = await db
    .select()
    .from(tickets)
    .where(
      and(
        atDesk,
        or(...packs.map((p) => like(tickets.paymentId, `${p}:ticket:%`))),
      ),
    )
    .orderBy(asc(tickets.paymentId));
  return [...rows, ...siblings.filter((t) => !seen.has(t.paymentId))];
}

/** Everyone these tickets name: owner, holder, who checked them in, and buyers by email. */
export async function checkinAccounts(rows: TicketRow[]): Promise<{
  byId: Map<string, CheckinAccount>;
  byEmail: Map<string, CheckinAccount>;
}> {
  const ids = [
    ...new Set(
      rows
        .flatMap((t) => [t.ownerUserId, t.holderUserId, t.checkedInBy])
        .filter((x) => x !== null),
    ),
  ];
  const emails = [
    ...new Set(rows.map((t) => t.purchaserEmail).filter((x) => x !== null)),
  ];
  const found =
    ids.length + emails.length === 0
      ? []
      : await getDb()
          .select({ id: user.id, name: accountName, email: user.email })
          .from(user)
          .where(
            or(
              ids.length ? inArray(user.id, ids) : undefined,
              emails.length
                ? inArray(sql`lower(${user.email})`, emails)
                : undefined,
            ),
          );
  return {
    byId: new Map(found.map((a) => [a.id, a])),
    byEmail: new Map(found.map((a) => [emailKey(a.email), a])),
  };
}

/** The header's tally over paid tickets. */
export async function checkinCounts(): Promise<{
  checkedIn: number;
  paid: number;
}> {
  const [row] = await getDb()
    .select({
      paid: count(),
      checkedIn: count(tickets.checkedInAt),
    })
    .from(tickets)
    .where(and(visible, eq(tickets.status, "paid")));
  return row ?? { checkedIn: 0, paid: 0 };
}

/** Accounts whose name or email contains the query, for claiming on someone's behalf. */
export async function searchCheckinAccounts(
  query: string,
  limit = 8,
): Promise<CheckinAccount[]> {
  const text = query.trim();
  if (text.length < CHECKIN_MIN_CHARS) return [];
  const q = pattern(text);
  return getDb()
    .select({ id: user.id, name: accountName, email: user.email })
    .from(user)
    .where(or(ilike(user.name, q), ilike(user.email, q)))
    .orderBy(asc(accountName))
    .limit(limit);
}

/** Who wears a badge number already, for the "taken" message. */
export async function badgeWearer(code: number): Promise<string | null> {
  const owner = alias(user, "owner");
  const [row] = await getDb()
    .select({
      name: sql<string>`coalesce(nullif(trim(${owner.name}), ''), ${owner.email}, ${tickets.purchaserName})`,
    })
    .from(tickets)
    .leftJoin(owner, eq(owner.id, tickets.ownerUserId))
    .where(and(visible, eq(tickets.badgeCode, code)))
    .limit(1);
  return row?.name ?? null;
}
