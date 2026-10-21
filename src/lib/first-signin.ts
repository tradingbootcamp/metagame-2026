import type { TicketRow } from "@/lib/ticket-store";

/** What the first sign-in modal's ticket step offers. */
export type TicketStep =
  | { kind: "held" }
  | { kind: "claimable"; tickets: { id: string; tier: string }[] }
  | { kind: "code" };

export type FirstSigninStatus =
  | { needed: false }
  | { needed: true; tickets: TicketStep };

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
