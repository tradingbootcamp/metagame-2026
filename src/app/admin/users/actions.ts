"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getDb, schema } from "@/db";
import { teamAccess } from "@/lib/access";
import { getAuth } from "@/lib/auth";

export type Result = { error?: string };

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

// Role and ban changes go through Better Auth's admin plugin, which only lets
// `user.role = 'admin'` accounts make them (roles and per-permission grants
// are on the profile page). Changing your own row is refused so the last
// admin can't lock everyone out.
async function refused(userId: string): Promise<Result | null> {
  const access = await teamAccess();
  if (!access?.admin) return { error: "Only an admin account can do that." };
  if (access.session.user.id === userId) {
    return { error: "You can't change your own access." };
  }
  return null;
}

export async function setRole(
  userId: string,
  role: "user" | "admin",
): Promise<Result> {
  const error = await refused(userId);
  if (error) return error;
  try {
    await getAuth().api.setRole({
      body: { userId, role },
      headers: await headers(),
    });
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath("/admin/users");
  return {};
}

export async function setBanned(
  userId: string,
  banned: boolean,
): Promise<Result> {
  const error = await refused(userId);
  if (error) return error;
  const requestHeaders = await headers();
  try {
    if (banned) {
      await getAuth().api.banUser({
        body: { userId },
        headers: requestHeaders,
      });
    } else {
      await getAuth().api.unbanUser({
        body: { userId },
        headers: requestHeaders,
      });
    }
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath("/admin/users");
  return {};
}

/**
 * Hard delete: sessions, accounts, the profile, roles and grants cascade with
 * the user row. Straight from the table because Better Auth's removeUser is
 * admin-only and `users.delete` holders needn't be admins; deleting an admin
 * account still is.
 */
export async function removeUser(userId: string): Promise<Result> {
  const access = await teamAccess();
  if (!access?.permissions.has("users.delete"))
    return { error: "Sign in with an account that can delete users." };
  if (access.session.user.id === userId)
    return { error: "You can't delete your own account here." };
  try {
    const { user } = schema;
    const [target] = await getDb()
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!target) return { error: "That account is already gone." };
    if (target.role === "admin" && !access.admin)
      return { error: "Only an admin can delete an admin account." };
    await getDb().delete(user).where(eq(user.id, userId));
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath("/admin/users");
  return {};
}
