import type { TicketRow } from "@/lib/ticket-store";

/** What the first sign-in modal's ticket step offers. */
export type TicketStep =
  | { kind: "held" }
  | { kind: "claimable"; tickets: { id: string; tier: string }[] }
  | { kind: "code" };

export type FirstSigninPrefill = {
  preferredName: string;
  discordHandle: string;
  isPublic: boolean;
  shareWithRecruiters: boolean;
};

export type FirstSigninStatus =
  | { needed: false }
  | { needed: true; tickets: TicketStep; prefill: FirstSigninPrefill };

/** Open until every required answer is stored; a missing profile counts as unanswered. */
export function firstSigninNeeded(
  profile:
    | { isAdult: boolean | null; bringingChildren: boolean | null }
    | undefined,
): boolean {
  return profile?.isAdult == null || profile.bringingChildren == null;
}

/**
 * The profile's own handle, else one typed at checkout. Prefers tickets bought
 * under the user's email, since a ticket someone else bought for them carries
 * the buyer's handle.
 */
export function discordPrefill(
  profileHandle: string | null | undefined,
  rows: Pick<TicketRow, "purchaserEmail" | "purchaserDiscord">[],
  email: string,
): string {
  if (profileHandle?.trim()) return profileHandle;
  const own = rows.find(
    (t) => t.purchaserEmail === email && t.purchaserDiscord,
  );
  return own?.purchaserDiscord ?? "";
}

const HIDDEN_PREFIXES = ["/login", "/admin", "/grade"];

/** Pages the modal stays off: signing in, and the team tools. */
export function firstSigninHidden(pathname: string): boolean {
  return HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Same rules as the account page's tickets tab: a held ticket ends the step;
 * otherwise paid, unclaimed tickets this email bought get a Claim button;
 * otherwise the code entry.
 */
export function ticketStep(
  rows: (Pick<
    TicketRow,
    "paymentId" | "status" | "ownerUserId" | "purchaserEmail"
  > & { tier: string })[],
  userId: string,
  email: string,
): TicketStep {
  if (rows.some((t) => t.ownerUserId === userId)) return { kind: "held" };
  const tickets = rows
    .filter(
      (t) =>
        t.status === "paid" &&
        t.ownerUserId === null &&
        t.purchaserEmail === email,
    )
    .map((t) => ({ id: t.paymentId, tier: t.tier }));
  return tickets.length > 0 ? { kind: "claimable", tickets } : { kind: "code" };
}
