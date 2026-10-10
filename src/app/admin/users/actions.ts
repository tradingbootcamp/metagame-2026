"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { adminAccess, EXPIRED } from "@/lib/admin-auth";
import { getAuth } from "@/lib/auth";

export type Result = { error?: string };

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

// Role and ban changes go through Better Auth's admin plugin, which checks the
// caller's session itself, so only an admin *account* can make them; the
// password fallback can't. Changing your own row is refused so the last admin
// can't lock everyone out.
async function actor(userId: string): Promise<Result | null> {
  const access = await adminAccess();
  if (!access) return { error: EXPIRED };
  if (access.via !== "account") {
    return { error: "Sign in with an admin account to manage users." };
  }
  if (access.userId === userId) {
    return { error: "You can't change your own access." };
  }
  return null;
}

export async function setRole(
  userId: string,
  role: "user" | "admin",
): Promise<Result> {
  const refused = await actor(userId);
  if (refused) return refused;
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
  const refused = await actor(userId);
  if (refused) return refused;
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
