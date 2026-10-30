import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { accountsConfigured, currentSession } from "@/lib/auth";
import { cleanDiscordHandle, prefillDiscord } from "@/lib/discord-handle";
import { emailKey, ticketsForUser } from "@/lib/ticket-store";
import type { Prefill } from "@/v2/forms/engine";

/**
 * What the signed-in account can fill in on a form: its name and email, the
 * profile's pronouns, and its Discord handle (or the one typed at checkout,
 * as on the account page). Undefined when nobody is signed in, or on a
 * deploy without accounts, so the page can still render statically there.
 */
export async function accountPrefill(): Promise<Prefill | undefined> {
  if (!accountsConfigured()) return undefined;
  const session = await currentSession();
  if (!session) return undefined;
  const { user } = session;
  const [[profile], tickets] = await Promise.all([
    getDb()
      .select({
        pronouns: schema.profiles.pronouns,
        discordHandle: schema.profiles.discordHandle,
      })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, user.id))
      .limit(1),
    ticketsForUser(user.id, emailKey(user.email)),
  ]);
  return {
    name: user.name,
    email: user.email,
    discord: cleanDiscordHandle(
      prefillDiscord(profile?.discordHandle, tickets, user.email),
    ),
    pronouns: profile?.pronouns ?? undefined,
  };
}
