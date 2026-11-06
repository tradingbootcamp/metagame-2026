import { and, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";
import { getDb, schema } from "@/db";
import {
  TICKET_CODE_LENGTH,
  normalizeTicketCode,
} from "@/lib/ticket-code-format";
import { ticketState, type TicketState } from "@/lib/ticket-holder";
import { visible } from "@/lib/ticket-store";

const { tickets, user } = schema;

export const DOOR_MIN_QUERY = 3;
const DOOR_MAX_QUERY = 200;
// Above a family pack's six, so one buyer's tickets aren't cut off.
export const DOOR_RESULT_CAP = 8;

export type Admission = {
  kind: "full" | "day" | "booth" | "unknown";
  label: string;
};

/**
 * Only what admitting someone needs. No code (it would let staff claim the
 * ticket), no payment id, no email.
 */
export type DoorTicket = {
  state: TicketState;
  valid: boolean;
  admits: Admission;
  /** Null when the account has no name; never falls back to the email. */
  holder: string | null;
  claimed: boolean;
};

export type DoorResult =
  | { error: string }
  | { tickets: DoorTicket[]; more: boolean };

const DAYS: Record<string, string> = {
  friday: "Friday, Nov 6 only",
  saturday: "Saturday, Nov 7 only",
  sunday: "Sunday, Nov 8 only",
};

const FULL_PASS =
  /^(standard|supporter|guest of honor|metagame 2026( -+ (supporter|guest of honor))?|family & friends pack\b.*)$/i;

/**
 * Stored tiers are labels or, on older rows, Stripe product names. Anything
 * unrecognized says so rather than passing as a weekend ticket.
 */
export function admissionFor(tier: string | null): Admission {
  const name = tier?.trim() ?? "";
  if (/night market|booth/i.test(name))
    return { kind: "booth", label: "Night Market booth only, Friday night" };
  const day = /\b(friday|saturday|sunday)\b/i.exec(name)?.[1].toLowerCase();
  if (day) return { kind: "day", label: DAYS[day] };
  if (FULL_PASS.test(name)) return { kind: "full", label: "Full weekend pass" };
  return {
    kind: "unknown",
    label: name ? `Check with a lead: ${name}` : "Check with a lead: no tier",
  };
}

/** Collapses spacing; null when the search is too short or long to be exact. */
export function doorQuery(input: string): string | null {
  const q = input.trim().replace(/\s+/g, " ");
  return q.length < DOOR_MIN_QUERY || q.length > DOOR_MAX_QUERY ? null : q;
}

/**
 * Exact matches only. A person matches the ticket that would admit them, so
 * once a ticket is claimed or passed on its buyer no longer finds it, and
 * nothing here can enumerate buyers: no LIKE, no empty search, and a cap.
 */
export async function doorLookup(query: string): Promise<DoorResult> {
  const q = doorQuery(query);
  if (!q) return { error: "Enter a full ticket code, email or name." };

  const owner = alias(user, "door_owner");
  const holder = alias(user, "door_holder");
  const same = (col: AnyPgColumn) =>
    sql`lower(btrim(regexp_replace(${col}, '[[:space:]]+', ' ', 'g'))) = lower(${q})`;
  const person = (email: AnyPgColumn, name: AnyPgColumn) =>
    or(same(email), same(name));
  const code = normalizeTicketCode(q);

  const rows = await getDb()
    .select({
      status: tickets.status,
      voided: tickets.voided,
      tier: tickets.tier,
      purchaserName: tickets.purchaserName,
      ownerUserId: tickets.ownerUserId,
      holderUserId: tickets.holderUserId,
      ownerName: owner.name,
      holderName: holder.name,
    })
    .from(tickets)
    .leftJoin(owner, eq(owner.id, tickets.ownerUserId))
    .leftJoin(holder, eq(holder.id, tickets.holderUserId))
    .where(
      and(
        visible,
        or(
          code.length === TICKET_CODE_LENGTH
            ? eq(tickets.ticketCode, code)
            : undefined,
          and(isNotNull(tickets.ownerUserId), person(owner.email, owner.name)),
          and(
            isNull(tickets.ownerUserId),
            isNotNull(tickets.holderUserId),
            person(holder.email, holder.name),
          ),
          and(
            isNull(tickets.ownerUserId),
            isNull(tickets.holderUserId),
            person(tickets.purchaserEmail, tickets.purchaserName),
          ),
        ),
      ),
    )
    .orderBy(
      sql`case when ${tickets.status} = 'paid' and not ${tickets.voided} then 0 else 1 end`,
      desc(tickets.createdAt),
    )
    .limit(DOOR_RESULT_CAP + 1);

  return {
    more: rows.length > DOOR_RESULT_CAP,
    tickets: rows.slice(0, DOOR_RESULT_CAP).map((t) => {
      const state = ticketState(t);
      const name = t.ownerUserId
        ? t.ownerName
        : t.holderUserId
          ? t.holderName
          : t.purchaserName;
      return {
        state,
        valid: state === "paid",
        admits: admissionFor(t.tier),
        holder: name?.trim() || null,
        claimed: t.ownerUserId !== null,
      };
    }),
  };
}
