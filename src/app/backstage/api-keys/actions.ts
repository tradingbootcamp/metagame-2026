"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { can, teamAccess } from "@/lib/access";
import { getAuth } from "@/lib/auth";
import { ensureAccount } from "@/lib/schedule-store";

const PATH = "/backstage/api-keys";
const { apikey, user } = schema;

export type CreateResult =
  | { key: string; error?: never }
  | { key?: never; error: string };
export type Result = { error?: string };

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

/**
 * Mints a key for the account with this email, making the account if needed.
 * A key acts as its account, so it only reaches a route once the account
 * holds that route's permission. The key is returned once and never stored.
 */
export async function createKey(
  email: string,
  name: string,
  label: string,
): Promise<CreateResult> {
  if (!(await can("api_keys.manage")))
    return { error: "Sign in with an account that manages API keys." };
  email = email.trim().toLowerCase();
  name = name.trim();
  label = label.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "That email doesn't look right." };
  if (!label) return { error: "Give the key a label." };

  try {
    const [existing] = await getDb()
      .select({ id: user.id, banned: user.banned, role: user.role })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (existing?.banned) return { error: "That account is banned." };
    // A key acts as its account, so minting one for an admin is admin-only.
    if (existing?.role === "admin" && !(await teamAccess())?.admin)
      return { error: "Only an admin can make a key for an admin account." };
    if (!existing && !name) return { error: "A new account needs a name." };
    const userId = existing?.id ?? (await ensureAccount(name, email)).userId;
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

/** Whether an account exists for this email, and its name, for the form. */
export async function lookupAccount(
  email: string,
): Promise<{ exists: boolean; name?: string }> {
  if (!(await can("api_keys.manage"))) return { exists: false };
  const [existing] = await getDb()
    .select({ name: user.name })
    .from(user)
    .where(eq(user.email, email.trim().toLowerCase()))
    .limit(1);
  return existing ? { exists: true, name: existing.name } : { exists: false };
}

/**
 * Deletes the row; the plugin's own delete only reaches the caller's keys.
 * As with minting, an admin's key is admin-only.
 */
export async function revokeKey(id: string): Promise<Result> {
  const viewer = await teamAccess();
  if (!viewer?.permissions.has("api_keys.manage"))
    return { error: "Sign in with an account that manages API keys." };
  try {
    const [owner] = await getDb()
      .select({ role: user.role })
      .from(apikey)
      .innerJoin(user, eq(user.id, apikey.referenceId))
      .where(eq(apikey.id, id))
      .limit(1);
    if (owner?.role === "admin" && !viewer.admin)
      return { error: "Only an admin can revoke an admin's key." };
    await getDb().delete(apikey).where(eq(apikey.id, id));
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath(PATH);
  return {};
}
