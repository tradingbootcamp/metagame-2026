"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/access";
import { setUserGrant, setUserRole } from "@/lib/permission-store";
import { isPermission } from "@/lib/permissions";

export type Result = { error?: string };

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

// Your own access is off limits so a users.edit holder can't lock
// themselves out (an admin can always put it back).
async function run(userId: string, work: () => Promise<void>): Promise<Result> {
  const session = await can("users.edit");
  if (!session) return { error: "Sign in with an account that edits users." };
  if (session.user.id === userId)
    return { error: "You can't change your own access." };
  try {
    await work();
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return {};
}

export async function assignRole(
  userId: string,
  roleId: string,
  assigned: boolean,
): Promise<Result> {
  return run(userId, () => setUserRole(userId, roleId, assigned));
}

export async function setGrant(
  userId: string,
  permission: string,
  granted: boolean,
): Promise<Result> {
  if (!isPermission(permission)) return { error: "Unknown permission." };
  return run(userId, () => setUserGrant(userId, permission, granted));
}
