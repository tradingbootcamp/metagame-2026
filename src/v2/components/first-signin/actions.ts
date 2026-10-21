"use server";

import { getDb, schema } from "@/db";
import { currentSession } from "@/lib/auth";

export async function saveIsAdult(
  isAdult: boolean,
): Promise<{ error?: string }> {
  const session = await currentSession();
  if (!session) return { error: "You've been signed out. Sign in again." };
  const { profiles } = schema;
  await getDb()
    .insert(profiles)
    .values({ userId: session.user.id, isAdult })
    .onConflictDoUpdate({ target: profiles.userId, set: { isAdult } });
  return {};
}
