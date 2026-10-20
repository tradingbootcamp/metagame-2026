"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getDb, schema } from "@/db";
import { adminSession, getAuth } from "@/lib/auth";
import { ensureAccount } from "@/lib/schedule-store";

const PATH = "/admin/api-keys";
const { apikey, user } = schema;

export type CreateResult =
  | { key: string; error?: never }
  | { key?: never; error: string };
export type Result = { error?: string };

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

/**
 * Mints a key for the account with this email, making the account and
 * giving it the admin role first if needed: a key acts as its account, and
 * the API only admits admins. The key is returned once and never stored.
 */
export async function createKey(
  email: string,
  name: string,
  label: string,
): Promise<CreateResult> {
  const session = await adminSession();
  if (!session) return { error: "Sign in with an admin account to do that." };
  email = email.trim().toLowerCase();
  name = name.trim();
  label = label.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "That email doesn't look right." };
  if (!label) return { error: "Give the key a label." };

  try {
    const [existing] = await getDb()
      .select({ id: user.id, role: user.role, banned: user.banned })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (existing?.banned) return { error: "That account is banned." };
    if (!existing && !name) return { error: "A new account needs a name." };
    const userId = existing?.id ?? (await ensureAccount(name, email)).userId;
    if (existing?.role !== "admin") {
      // Through the admin plugin, so it's the caller's session that's checked.
      await getAuth().api.setRole({
        body: { userId, role: "admin" },
        headers: await headers(),
      });
    }
    // No headers: the server-only path, which takes a userId instead of
    // attributing the key to the caller.
    const { key } = await getAuth().api.createApiKey({
      body: { userId, name: label },
    });
    revalidatePath(PATH);
    return { key };
  } catch (err) {
    return { error: message(err) };
  }
}

/** Deletes the row; the plugin's own delete only reaches the caller's keys. */
export async function revokeKey(id: string): Promise<Result> {
  const session = await adminSession();
  if (!session) return { error: "Sign in with an admin account to do that." };
  try {
    await getDb().delete(apikey).where(eq(apikey.id, id));
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath(PATH);
  return {};
}
