import type { CheckinState } from "@/lib/checkin";

export type DeskAccount = { id: string; name: string; email: string };

/** What a card shows; never the claim code. */
export type DeskTicket = {
  paymentId: string;
  name: string;
  purchaserEmail: string | null;
  tier: string;
  badge: string | null;
  state: CheckinState;
  checkedIn: { at: string; by: string } | null;
  /** The account the purchaser email belongs to, offered first when claiming. */
  suggested: DeskAccount | null;
};
