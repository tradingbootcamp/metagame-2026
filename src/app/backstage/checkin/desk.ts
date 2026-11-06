import type { CheckinAccount, CheckinState } from "@/lib/checkin";

/** What a card shows; never the claim code. */
export type DeskTicket = {
  paymentId: string;
  name: string;
  purchaserEmail: string | null;
  tier: string;
  badge: number | null;
  state: CheckinState;
  checkedIn: { at: string; by: string } | null;
  /** The account to offer first when claiming: the holder's, else the buyer's. */
  suggested: CheckinAccount | null;
};
