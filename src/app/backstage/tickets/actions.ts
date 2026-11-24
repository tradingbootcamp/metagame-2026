"use server";

import { revalidatePath } from "next/cache";
import { EXPIRED, requireAccess } from "@/lib/admin-auth";
import { releaseSeatsWithoutTicket } from "@/lib/seat-release";
import { EVENT_YEAR } from "@/lib/tickets";
import { unvoidTicket, voidTicket } from "@/lib/ticket-void";

const SAVE_FAILED = "That didn't save. Try again.";
const NOTHING_CHANGED =
  "Nothing changed: someone else got there first, or it's gone.";

/** Voids or un-voids. An error when nothing changed: a stale tab or unknown id. */
export async function setTicketVoided(
  id: unknown,
  voided: boolean,
): Promise<{ error?: string }> {
  const access = await requireAccess("tickets.void");
  if (!access) return { error: EXPIRED };
  if (typeof id !== "string" || !id) return { error: "No such ticket." };
  let changed: boolean;
  try {
    if (voided) {
      const result = await voidTicket(id, access.name);
      changed = result !== null;
      // Only this year's tickets seat anyone.
      if (result?.formerOwner && result.year === EVENT_YEAR)
        await releaseSeatsWithoutTicket(result.formerOwner, "Void ticket");
    } else {
      changed = await unvoidTicket(id, access.name);
    }
  } catch (err) {
    console.error("[tickets] void failed", id, err);
    return { error: SAVE_FAILED };
  }
  revalidatePath("/backstage/tickets");
  return changed ? {} : { error: NOTHING_CHANGED };
}
