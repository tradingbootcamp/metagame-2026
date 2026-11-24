"use server";

import { revalidatePath } from "next/cache";
import { EXPIRED, requireAccess } from "@/lib/admin-auth";
import { unvoidTicket, voidTicket } from "@/lib/ticket-void";

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
    changed = await (voided ? voidTicket : unvoidTicket)(id, access.name);
  } catch (err) {
    console.error("[tickets] void failed", id, err);
    return { error: "That didn't save. Try again." };
  }
  revalidatePath("/backstage/tickets");
  return changed
    ? {}
    : { error: "Nothing changed: someone else got there first, or it's gone." };
}
