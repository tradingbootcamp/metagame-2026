import { reportError } from "@/lib/error-report";
import { releaseUpcomingSeats } from "@/lib/schedule-store";
import { hasClaimedTicket } from "@/lib/ticket-store";

/**
 * Frees the upcoming RSVP seats of someone who just lost this year's ticket,
 * unless another ticket still covers them. Admins can RSVP without a ticket, so
 * theirs stay. The ticket is already gone by now, so a failure is reported, not
 * thrown.
 */
export async function releaseSeatsWithoutTicket(
  user: { id: string; email: string; role?: string | null },
  source: string,
): Promise<void> {
  try {
    if (user.role === "admin" || (await hasClaimedTicket(user.id))) return;
    await releaseUpcomingSeats(user.id, user.email);
  } catch (error) {
    console.error("[tickets] releasing seats failed", user.id, error);
    await reportError({
      source,
      summary: "A ticket left its owner but their RSVP seats may still be held",
      details: { user: user.id },
      error,
      mention: false,
    });
  }
}
