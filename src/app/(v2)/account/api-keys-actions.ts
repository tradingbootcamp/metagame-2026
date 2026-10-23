"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { can } from "@/lib/access";
import { getAuth } from "@/lib/auth";

const PATH = "/account";
const { apikey } = schema;
const REFUSED = "Your account can't manage API keys.";

export type OwnKey = {
  id: string;
  label: string;
  start: string;
  enabled: boolean;
  createdAt: Date;
  lastRequest: Date | null;
};
export type CreateResult =
  | { key: string; error?: never }
  | { key?: never; error: string };
export type Result = { error?: string };

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

/** The viewer's own keys, newest first; empty without api_keys.self. */
export async function listOwnKeys(): Promise<OwnKey[]> {
  const session = await can("api_keys.self");
  if (!session) return [];
  const rows = await getDb()
    .select({
      id: apikey.id,
      label: apikey.name,
      start: apikey.start,
      enabled: apikey.enabled,
      createdAt: apikey.createdAt,
      lastRequest: apikey.lastRequest,
    })
    .from(apikey)
    .where(eq(apikey.referenceId, session.user.id))
    .orderBy(desc(apikey.createdAt));
  return rows.map((k) => ({
    ...k,
    label: k.label ?? "",
    start: k.start ?? "",
  }));
}

/** Mints a key for the viewer's own account. Returned once, never stored. */
export async function createOwnKey(label: string): Promise<CreateResult> {
  const session = await can("api_keys.self");
  if (!session) return { error: REFUSED };
  label = label.trim().slice(0, 80);
  if (!label) return { error: "Give the key a label." };
  try {
    // No headers: the server-only path, which takes a userId.
    const { key } = await getAuth().api.createApiKey({
      body: { userId: session.user.id, name: label },
    });
    revalidatePath(PATH);
    return { key };
  } catch (err) {
    return { error: message(err) };
  }
}

/** Deletes the row only when it belongs to the viewer. */
export async function revokeOwnKey(id: string): Promise<Result> {
  const session = await can("api_keys.self");
  if (!session) return { error: REFUSED };
  try {
    const deleted = await getDb()
      .delete(apikey)
      .where(and(eq(apikey.id, id), eq(apikey.referenceId, session.user.id)))
      .returning({ id: apikey.id });
    if (deleted.length === 0) return { error: "That key isn't yours." };
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath(PATH);
  return {};
}
