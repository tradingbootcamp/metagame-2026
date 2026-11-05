// Client-safe half of ticket-store.ts, which holds the matching SQL (heldBy).

/** What a ticket can do now: its payment status, unless it has been voided. */
export type TicketState =
  | "pending"
  | "paid"
  | "failed"
  | "underpaid"
  | "voided";

export const ticketState = (t: {
  status: Exclude<TicketState, "voided">;
  voided: boolean;
}): TicketState => (t.voided ? "voided" : t.status);

/** How purchaser emails are stored and matched. */
export const emailKey = (email: string) => email.trim().toLowerCase();

/**
 * Whoever holds a ticket has its code to share, claim or pass on: the
 * holder_user_id, or the buyer while that's null.
 */
export function holdsTicket(
  t: { holderUserId: string | null; purchaserEmail: string | null },
  userId: string,
  email: string,
): boolean {
  return t.holderUserId === null
    ? t.purchaserEmail === emailKey(email)
    : t.holderUserId === userId;
}

/**
 * Account names are self-set, so two matches can't be told apart by name.
 * Compares names the way the door lookup matches them.
 */
export function sharesAName(tickets: { holder: string | null }[]): boolean {
  const names = tickets.map((t) =>
    t.holder?.trim().replace(/\s+/g, " ").toLowerCase(),
  );
  return new Set(names).size < names.length;
}
