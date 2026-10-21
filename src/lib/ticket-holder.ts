// Client-safe half of ticket-store.ts, which holds the matching SQL (heldBy).

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
