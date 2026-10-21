"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { currentSession } from "@/lib/auth";
import type { RsvpStatus } from "@/lib/schedule";
import { cancelRsvp, rsvp, setBookmark } from "@/lib/schedule-store";

export type PlanResult = { error?: string; status?: RsvpStatus | null };

// Pages that show RSVPs or bookmarks.
const PATHS = ["/admin/schedule", "/account"];

/** The signed-in user, if they may act on this session. */
async function attendee(sessionId: string): Promise<string | PlanResult> {
  const session = await currentSession();
  const u = session?.user;
  if (!u) return { error: "Sign in first." };
  if (u.banned) return { error: "This account can't RSVP." };
  // Organizers can try drafts out; everyone else sees published sessions only.
  if (u.role !== "admin") {
    const [row] = await getDb()
      .select({ status: schema.sessions.status })
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sessionId))
      .limit(1);
    if (row?.status !== "published") return { error: "No such session." };
  }
  return u.id;
}

async function act(
  sessionId: string,
  run: (userId: string) => Promise<RsvpStatus | null | void>,
): Promise<PlanResult> {
  const who = await attendee(sessionId);
  if (typeof who !== "string") return who;
  try {
    const status = await run(who);
    for (const p of PATHS) revalidatePath(p);
    return status === undefined ? {} : { status };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** Going, or waitlisted when the session is full. */
export async function rsvpTo(sessionId: string): Promise<PlanResult> {
  return act(sessionId, (userId) => rsvp(sessionId, userId));
}

export async function unRsvp(sessionId: string): Promise<PlanResult> {
  return act(sessionId, async (userId) => {
    await cancelRsvp(sessionId, userId);
    return null;
  });
}

export async function bookmark(
  sessionId: string,
  on: boolean,
): Promise<PlanResult> {
  return act(sessionId, (userId) => setBookmark(sessionId, userId, on));
}
