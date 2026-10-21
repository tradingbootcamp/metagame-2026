import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { accountsConfigured, currentSession } from "@/lib/auth";
import { prefillDiscord } from "@/lib/discord-handle";
import {
  firstSigninNeeded,
  prefillName,
  ticketStep,
  type FirstSigninStatus,
} from "@/lib/first-signin";
import { emailKey, ticketLabel, ticketsForUser } from "@/lib/ticket-store";

export const dynamic = "force-dynamic";

/** Whether the signed-in account still owes the first sign-in questions; lets the static site open the modal. */
export async function GET() {
  const status = await firstSigninStatus().catch((e) => {
    console.error("[first-signin] status read failed", e);
    return { needed: false } as const;
  });
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}

async function firstSigninStatus(): Promise<FirstSigninStatus> {
  if (!accountsConfigured()) return { needed: false };
  const session = await currentSession();
  if (!session) return { needed: false };
  const { user } = session;
  const [profile] = await getDb()
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, user.id))
    .limit(1);
  if (!firstSigninNeeded(profile)) return { needed: false };
  const email = emailKey(user.email);
  const rows = (await ticketsForUser(user.id, email)).map((t) => ({
    ...t,
    tier: ticketLabel(t.tier),
  }));
  return {
    needed: true,
    tickets: ticketStep(rows, user.id, email),
    prefill: {
      preferredName: prefillName(
        profile?.preferredName,
        user.name,
        rows,
        email,
      ),
      discordHandle: prefillDiscord(profile?.discordHandle, rows, email),
      shareWithRecruiters: profile?.shareWithRecruiters ?? false,
    },
  };
}
