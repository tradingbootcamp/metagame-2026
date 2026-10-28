"use server";

import { redirect } from "next/navigation";
import { endAccess } from "@/lib/admin-auth";
import { safeNextPath } from "@/lib/next-path";

// Redirect rather than re-render: the action's own request still carries the
// session cookie, so a re-render would read as signed in (and then, with the
// DB session gone, as "no access"). The fresh GET sees the cleared cookie.
export async function signOut(formData: FormData): Promise<void> {
  await endAccess();
  redirect(safeNextPath(formData.get("next"), "/backstage"));
}
