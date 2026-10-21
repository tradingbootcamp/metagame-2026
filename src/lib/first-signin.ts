import type { TicketRow } from "@/lib/ticket-store";

/** What the first sign-in modal's ticket step offers. */
export type TicketStep =
  | { kind: "held" }
  | {
      kind: "claimable";
      /** `purchasedAt` is an ISO timestamp. */
      tickets: { id: string; tier: string; purchasedAt: string }[];
    }
  | { kind: "code" };

export type FirstSigninPrefill = {
  preferredName: string;
  discordHandle: string;
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
    "paymentId" | "status" | "ownerUserId" | "purchaserEmail" | "createdAt"
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
    .map((t) => ({
      id: t.paymentId,
      tier: t.tier,
      purchasedAt: t.createdAt.toISOString(),
    }));
  return tickets.length > 0 ? { kind: "claimable", tickets } : { kind: "code" };
}

/**
 * Display-name prefill: the profile's, else the account's, else the name on the
 * newest ticket bought under this email (a family pack's attendee name).
 */
export function prefillName(
  profileName: string | null | undefined,
  accountName: string,
  rows: Pick<TicketRow, "purchaserEmail" | "purchaserName" | "createdAt">[],
  email: string,
): string {
  const fromTicket = rows
    .filter((t) => t.purchaserEmail === email && t.purchaserName?.trim())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return (
    profileName?.trim() ||
    accountName.trim() ||
    fromTicket?.purchaserName?.trim() ||
    ""
  );
}
