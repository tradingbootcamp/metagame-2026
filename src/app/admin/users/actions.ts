"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { teamAccess } from "@/lib/access";
import { getAuth } from "@/lib/auth";

export type Result = { error?: string };

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

// Role and ban changes go through Better Auth's admin plugin, which only lets
// `user.role = 'admin'` accounts make them, so `users.manage` alone isn't
// enough here (roles and per-permission grants are on the profile page).
// Changing your own row is refused so the last admin can't lock everyone out.
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

/** Hard delete: sessions, accounts, and the profile cascade with the user. */
export async function removeUser(userId: string): Promise<Result> {
  const error = await refused(userId);
  if (error) return error;
  try {
    await getAuth().api.removeUser({
      body: { userId },
      headers: await headers(),
    });
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath("/admin/users");
  return {};
}
