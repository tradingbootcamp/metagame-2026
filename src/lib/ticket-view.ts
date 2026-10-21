import { formatTicketCode } from "@/lib/ticket-code-format";
import {
  emailKey,
  holdsTicket,
  ticketLabel,
  type TicketRow,
} from "@/lib/ticket-store";

export type TicketView = {
  id: string;
  tier: string;
  status: TicketRow["status"];
  test: boolean;
  /** Claimed by the signed-in user. */
  mine: boolean;
  claimed: boolean;
  /** Set while the signed-in user holds it unclaimed; a claimed code is dead. */
  code: string | null;
  /** Bought by the signed-in user, now held by someone else. */
  transferred: boolean;
};

export function ticketView(
  t: TicketRow,
  userId: string,
  email: string,
): TicketView {
  const holds = holdsTicket(t, userId, email);
  const claimed = t.ownerUserId !== null;
  const mine = t.ownerUserId === userId;
  return {
    id: t.paymentId,
    tier: ticketLabel(t.tier),
    status: t.status,
    test: t.test,
    mine,
    claimed,
    code: holds && !claimed ? formatTicketCode(t.ticketCode) : null,
    transferred: !holds && !mine && t.purchaserEmail === emailKey(email),
  };
}
