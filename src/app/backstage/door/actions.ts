"use server";

import { EXPIRED, requireAccess } from "@/lib/admin-auth";
import { doorLookup, type DoorResult } from "@/lib/door-lookup";

export async function lookUpTicket(query: unknown): Promise<DoorResult> {
  if (!(await requireAccess("checkin.view"))) return { error: EXPIRED };
  try {
    return await doorLookup(typeof query === "string" ? query : "");
  } catch (err) {
    console.error("[door] lookup failed", err);
    return { error: "The lookup failed. Try again." };
  }
}
