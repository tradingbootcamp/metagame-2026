"use server";

import { revalidatePath } from "next/cache";
import { endAccess } from "@/lib/admin-auth";

export async function signOut(): Promise<void> {
  await endAccess();
  // One session covers every tool under /backstage, so revalidate the subtree.
  revalidatePath("/backstage", "layout");
}
